// src/lib/scoring-engine.ts
// Moteur de scoring Score GEO™ propriétaire MCVA
// 4 composantes : Présence (0-25) + Exactitude (0-25) + Sentiment (0-25) + Recommandation (0-25)

import type { LLMResponse } from "./llm-providers";

export interface ResponseScore {
  // Identifiants
  provider: string;
  model: string;
  query: string;
  response: string;

  // Scores composantes
  isBrandMentioned: boolean;
  isRecommended: boolean;
  isFactuallyAccurate: boolean | null;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1.0 à 1.0
  citationSources: string[];
  competitorMentions: string[];

  // CITE détaillé
  citeCredibility: number;
  citeInformation: number;
  citeTransparency: number;
  citeExpertise: number;

  // Méta
  tokensUsed: number;
  latencyMs: number;
  costUsd: number;
}

export interface RunScore {
  scoreGeo: number; // 0-100
  scorePresence: number; // 0-25
  scoreExactitude: number; // 0-25
  scoreSentiment: number; // 0-25
  scoreRecommendation: number; // 0-25
  totalResponses: number;
  responseScores: ResponseScore[];
}

// ============================================================
// ANALYSE D'UNE RÉPONSE INDIVIDUELLE
// ============================================================

/**
 * Analyse une réponse LLM pour détecter les mentions de marque.
 */
function detectBrandMention(
  response: string,
  brandKeywords: string[]
): boolean {
  const lower = response.toLowerCase();
  return brandKeywords.some((kw) => lower.includes(kw.toLowerCase()));
}

/**
 * Détecte si le LLM recommande activement la marque.
 * Cherche des patterns de recommandation explicite.
 */
function detectRecommendation(
  response: string,
  brandKeywords: string[]
): boolean {
  const lower = response.toLowerCase();
  const brandPresent = brandKeywords.some((kw) =>
    lower.includes(kw.toLowerCase())
  );
  if (!brandPresent) return false;

  const recoPatterns = [
    "je recommande",
    "je vous recommande",
    "nous recommandons",
    "recommandé",
    "excellent choix",
    "se distingue",
    "leader",
    "référence",
    "incontournable",
    "à considérer",
    "mérite d'être",
    "i recommend",
    "highly recommended",
    "top choice",
    "stands out",
    "worth considering",
    "best option",
    "premier choix",
    "en tête",
    "se démarque",
    "spécialisé",
    "expertise reconnue",
  ];

  return recoPatterns.some((p) => lower.includes(p));
}

/**
 * Analyse le sentiment de la réponse vis-à-vis de la marque.
 * Retourne un score entre -1.0 (très négatif) et 1.0 (très positif).
 */
function analyzeSentiment(
  response: string,
  brandKeywords: string[]
): { sentiment: "positive" | "neutral" | "negative"; score: number } {
  const lower = response.toLowerCase();
  const brandPresent = brandKeywords.some((kw) =>
    lower.includes(kw.toLowerCase())
  );

  if (!brandPresent) {
    return { sentiment: "neutral", score: 0 };
  }

  // Extraction du contexte autour des mentions de marque (±200 chars)
  let brandContext = "";
  for (const kw of brandKeywords) {
    const idx = lower.indexOf(kw.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 200);
      const end = Math.min(lower.length, idx + kw.length + 200);
      brandContext += lower.slice(start, end) + " ";
    }
  }

  const positiveSignals = [
    "excellent",
    "innovant",
    "pionnier",
    "unique",
    "spécialisé",
    "expertise",
    "professionnel",
    "fiable",
    "performant",
    "efficace",
    "reconnu",
    "qualité",
    "confiance",
    "premier",
    "leader",
    "outstanding",
    "innovative",
    "specialized",
    "trusted",
    "reliable",
    "cutting-edge",
    "state-of-the-art",
  ];

  const negativeSignals = [
    "méfiance",
    "attention",
    "risque",
    "limité",
    "manque",
    "insuffisant",
    "problème",
    "difficulté",
    "cher",
    "coûteux",
    "caution",
    "limited",
    "lacking",
    "expensive",
    "concern",
    "drawback",
    "weakness",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const signal of positiveSignals) {
    if (brandContext.includes(signal)) positiveCount++;
  }
  for (const signal of negativeSignals) {
    if (brandContext.includes(signal)) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) return { sentiment: "neutral", score: 0.1 };

  const score = (positiveCount - negativeCount) / total;
  const sentiment =
    score > 0.2 ? "positive" : score < -0.2 ? "negative" : "neutral";

  return { sentiment, score: Math.max(-1, Math.min(1, score)) };
}

/**
 * Vérifie l'exactitude factuelle basique.
 * Compare les infos de la réponse avec les facts connus du projet.
 */
