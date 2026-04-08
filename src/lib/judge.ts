// src/lib/judge.ts
// LLM-as-judge for Score GEO™ v2
// Single Claude Sonnet call per response, returns structured JSON

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const JUDGE_MODEL = "claude-sonnet-4-5-20250929";

export interface JudgeVerdict {
  isBrandMentioned: boolean;
  brandMentionConfidence: number; // 0-1
  isRecommended: boolean;
  recommendationStrength: "explicit" | "implicit" | "none";
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1 to +1
  competitorMentions: string[]; // canonical names from the provided list
  factualClaims: Array<{
    claim: string;
    verdict: "correct" | "incorrect" | "unverifiable";
    expectedValue?: string;
  }>;
  citationUrls: string[];
  reasoningNotes: string; // brief justification for audit trail
}

interface JudgeInput {
  response: string;
  brandName: string;
  brandAliases: string[]; // ex: ["MCVA", "MCVA Consulting", "MCVA SA"]
  competitors: string[];
  knownFacts?: Record<string, string>; // ex: { "fondation": "1977", "collaborateurs": "20" }
  language: "fr" | "de" | "en";
}

const JUDGE_SYSTEM_PROMPT = `You are a structured analyst evaluating how an AI assistant talks about a specific brand. You output ONLY valid JSON matching the provided schema. No prose, no markdown, no code fences.

Your analysis must be strict and reproducible:
- "isBrandMentioned" is TRUE only if the brand is explicitly named (case-insensitive). Substring matches inside other words DO NOT count.
- "isRecommended" is TRUE only if the response clearly suggests the brand as a good choice. Generic mentions are NOT recommendations.
- "sentiment" reflects ONLY the tone toward the brand, not the overall response tone.
- "factualClaims" lists every verifiable claim about the brand, comparing against known facts when provided.
- Be conservative: when uncertain, choose neutral / unverifiable / false.`;

function buildJudgePrompt(input: JudgeInput): string {
  const factsSection =
    input.knownFacts && Object.keys(input.knownFacts).length > 0
      ? `\n\nKNOWN FACTS about ${input.brandName} (use to verify factual claims):\n${Object.entries(input.knownFacts)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}`
      : "";

  return `Brand to analyze: ${input.brandName}
Brand aliases (any of these counts as a mention): ${JSON.stringify(input.brandAliases)}
Known competitors (canonical names): ${JSON.stringify(input.competitors)}
Response language: ${input.language}${factsSection}

AI ASSISTANT RESPONSE TO ANALYZE:
"""
${input.response}
"""

Output a JSON object matching this exact schema:
{
  "isBrandMentioned": boolean,
  "brandMentionConfidence": number,
  "isRecommended": boolean,
  "recommendationStrength": "explicit" | "implicit" | "none",
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number,
  "competitorMentions": string[],
  "factualClaims": [{ "claim": string, "verdict": "correct" | "incorrect" | "unverifiable", "expectedValue": string }],
  "citationUrls": string[],
  "reasoningNotes": string
}`;
}

/**
 * Fallback brand detection using word-boundary tokenization.
 * Used only when judgeResponse() throws (API failure, timeout, etc.).
 * Strict: requires word boundaries, not substring matches.
 */
export function fallbackBrandDetection(
  response: string,
  brandAliases: string[]
): boolean {
  const tokens = response
    .toLowerCase()
    .split(/[\s\p{P}]+/u)
    .filter(Boolean);
  return brandAliases.some((alias) => {
    const aliasTokens = alias.toLowerCase().split(/\s+/);
    if (aliasTokens.length === 1) {
      return tokens.includes(aliasTokens[0]);
    }
    // Multi-word alias: search for consecutive token sequence
    for (let i = 0; i <= tokens.length - aliasTokens.length; i++) {
      if (aliasTokens.every((t, j) => tokens[i + j] === t)) return true;
    }
    return false;
  });
}

export async function judgeResponse(input: JudgeInput): Promise<JudgeVerdict> {
  try {
    const message = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 2000,
      temperature: 0, // deterministic
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildJudgePrompt(input) }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Judge returned no text content");
    }

    // Parse JSON, handling potential ```json wrappers defensively
    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const verdict = JSON.parse(raw) as JudgeVerdict;
    return verdict;
  } catch (err) {
    console.error("[judge] Failed, using fallback:", err);
    return {
      isBrandMentioned: fallbackBrandDetection(
        input.response,
        input.brandAliases
      ),
      brandMentionConfidence: 0.5,
      isRecommended: false,
      recommendationStrength: "none",
      sentiment: "neutral",
      sentimentScore: 0,
      competitorMentions: [],
      factualClaims: [],
      citationUrls: input.response.match(/https?:\/\/[^\s)]+/g) || [],
      reasoningNotes: `Judge failed: ${err instanceof Error ? err.message : "unknown"}. Using fallback detection.`,
    };
  }
}
