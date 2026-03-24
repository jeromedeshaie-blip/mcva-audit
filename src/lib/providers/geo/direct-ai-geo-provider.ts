import Anthropic from "@anthropic-ai/sdk";
import type { GeoProvider } from "./geo-provider";
import type { GeoData, AIModelResult, QualityLevel } from "@/types/audit";
import { QUALITY_CONFIG } from "@/lib/constants";

/** Timeout for Anthropic API calls (30s) */
const ANTHROPIC_TIMEOUT_MS = 30000;

/** Minimum brand name length to avoid false positives */
const MIN_BRAND_LENGTH_FOR_INCLUDES = 3;

/**
 * DirectAIGeoProvider — Palier 1 (Construction)
 *
 * Mesure la visibilité IA en interrogeant directement les modèles :
 * - Claude (Anthropic API)
 * - GPT-4o (OpenAI API)
 *
 * Pour chaque modèle, on pose 5 questions sectorielles et on détecte
 * si la marque/domaine est cité dans les réponses.
 *
 * Coût estimé : ~$0.02-0.05 par audit.
 */
export class DirectAIGeoProvider implements GeoProvider {
  readonly name = "direct_ai" as const;

  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic();
  }

  async getAIVisibility(
    brand: string,
    sector: string,
    domain: string,
    quality: QualityLevel = "standard"
  ): Promise<GeoData> {
    const questions = generateSectorQuestions(brand, sector);
    const config = QUALITY_CONFIG[quality];

    // Build model queries based on quality level
    const queries: Promise<AIModelResult>[] = [];
    for (const model of config.geoModels) {
      switch (model) {
        case "claude":
          queries.push(this.queryClaude(brand, domain, questions));
          break;
        case "openai":
          queries.push(this.queryOpenAI(brand, domain, questions));
          break;
        case "perplexity":
          queries.push(this.queryPerplexity(brand, domain, questions));
          break;
        case "gemini":
          queries.push(this.queryGemini(brand, domain, questions));
          break;
      }
    }

    const modelResults = await Promise.allSettled(queries);

    const fulfilled: AIModelResult[] = [];
    const errors: string[] = [];

    for (const r of modelResults) {
      if (r.status === "fulfilled") {
        fulfilled.push(r.value);
      } else {
        errors.push(r.reason?.message || String(r.reason));
      }
    }

    // If ALL models failed, flag it explicitly
    if (fulfilled.length === 0) {
      console.error("[GEO] All models failed:", errors);
      return {
        ai_visibility_score: 0,
        models_tested: [],
        brand_mentioned: false,
        brand_sentiment: "not_mentioned",
        citation_count: 0,
        models_coverage: 0,
        _all_models_failed: true,
        _errors: errors,
      } as GeoData;
    }

    // Only count models that actually returned results (not missing API key stubs)
    const testedModels = fulfilled.filter((r) => r._actually_tested !== false);
    const mentionedCount = testedModels.filter((r) => r.mentioned).length;
    const totalModels = testedModels.length;

    // Calculate AI visibility score (0-100) — weighted by quality, not binary
    const visibilityScore = totalModels > 0
      ? Math.round(
          testedModels.reduce((sum, r) => sum + (r.quality_score ?? (r.mentioned ? 50 : 0)), 0) / totalModels
        )
      : 0;

    // Determine overall sentiment
    const sentiments = testedModels.map((r) => r.sentiment);
    const overallSentiment = determineSentiment(sentiments);

    return {
      ai_visibility_score: visibilityScore,
      models_tested: fulfilled,
      brand_mentioned: mentionedCount > 0,
      brand_sentiment: overallSentiment,
      citation_count: mentionedCount,
      models_coverage: totalModels,
    };
  }

  async getBrandPerception(
    brand: string,
    sector: string
  ): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
    summary: string;
  }> {
    try {
      const message = await this.anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `En tant qu'expert en réputation digitale, analyse la perception de la marque "${sanitizeBrandForPrompt(brand)}" dans le secteur "${sanitizeBrandForPrompt(sector)}".

Réponds en JSON avec:
- sentiment: "positive", "neutral", "negative" ou "not_mentioned"
- summary: une phrase résumant la perception (en français)

Si tu ne connais pas cette marque, utilise "not_mentioned" comme sentiment.`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sentiment: parsed.sentiment || "not_mentioned",
          summary: parsed.summary || "Perception non déterminée.",
        };
      }
    } catch (error) {
      console.error("[GEO] getBrandPerception failed:", error);
    }

    return {
      sentiment: "not_mentioned",
      summary: "Impossible d'analyser la perception de la marque.",
    };
  }

  private async queryClaude(
    brand: string,
    domain: string,
    questions: string[]
  ): Promise<AIModelResult> {
    const prompt = questions
      .map((q, i) => `Question ${i + 1}: ${q}`)
      .join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);

    try {
      const message = await this.anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: `Réponds à ces questions de manière concise et factuelle:\n\n${prompt}`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const mentioned = isBrandMentioned(text, brand, domain);
      const qualityAnalysis = mentioned ? analyzeQuality(text, brand, domain) : null;

      return {
        model: "claude",
        mentioned,
        citation_text: mentioned ? extractCitation(text, brand, domain) : null,
        sentiment: mentioned ? analyzeSentiment(text, brand) : "not_mentioned",
        context: mentioned ? extractContext(text, brand, domain) : null,
        quality_score: qualityAnalysis?.score ?? 0,
        mention_position: qualityAnalysis?.position ?? "not_mentioned",
        is_recommended: qualityAnalysis?.isRecommended ?? false,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async queryOpenAI(
    brand: string,
    domain: string,
    questions: string[]
  ): Promise<AIModelResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return a result flagged as not actually tested (won't count in scoring)
      return {
        model: "gpt-4o",
        mentioned: false,
        citation_text: null,
        sentiment: "not_mentioned",
        context: null,
        _actually_tested: false,
      } as AIModelResult;
    }

    const prompt = questions
      .map((q, i) => `Question ${i + 1}: ${q}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Réponds à ces questions de manière concise et factuelle:\n\n${prompt}`,
          },
        ],
        max_tokens: 1500,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const mentioned = isBrandMentioned(text, brand, domain);
    const qualityAnalysis = mentioned ? analyzeQuality(text, brand, domain) : null;

    return {
      model: "gpt-4o",
      mentioned,
      citation_text: mentioned ? extractCitation(text, brand, domain) : null,
      sentiment: mentioned ? analyzeSentiment(text, brand) : "not_mentioned",
      context: mentioned ? extractContext(text, brand, domain) : null,
      quality_score: qualityAnalysis?.score ?? 0,
      mention_position: qualityAnalysis?.position ?? "not_mentioned",
      is_recommended: qualityAnalysis?.isRecommended ?? false,
    };
  }

  private async queryPerplexity(
    brand: string,
    domain: string,
    questions: string[]
  ): Promise<AIModelResult> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      return { model: "perplexity", mentioned: false, citation_text: null, sentiment: "not_mentioned", context: null, quality_score: 0, mention_position: "not_mentioned", is_recommended: false, _actually_tested: false } as AIModelResult;
    }

    const prompt = questions.map((q, i) => `Question ${i + 1}: ${q}`).join("\n");

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: `Réponds à ces questions de manière concise et factuelle:\n\n${prompt}` }],
        max_tokens: 1500,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`Perplexity API error: ${response.status}`);

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const mentioned = isBrandMentioned(text, brand, domain);
    const qualityAnalysis = mentioned ? analyzeQuality(text, brand, domain) : null;

    return {
      model: "perplexity",
      mentioned,
      citation_text: mentioned ? extractCitation(text, brand, domain) : null,
      sentiment: mentioned ? analyzeSentiment(text, brand) : "not_mentioned",
      context: mentioned ? extractContext(text, brand, domain) : null,
      quality_score: qualityAnalysis?.score ?? 0,
      mention_position: qualityAnalysis?.position ?? "not_mentioned",
      is_recommended: qualityAnalysis?.isRecommended ?? false,
    };
  }

  private async queryGemini(
    brand: string,
    domain: string,
    questions: string[]
  ): Promise<AIModelResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { model: "gemini", mentioned: false, citation_text: null, sentiment: "not_mentioned", context: null, quality_score: 0, mention_position: "not_mentioned", is_recommended: false, _actually_tested: false } as AIModelResult;
    }

    const prompt = questions.map((q, i) => `Question ${i + 1}: ${q}`).join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Réponds à ces questions de manière concise et factuelle:\n\n${prompt}` }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0 },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const mentioned = isBrandMentioned(text, brand, domain);
    const qualityAnalysis = mentioned ? analyzeQuality(text, brand, domain) : null;

    return {
      model: "gemini",
      mentioned,
      citation_text: mentioned ? extractCitation(text, brand, domain) : null,
      sentiment: mentioned ? analyzeSentiment(text, brand) : "not_mentioned",
      context: mentioned ? extractContext(text, brand, domain) : null,
      quality_score: qualityAnalysis?.score ?? 0,
      mention_position: qualityAnalysis?.position ?? "not_mentioned",
      is_recommended: qualityAnalysis?.isRecommended ?? false,
    };
  }
}

// --- Helpers ---

/**
 * Sanitize user input before injection into LLM prompts.
 * Strips control characters and truncates to 100 chars.
 */
function sanitizeBrandForPrompt(input: string): string {
  return input
    .replace(/[\x00-\x1f\x7f]/g, "")
    .slice(0, 100)
    .trim();
}

/**
 * Detect brand mention with word-boundary matching for short brand names.
 */
function isBrandMentioned(text: string, brand: string, domain: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerDomain = domain.toLowerCase();

  // Domain check (always includes-based, domains are unique enough)
  if (lowerText.includes(lowerDomain)) return true;

  // Brand check with word boundaries for short names
  const lowerBrand = brand.toLowerCase();
  if (lowerBrand.length < MIN_BRAND_LENGTH_FOR_INCLUDES) {
    // Use word boundary regex for very short brands
    const escaped = lowerBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    return regex.test(text);
  }

  return lowerText.includes(lowerBrand);
}

function generateSectorQuestions(brand: string, sector: string): string[] {
  const safeBrand = sanitizeBrandForPrompt(brand);
  const safeSector = sanitizeBrandForPrompt(sector);
  return [
    `Quelles sont les meilleures entreprises dans le secteur ${safeSector} en France ?`,
    `Qui sont les leaders du ${safeSector} en Suisse et en France ?`,
    `Recommande-moi une entreprise de ${safeSector} fiable et reconnue.`,
    `Que penses-tu de ${safeBrand} dans le secteur ${safeSector} ?`,
    `Quels sont les acteurs innovants du ${safeSector} ?`,
  ];
}

function extractCitation(
  text: string,
  brand: string,
  domain: string
): string | null {
  const lines = text.split(/[.\n]/);
  const relevant = lines.find(
    (line) =>
      line.toLowerCase().includes(brand.toLowerCase()) ||
      line.toLowerCase().includes(domain.toLowerCase())
  );
  return relevant?.trim() || null;
}

function analyzeSentiment(
  text: string,
  brand: string
): "positive" | "neutral" | "negative" {
  // Simple heuristic — in production, use LLM for better analysis
  const brandContext = text
    .toLowerCase()
    .split(/[.\n]/)
    .filter((s) => s.includes(brand.toLowerCase()))
    .join(" ");

  const positiveWords = [
    "leader",
    "excellent",
    "reconnu",
    "fiable",
    "innovant",
    "recommandé",
    "qualité",
    "expert",
    "référence",
    "performant",
  ];
  const negativeWords = [
    "problème",
    "critique",
    "faible",
    "insuffisant",
    "médiocre",
    "décevant",
    "controversé",
  ];

  const posCount = positiveWords.filter((w) =>
    brandContext.includes(w)
  ).length;
  const negCount = negativeWords.filter((w) =>
    brandContext.includes(w)
  ).length;

  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

function extractContext(
  text: string,
  brand: string,
  domain: string
): string | null {
  const sentences = text.split(/[.\n]/).filter((s) => s.trim().length > 10);
  const relevant = sentences.find(
    (s) =>
      s.toLowerCase().includes(brand.toLowerCase()) ||
      s.toLowerCase().includes(domain.toLowerCase())
  );
  return relevant?.trim().slice(0, 200) || null;
}

/**
 * Analyze quality of brand mention: position, recommendation, detail level.
 * Returns a score 0-100 instead of binary mentioned/not.
 */
function analyzeQuality(
  text: string,
  brand: string,
  domain: string
): { score: number; position: "first" | "top3" | "listed" | "not_mentioned"; isRecommended: boolean } {
  const lowerText = text.toLowerCase();
  const lowerBrand = brand.toLowerCase();
  const lowerDomain = domain.toLowerCase();

  let score = 0;

  // 1. Position analysis (0-40 points)
  // Split by questions/sections to find first mention
  const sections = text.split(/Question \d+|[\n]{2,}/i).filter(s => s.trim());
  let firstMentionIndex = -1;
  let mentionCount = 0;

  for (let i = 0; i < sections.length; i++) {
    const sectionLower = sections[i].toLowerCase();
    if (sectionLower.includes(lowerBrand) || sectionLower.includes(lowerDomain)) {
      if (firstMentionIndex === -1) firstMentionIndex = i;
      mentionCount++;
    }
  }

  let position: "first" | "top3" | "listed" | "not_mentioned" = "not_mentioned";

  if (mentionCount === 0) {
    return { score: 0, position: "not_mentioned", isRecommended: false };
  }

  // Check if brand is mentioned first in any list
  const listPatterns = text.split(/\n/).filter(line => line.trim().match(/^[-•*\d]/));
  const brandInFirstItems = listPatterns.slice(0, 3).some(
    line => line.toLowerCase().includes(lowerBrand) || line.toLowerCase().includes(lowerDomain)
  );

  if (brandInFirstItems || firstMentionIndex === 0) {
    position = "first";
    score += 40;
  } else if (firstMentionIndex <= 2) {
    position = "top3";
    score += 25;
  } else {
    position = "listed";
    score += 10;
  }

  // 2. Recommendation strength (0-30 points)
  const recommendWords = ["recommande", "conseille", "privilégie", "meilleur", "idéal", "incontournable", "référence", "excellent choix"];
  const brandContext = lowerText
    .split(/[.\n]/)
    .filter(s => s.includes(lowerBrand) || s.includes(lowerDomain))
    .join(" ");

  const isRecommended = recommendWords.some(w => brandContext.includes(w));
  if (isRecommended) {
    score += 30;
  }

  // 3. Sentiment bonus (0-15 points)
  const sentiment = analyzeSentiment(text, brand);
  if (sentiment === "positive") score += 15;
  else if (sentiment === "neutral") score += 5;

  // 4. Frequency bonus (0-15 points) — mentioned in multiple questions
  const questionsWithMention = sections.filter(
    s => s.toLowerCase().includes(lowerBrand) || s.toLowerCase().includes(lowerDomain)
  ).length;
  const totalQuestions = Math.max(sections.length, 1);
  score += Math.round((questionsWithMention / totalQuestions) * 15);

  return { score: Math.min(100, score), position, isRecommended };
}

function determineSentiment(
  sentiments: Array<
    "positive" | "neutral" | "negative" | "not_mentioned"
  >
): "positive" | "neutral" | "negative" | "not_mentioned" {
  const counted = sentiments.filter((s) => s !== "not_mentioned");
  if (counted.length === 0) return "not_mentioned";

  const pos = counted.filter((s) => s === "positive").length;
  const neg = counted.filter((s) => s === "negative").length;

  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}