function checkFactualAccuracy(
  response: string,
  brandKeywords: string[],
  knownFacts?: Record<string, string>
): boolean | null {
  if (!knownFacts || Object.keys(knownFacts).length === 0) return null;

  const lower = response.toLowerCase();
  const brandPresent = brandKeywords.some((kw) =>
    lower.includes(kw.toLowerCase())
  );
  if (!brandPresent) return null;

  let correctCount = 0;
  let checkedCount = 0;

  for (const [key, value] of Object.entries(knownFacts)) {
    if (lower.includes(key.toLowerCase())) {
      checkedCount++;
      if (lower.includes(value.toLowerCase())) {
        correctCount++;
      }
    }
  }

  if (checkedCount === 0) return null;
  return correctCount / checkedCount >= 0.5;
}

/**
 * Détecte les concurrents mentionnés dans la réponse.
 */
function detectCompetitors(
  response: string,
  competitors: string[]
): string[] {
  const lower = response.toLowerCase();
  return competitors.filter((c) => lower.includes(c.toLowerCase()));
}

/**
 * Extrait les URLs citées dans la réponse.
 */
function extractCitations(response: string): string[] {
  const urlRegex = /https?:\/\/[^\s\)]+/g;
  const matches = response.match(urlRegex) || [];
  return [...new Set(matches)];
}

// ============================================================
// SCORING D'UNE RÉPONSE
// ============================================================

export function scoreResponse(
  llmResponse: LLMResponse,
  brandKeywords: string[],
  competitors: string[],
  knownFacts?: Record<string, string>
): ResponseScore {
  const { response, provider, model, query, tokensUsed, latencyMs, costUsd } =
    llmResponse;

  const isBrandMentioned = detectBrandMention(response, brandKeywords);
  const isRecommended = detectRecommendation(response, brandKeywords);
  const { sentiment, score: sentimentScore } = analyzeSentiment(
    response,
    brandKeywords
  );
  const isFactuallyAccurate = checkFactualAccuracy(
    response,
    brandKeywords,
    knownFacts
  );
  const competitorMentions = detectCompetitors(response, competitors);
  const citationSources = extractCitations(response);

  // Scoring CITE (0-25 chacun, total contribue aux composantes globales)
  const citeCredibility = isBrandMentioned
    ? citationSources.length > 0
      ? 20
      : 12
    : 0;
  const citeInformation = isBrandMentioned
    ? response.length > 500
      ? 22
      : response.length > 200
        ? 15
        : 8
    : 0;
  const citeTransparency = citationSources.length > 0 ? 18 : 5;
  const citeExpertise = isRecommended ? 22 : isBrandMentioned ? 10 : 0;

  return {
    provider,
    model,
    query,
    response,
    isBrandMentioned,
    isRecommended,
    isFactuallyAccurate,
    sentiment,
    sentimentScore,
    citationSources,
    competitorMentions,
    citeCredibility,
    citeInformation,
    citeTransparency,
    citeExpertise,
    tokensUsed,
    latencyMs,
    costUsd,
  };
}

// ============================================================
// SCORING GLOBAL D'UN RUN (agrégation)
// ============================================================

export function computeRunScore(responseScores: ResponseScore[]): RunScore {
  const total = responseScores.length;
  if (total === 0) {
    return {
      scoreGeo: 0,
      scorePresence: 0,
      scoreExactitude: 0,
      scoreSentiment: 0,
      scoreRecommendation: 0,
      totalResponses: 0,
      responseScores: [],
    };
  }

  // --- Présence (0-25) ---
  // % de réponses qui mentionnent la marque, ramené sur 25
  const mentionRate =
    responseScores.filter((r) => r.isBrandMentioned).length / total;
  const scorePresence = Math.round(mentionRate * 25 * 100) / 100;

  // --- Exactitude (0-25) ---
  // Parmi les réponses qui mentionnent la marque, % factuellement correctes
  const mentionedResponses = responseScores.filter((r) => r.isBrandMentioned);
  const checkedResponses = mentionedResponses.filter(
    (r) => r.isFactuallyAccurate !== null
  );
  let scoreExactitude: number;
  if (checkedResponses.length === 0) {
    // Si pas de facts à vérifier, score basé sur la profondeur de l'info
    const avgInfo =
      mentionedResponses.reduce((sum, r) => sum + r.citeInformation, 0) /
      Math.max(mentionedResponses.length, 1);
    scoreExactitude = Math.round((avgInfo / 25) * 25 * 100) / 100;
  } else {
    const accuracyRate =
      checkedResponses.filter((r) => r.isFactuallyAccurate).length /
      checkedResponses.length;
    scoreExactitude = Math.round(accuracyRate * 25 * 100) / 100;
  }

  // --- Sentiment (0-25) ---
  // Moyenne des scores de sentiment, normalisée de [-1,1] vers [0,25]
  const avgSentiment =
    responseScores.reduce((sum, r) => sum + r.sentimentScore, 0) / total;
  const scoreSentiment =
    Math.round(((avgSentiment + 1) / 2) * 25 * 100) / 100;

  // --- Recommandation (0-25) ---
  // % de réponses qui recommandent activement, ramené sur 25
  const recoRate =
    responseScores.filter((r) => r.isRecommended).length / total;
  const scoreRecommendation = Math.round(recoRate * 25 * 100) / 100;

  // --- Score GEO™ global ---
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
