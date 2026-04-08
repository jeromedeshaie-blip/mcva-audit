// src/lib/scoring-engine.ts
// Moteur de scoring Score GEO™ v2 — Uses LLM-as-judge from src/lib/judge.ts
// 4 composantes : Présence (0-25) + Exactitude (0-25) + Sentiment (0-25) + Recommandation (0-25)

import type { LLMResponse } from "./llm-providers";
import { judgeResponse, type JudgeVerdict } from "./judge";

export interface ResponseScore {
  // Identifiants
  provider: string;
  model: string;
  query: string;
  response: string;

  // Judge-based scores
  isBrandMentioned: boolean;
  brandMentionConfidence: number;
  isRecommended: boolean;
  recommendationStrength: "explicit" | "implicit" | "none";
  isFactuallyAccurate: boolean | null;
  factualClaims: JudgeVerdict["factualClaims"];
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1.0 à 1.0
  citationSources: string[];
  competitorMentions: string[];
  judgeReasoning: string;

  // Méta
  tokensUsed: number;
  latencyMs: number;
  costUsd: number;
}

export interface RunScore {
  scoreGeo: number; // 0-100 = sum of 4 components (single source of truth)
  scorePresence: number; // 0-25
  scoreExactitude: number; // 0-25
  scoreSentiment: number; // 0-25
  scoreRecommendation: number; // 0-25
  totalResponses: number;
  llmsAvailable: number; // LW-003: how many LLMs actually responded
  llmsMonitored: number; // LW-003: how many LLMs were queried
  responseScores: ResponseScore[];
}

// ============================================================
// SCORING D'UNE RÉPONSE (async — calls LLM-as-judge)
// ============================================================

export async function scoreResponse(
  llmResponse: LLMResponse,
  brandName: string,
  brandAliases: string[],
  competitors: string[],
  knownFacts: Record<string, string> | undefined,
  language: "fr" | "de" | "en"
): Promise<ResponseScore> {
  const verdict = await judgeResponse({
    response: llmResponse.response,
    brandName,
    brandAliases,
    competitors,
    knownFacts,
    language,
  });

  // Compute factual accuracy from claims
  const verifiableClaims = verdict.factualClaims.filter(
    (c) => c.verdict !== "unverifiable"
  );
  let isFactuallyAccurate: boolean | null = null;
  if (verifiableClaims.length > 0) {
    const correctRatio =
      verifiableClaims.filter((c) => c.verdict === "correct").length /
      verifiableClaims.length;
    isFactuallyAccurate = correctRatio >= 0.75;
  }

  return {
    provider: llmResponse.provider,
    model: llmResponse.model,
    query: llmResponse.query,
    response: llmResponse.response,
    isBrandMentioned: verdict.isBrandMentioned,
    brandMentionConfidence: verdict.brandMentionConfidence,
    isRecommended: verdict.isRecommended,
    recommendationStrength: verdict.recommendationStrength,
    isFactuallyAccurate,
    factualClaims: verdict.factualClaims,
    sentiment: verdict.sentiment,
    sentimentScore: verdict.sentimentScore,
    citationSources: verdict.citationUrls,
    competitorMentions: verdict.competitorMentions,
    judgeReasoning: verdict.reasoningNotes,
    tokensUsed: llmResponse.tokensUsed,
    latencyMs: llmResponse.latencyMs,
    costUsd: llmResponse.costUsd,
  };
}

// ============================================================
// SCORING GLOBAL D'UN RUN (agrégation)
// ============================================================

/**
 * LW-001: Single source of truth — scoreGeo = sum(4 components).
 * LW-003: Track available vs monitored LLMs explicitly.
 */
export function computeRunScore(responseScores: ResponseScore[]): RunScore {
  const allLlms = new Set(responseScores.map((r) => r.provider));
  const MONITORED_LLMS = 4; // openai, anthropic, perplexity, gemini

  const total = responseScores.length;
  if (total === 0) {
    return {
      scoreGeo: 0,
      scorePresence: 0,
      scoreExactitude: 0,
      scoreSentiment: 0,
      scoreRecommendation: 0,
      totalResponses: 0,
      llmsAvailable: 0,
      llmsMonitored: MONITORED_LLMS,
      responseScores: [],
    };
  }

  // --- Présence (0-25): Mention Rate × 25 ---
  const mentionRate =
    responseScores.filter((r) => r.isBrandMentioned).length / total;
  const scorePresence = Math.round(mentionRate * 25 * 100) / 100;

  // --- Exactitude (0-25): based on verifiable claims ---
  const mentioned = responseScores.filter((r) => r.isBrandMentioned);
  const checked = mentioned.filter((r) => r.isFactuallyAccurate !== null);
  let scoreExactitude: number;
  if (checked.length === 0) {
    // Fallback: use brandMentionConfidence as proxy
    const avgConfidence =
      mentioned.length > 0
        ? mentioned.reduce((s, r) => s + r.brandMentionConfidence, 0) /
          mentioned.length
        : 0;
    scoreExactitude = Math.round(avgConfidence * 25 * 100) / 100;
  } else {
    const accuracyRate =
      checked.filter((r) => r.isFactuallyAccurate).length / checked.length;
    scoreExactitude = Math.round(accuracyRate * 25 * 100) / 100;
  }

  // --- Sentiment (0-25): average -1..+1 mapped to 0..25 ---
  const avgSentiment =
    responseScores.reduce((s, r) => s + r.sentimentScore, 0) / total;
  const scoreSentiment =
    Math.round(((avgSentiment + 1) / 2) * 25 * 100) / 100;

  // --- Recommandation (0-25): explicit counts more than implicit ---
  const recoScore =
    responseScores.reduce((s, r) => {
      if (r.recommendationStrength === "explicit") return s + 1;
      if (r.recommendationStrength === "implicit") return s + 0.5;
      return s;
    }, 0) / total;
  const scoreRecommendation = Math.round(recoScore * 25 * 100) / 100;

  // --- Score GEO™ global = SOMME des 4 composantes ---
  const scoreGeo =
    Math.round(
      (scorePresence + scoreExactitude + scoreSentiment + scoreRecommendation) *
        100
    ) / 100;

  return {
    scoreGeo,
    scorePresence,
    scoreExactitude,
    scoreSentiment,
    scoreRecommendation,
    totalResponses: total,
    llmsAvailable: allLlms.size,
    llmsMonitored: MONITORED_LLMS,
    responseScores,
  };
}

// ============================================================
// CLASSIFICATION Score GEO™
// ============================================================

export type GeoTier = "invisible" | "emergent" | "visible" | "leader";

export function getGeoTier(score: number): GeoTier {
  if (score <= 25) return "invisible";
  if (score <= 50) return "emergent";
  if (score <= 75) return "visible";
  return "leader";
}

export function getGeoTierLabel(tier: GeoTier): string {
  const labels: Record<GeoTier, string> = {
    invisible: "Invisible (0-25)",
    emergent: "Émergent (26-50)",
    visible: "Visible (51-75)",
    leader: "Leader (76-100)",
  };
  return labels[tier];
}
