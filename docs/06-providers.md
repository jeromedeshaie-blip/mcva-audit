# 06 — Providers SEO/GEO

**Module** : 06 — Providers SEO/GEO
**Version** : 2.1 (tag `v2.1-release`)

Abstraction des sources de données SEO (free-tier vs Semrush legacy) et GEO. @deprecated Semrush depuis v2.1.

---

## `src/lib/providers/geo/direct-ai-geo-provider.ts`

```typescript
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

```


## `src/lib/providers/geo/geo-provider.ts`

```typescript
import type { GeoData, QualityLevel } from "@/types/audit";

/**
 * Interface abstraite pour les providers GEO (visibilité IA).
 *
 * Palier 1 (Construction) : DirectAIGeoProvider — appels directs à 4 modèles (Claude, GPT, Perplexity, Gemini)
 * Palier 2 (Production)   : QwairyProvider — API Qwairy, 38+ modèles
 *
 * Le code métier ne connaît que cette interface.
 * Le swap se fait par configuration (env var GEO_PROVIDER).
 */
export interface GeoProvider {
  readonly name: "direct_ai" | "qwairy";

  /**
   * Mesure la visibilité d'une marque dans les réponses des moteurs IA.
   * Pose des questions sectorielles et détecte si la marque est citée.
   */
  getAIVisibility(brand: string, sector: string, domain: string, quality?: QualityLevel): Promise<GeoData>;

  /**
   * Analyse la perception de la marque par les IA.
   * Retourne le sentiment global et les citations détectées.
   */
  getBrandPerception(brand: string, sector: string): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
    summary: string;
  }>;
}

/**
 * Factory : instancie le bon provider selon la configuration.
 */
export async function createGeoProvider(): Promise<GeoProvider> {
  const providerName = process.env.GEO_PROVIDER || "direct_ai";

  switch (providerName) {
    case "qwairy": {
      const { QwairyProvider } = await import("./qwairy-provider");
      return new QwairyProvider();
    }
    case "direct_ai":
    default: {
      const { DirectAIGeoProvider } = await import("./direct-ai-geo-provider");
      return new DirectAIGeoProvider();
    }
  }
}

```


## `src/lib/providers/geo/qwairy-provider.ts`

```typescript
import type { GeoProvider } from "./geo-provider";
import type { GeoData } from "@/types/audit";

/**
 * QwairyProvider — Palier 2 (Production)
 *
 * À implémenter en Phase 2 quand la licence Qwairy est activée.
 * Pour l'instant, stub qui lève une erreur.
 */
export class QwairyProvider implements GeoProvider {
  readonly name = "qwairy" as const;

  constructor() {
    if (!process.env.QWAIRY_API_KEY) {
      throw new Error(
        "QWAIRY_API_KEY is required. Set GEO_PROVIDER=direct_ai to use Palier 1."
      );
    }
  }

  async getAIVisibility(
    _brand: string,
    _sector: string,
    _domain: string
  ): Promise<GeoData> {
    // TODO: Phase 2 — Implement Qwairy API integration
    // Endpoints: AI Visibility Score, Citation Detection, 38+ models
    throw new Error("QwairyProvider not yet implemented. Switch to GEO_PROVIDER=direct_ai.");
  }

  async getBrandPerception(
    _brand: string,
    _sector: string
  ): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
    summary: string;
  }> {
    // TODO: Phase 2 — Implement Qwairy Brand Perception endpoint
    throw new Error("QwairyProvider not yet implemented. Switch to GEO_PROVIDER=direct_ai.");
  }
}

```


## `src/lib/providers/seo/free-seo-provider.ts`

```typescript
import type { SeoProvider } from "./seo-provider";
import type { SeoData, CompetitorData, CoreWebVitals, TechnicalCheck, SchemaDetail, ReadabilityData } from "@/types/audit";
import * as cheerio from "cheerio";

const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Max HTML response size: 5 MB */
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/** Blocked hosts for SSRF protection */
const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fd/i,
  /^\[?fc/i,
  /metadata\.google\.internal/i,
];

function isBlockedUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;
    return BLOCKED_HOSTS.some((pattern) => pattern.test(hostname));
  } catch {
    return true; // block unparseable URLs
  }
}

/**
 * FreeSeoProvider — Palier 1 (Construction)
 *
 * Analyse SEO basée sur :
 * - Scraping HTML (Cheerio) : meta tags, headings, schema.org, liens, images
 * - Google PageSpeed Insights API (gratuit) : Core Web Vitals, performance score
 *
 * Les champs Semrush-only (organic_traffic, backlinks, authority_score, etc.)
 * retournent null.
 */
export class FreeSeoProvider implements SeoProvider {
  readonly name = "free" as const;

  async getDomainOverview(domain: string): Promise<SeoData> {
    const url = domain.startsWith("https://") || domain.startsWith("http://")
      ? domain
      : `https://${domain}`;

    if (isBlockedUrl(url)) {
      throw new Error(`URL bloquée pour raisons de sécurité : ${url}`);
    }

    const [htmlData, pageSpeedData, robotsData] = await Promise.allSettled([
      this.analyzeHTML(url),
      this.getPageSpeedData(url),
      this.checkRobotsTxt(url),
    ]);

    const html = htmlData.status === "fulfilled" ? htmlData.value : getEmptyHtmlAnalysis();
    const pageSpeed = pageSpeedData.status === "fulfilled" ? pageSpeedData.value : null;
    const robots = robotsData.status === "fulfilled" ? robotsData.value : { exists: false, hasSitemap: false, sitemapUrl: null };

    // Build technical checks
    const technicalChecks = buildTechnicalChecks(html, robots, url);
    const schemaDetail = parseSchemaDetail(html.schema_scripts || []);
    const readability = analyzeReadability(html.body_text || "");

    return {
      // HTML analysis (always available)
      meta_title: html.meta_title,
      meta_description: html.meta_description,
      h1_count: html.h1_count,
      h2_count: html.h2_count,
      has_schema_org: html.has_schema_org,
      schema_types: html.schema_types,
      internal_links_count: html.internal_links_count,
      external_links_count: html.external_links_count,
      images_without_alt: html.images_without_alt,

      // PageSpeed (free API)
      page_speed_score: pageSpeed?.score ?? null,
      core_web_vitals: pageSpeed?.core_web_vitals ?? null,

      // Technical checks (enriched)
      technical_checks: technicalChecks,
      schema_detail: schemaDetail,
      readability,
      has_https: url.startsWith("https://"),
      has_viewport: html.has_viewport,
      has_canonical: !!html.canonical_url,
      canonical_url: html.canonical_url,
      has_robots_txt: robots.exists,
      has_sitemap: robots.hasSitemap,
      sitemap_url: robots.sitemapUrl,
      hreflang_tags: html.hreflang_tags,
      meta_title_length: html.meta_title ? html.meta_title.length : null,
      meta_description_length: html.meta_description ? html.meta_description.length : null,

      // Semrush-only — null in Palier 1
      organic_traffic: null,
      organic_keywords: null,
      authority_score: null,
      backlinks_total: null,
      referring_domains: null,
      top_keywords: null,
    };
  }

  async getCompetitors(_domain: string): Promise<CompetitorData[] | null> {
    // Not available in Palier 1
    return null;
  }

  private async analyzeHTML(url: string): Promise<HtmlAnalysis> {
    if (isBlockedUrl(url)) {
      throw new Error(`URL bloquée pour raisons de sécurité : ${url}`);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MCVAAuditBot/1.0; +https://mcva.ch)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    // Check Content-Length header if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error(`Réponse trop volumineuse (${contentLength} octets, max: ${MAX_RESPONSE_SIZE})`);
    }

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Impossible de lire la réponse");
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel();
        throw new Error(`Réponse trop volumineuse (>${MAX_RESPONSE_SIZE} octets)`);
      }
      chunks.push(value);
    }

    const html = new TextDecoder().decode(
      Buffer.concat(chunks)
    );
    const $ = cheerio.load(html);

    const baseUrl = new URL(url);
    let internalLinks = 0;
    let externalLinks = 0;

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      // Skip non-HTTP protocols
      if (/^(javascript|mailto|tel|data|blob):/i.test(href)) return;
      if (href.startsWith("#")) return;
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.protocol !== "http:" && linkUrl.protocol !== "https:") return;
        if (linkUrl.hostname === baseUrl.hostname) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch {
        // relative links count as internal
        internalLinks++;
      }
    });

    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "");
        const type = json["@type"];
        if (type) {
          schemaTypes.push(Array.isArray(type) ? type.join(", ") : type);
        }
      } catch {
        // ignore malformed JSON-LD
      }
    });

    // Hreflang tags
    const hreflangTags: { lang: string; href: string }[] = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      hreflangTags.push({
        lang: $(el).attr("hreflang") || "",
        href: $(el).attr("href") || "",
      });
    });

    // Schema.org raw scripts for detailed parsing
    const schemaScripts: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      schemaScripts.push($(el).html() || "");
    });

    // Body text for readability analysis
    const $bodyClone = cheerio.load($.html());
    $bodyClone("script, style, noscript, nav, footer, header").remove();
    const bodyText = $bodyClone("body").text().replace(/\s+/g, " ").trim();

    return {
      meta_title: $("title").first().text().trim() || null,
      meta_description:
        $('meta[name="description"]').attr("content")?.trim() || null,
      h1_count: $("h1").length,
      h2_count: $("h2").length,
      has_schema_org: schemaTypes.length > 0,
      schema_types: schemaTypes,
      internal_links_count: internalLinks,
      external_links_count: externalLinks,
      images_without_alt: $("img").filter((_, el) => !$(el).attr("alt")).length,
      // New fields
      has_viewport: $('meta[name="viewport"]').length > 0,
      canonical_url: $('link[rel="canonical"]').attr("href") || null,
      hreflang_tags: hreflangTags,
      schema_scripts: schemaScripts,
      body_text: bodyText,
    };
  }

  private async checkRobotsTxt(url: string): Promise<{
    exists: boolean;
    hasSitemap: boolean;
    sitemapUrl: string | null;
  }> {
    try {
      const robotsUrl = new URL("/robots.txt", url).toString();
      const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { exists: false, hasSitemap: false, sitemapUrl: null };

      const text = await res.text();
      const sitemapMatch = text.match(/Sitemap:\s*(.+)/i);

      return {
        exists: true,
        hasSitemap: !!sitemapMatch,
        sitemapUrl: sitemapMatch ? sitemapMatch[1].trim() : null,
      };
    } catch {
      return { exists: false, hasSitemap: false, sitemapUrl: null };
    }
  }

  private async getPageSpeedData(
    url: string
  ): Promise<{ score: number; core_web_vitals: CoreWebVitals } | null> {
    const apiKey = process.env.PAGESPEED_API_KEY;
    const params = new URLSearchParams({
      url,
      category: "performance",
      strategy: "mobile",
    });
    if (apiKey) params.set("key", apiKey);

    const response = await fetch(`${PAGESPEED_API_URL}?${params}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    if (!lighthouse) return null;

    const audits = lighthouse.audits || {};

    return {
      score: Math.round((lighthouse.categories?.performance?.score || 0) * 100),
      core_web_vitals: {
        lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
        fid: audits["max-potential-fid"]?.numericValue ?? null,
        cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
        inp: audits["interaction-to-next-paint"]?.numericValue ?? null,
        ttfb: audits["server-response-time"]?.numericValue ?? null,
      },
    };
  }
}

// --- Helpers ---

interface HtmlAnalysis {
  meta_title: string | null;
  meta_description: string | null;
  h1_count: number;
  h2_count: number;
  has_schema_org: boolean;
  schema_types: string[];
  internal_links_count: number;
  external_links_count: number;
  images_without_alt: number;
  // Enriched fields
  has_viewport: boolean;
  canonical_url: string | null;
  hreflang_tags: { lang: string; href: string }[];
  schema_scripts: string[];
  body_text: string;
}

function getEmptyHtmlAnalysis(): HtmlAnalysis {
  return {
    meta_title: null,
    meta_description: null,
    h1_count: 0,
    h2_count: 0,
    has_schema_org: false,
    schema_types: [],
    internal_links_count: 0,
    external_links_count: 0,
    images_without_alt: 0,
    has_viewport: false,
    canonical_url: null,
    hreflang_tags: [],
    schema_scripts: [],
    body_text: "",
  };
}

// ============================================================
// Technical Checks Builder
// ============================================================

function buildTechnicalChecks(
  html: HtmlAnalysis,
  robots: { exists: boolean; hasSitemap: boolean; sitemapUrl: string | null },
  url: string
): TechnicalCheck[] {
  const checks: TechnicalCheck[] = [];

  // -- META --
  checks.push({
    id: "title_present",
    label: "Balise <title> presente",
    status: html.meta_title ? "pass" : "fail",
    value: html.meta_title || undefined,
    impact: "both",
  });

  checks.push({
    id: "title_length",
    label: "Longueur du titre (30-65 car.)",
    status: html.meta_title
      ? html.meta_title.length >= 30 && html.meta_title.length <= 65
        ? "pass"
        : "warn"
      : "fail",
    value: html.meta_title ? `${html.meta_title.length} caracteres` : undefined,
    expected: "30-65 caracteres",
    impact: "seo",
  });

  checks.push({
    id: "meta_description",
    label: "Meta description presente",
    status: html.meta_description ? "pass" : "fail",
    value: html.meta_description?.substring(0, 80) || undefined,
    impact: "seo",
    description: "Les LLM utilisent la meta description pour comprendre le positionnement du site",
  });

  checks.push({
    id: "meta_description_length",
    label: "Longueur meta description (100-165 car.)",
    status: html.meta_description
      ? html.meta_description.length >= 100 && html.meta_description.length <= 165
        ? "pass"
        : "warn"
      : "fail",
    value: html.meta_description ? `${html.meta_description.length} caracteres` : undefined,
    impact: "seo",
  });

  // -- STRUCTURE H1/H2 --
  checks.push({
    id: "h1_present",
    label: "Balise H1 presente",
    status: html.h1_count > 0 ? "pass" : "fail",
    value: `${html.h1_count} H1`,
    impact: "both",
    description: "Le H1 est le premier signal lu par les LLM pour qualifier le site",
  });

  checks.push({
    id: "h1_unique",
    label: "Un seul H1 par page",
    status: html.h1_count === 1 ? "pass" : html.h1_count === 0 ? "fail" : "warn",
    value: html.h1_count > 1 ? `${html.h1_count} H1 trouves` : undefined,
    impact: "seo",
  });

  checks.push({
    id: "h2_present",
    label: "Balises H2 presentes (structure)",
    status: html.h2_count >= 2 ? "pass" : html.h2_count === 1 ? "warn" : "fail",
    value: `${html.h2_count} H2`,
    impact: "geo",
    description: "Les LLM extraient leurs reponses depuis les sections H2/H3",
  });

  // -- TECHNIQUE --
  checks.push({
    id: "https",
    label: "Site en HTTPS",
    status: url.startsWith("https://") ? "pass" : "fail",
    impact: "seo",
  });

  checks.push({
    id: "viewport",
    label: "Meta viewport (responsive)",
    status: html.has_viewport ? "pass" : "fail",
    impact: "seo",
  });

  checks.push({
    id: "canonical",
    label: "URL canonique definie",
    status: html.canonical_url ? "pass" : "warn",
    value: html.canonical_url || undefined,
    impact: "seo",
  });

  checks.push({
    id: "robots_txt",
    label: "Fichier robots.txt present",
    status: robots.exists ? "pass" : "warn",
    impact: "seo",
  });

  checks.push({
    id: "sitemap",
    label: "Sitemap XML reference",
    status: robots.hasSitemap ? "pass" : "warn",
    value: robots.sitemapUrl || undefined,
    impact: "seo",
  });

  // -- IMAGES --
  const imgWithoutAlt = html.images_without_alt;
  checks.push({
    id: "images_alt",
    label: "Attributs alt sur les images",
    status: imgWithoutAlt === 0 ? "pass" : imgWithoutAlt <= 2 ? "warn" : "fail",
    value: `${imgWithoutAlt} image(s) sans alt`,
    impact: "seo",
  });

  // -- HREFLANG (critical for Swiss market) --
  checks.push({
    id: "hreflang",
    label: "Balises hreflang (multilingue)",
    status: html.hreflang_tags.length > 0 ? "pass" : "warn",
    value: html.hreflang_tags.length > 0
      ? html.hreflang_tags.map((h) => h.lang).join(", ")
      : "Absent",
    impact: "geo",
    description: "Critique pour le marche suisse — permet aux LLM de distinguer FR/DE/EN",
  });

  // -- SCHEMA.ORG DETAIL --
  const schemaDetail = parseSchemaDetail(html.schema_scripts);

  checks.push({
    id: "schema_local_business",
    label: "Schema.org LocalBusiness",
    status: schemaDetail.has_local_business ? "pass" : "fail",
    impact: "geo",
    description: "Donnee structuree la plus importante pour la visibilite LLM locale",
  });

  checks.push({
    id: "schema_faq",
    label: "Schema.org FAQPage",
    status: schemaDetail.has_faq ? "pass" : "warn",
    impact: "geo",
    description: "Un schema FAQ est directement extrait par ChatGPT et Perplexity",
  });

  checks.push({
    id: "schema_breadcrumb",
    label: "Schema.org BreadcrumbList",
    status: schemaDetail.has_breadcrumb ? "pass" : "warn",
    impact: "seo",
  });

  return checks;
}

// ============================================================
// Schema.org Detailed Parser
// ============================================================

function parseSchemaDetail(scripts: string[]): SchemaDetail {
  const schemas: string[] = [];
  let has_local_business = false;
  let has_faq = false;
  let has_breadcrumb = false;
  let has_website = false;
  const issues: string[] = [];

  for (const script of scripts) {
    try {
      const data = JSON.parse(script);
      const types = Array.isArray(data)
        ? data.map((d: any) => d["@type"]).flat()
        : [data["@type"]];

      for (const type of types) {
        if (!type) continue;
        schemas.push(type);
        if (
          [
            "LocalBusiness", "AccountingService", "FinancialService",
            "ProfessionalService", "TouristInformationCenter", "LodgingBusiness",
            "Restaurant", "Store", "MedicalBusiness", "LegalService",
          ].includes(type)
        ) {
          has_local_business = true;
        }
        if (type === "FAQPage") has_faq = true;
        if (type === "BreadcrumbList") has_breadcrumb = true;
        if (type === "WebSite") has_website = true;
      }
    } catch {
      issues.push("JSON-LD invalide ou mal forme");
    }
  }

  if (schemas.length === 0) issues.push("Aucune donnee structuree Schema.org trouvee");
  if (!has_local_business) issues.push("LocalBusiness manquant — critique pour la visibilite LLM locale");

  return { schemas_found: schemas, has_local_business, has_faq, has_breadcrumb, has_website, issues };
}

// ============================================================
// Readability Analysis (Flesch FR/DE)
// ============================================================

function detectLanguage(text: string): "fr" | "de" | "en" {
  const frWords = ["les", "des", "une", "pour", "dans", "avec", "vous", "nous", "votre", "notre"];
  const deWords = ["die", "der", "das", "und", "für", "mit", "sie", "ihr", "ihre", "wir"];
  const words = text.toLowerCase().split(/\s+/).slice(0, 500); // sample first 500 words

  const frScore = words.filter((w) => frWords.includes(w)).length;
  const deScore = words.filter((w) => deWords.includes(w)).length;

  if (deScore > frScore && deScore > 5) return "de";
  if (frScore > 5) return "fr";
  return "en";
}

function countSyllables(word: string, lang: "fr" | "de" | "en"): number {
  const vowels = lang === "de" ? /[aeiouäöüy]/gi : /[aeiouéèêëàâùûîïôy]/gi;
  const matches = word.match(vowels);
  return Math.max(1, matches?.length ?? 1);
}

function analyzeReadability(text: string): ReadabilityData {
  const lang = detectLanguage(text);
  const cleanText = text.replace(/\s+/g, " ").trim();
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  if (words.length < 50) {
    return {
      flesch_score: 0,
      flesch_level: "Contenu insuffisant",
      lang_detected: lang,
      avg_sentence_length: 0,
      avg_word_length: 0,
      word_count: words.length,
    };
  }

  const avgSentenceLength = words.length / Math.max(sentences.length, 1);
  const avgSyllables = words.reduce((sum, w) => sum + countSyllables(w, lang), 0) / words.length;
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  // Flesch FR (Kandel & Moles 1958): 207 - 1.015 * ASL - 73.6 * ASW
  const fleschScore =
    lang === "fr"
      ? Math.max(0, Math.min(100, Math.round(207 - 1.015 * avgSentenceLength - 73.6 * avgSyllables)))
      : Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllables)));

  const fleschLevel =
    fleschScore >= 70 ? "Tres facile a lire" :
    fleschScore >= 60 ? "Facile" :
    fleschScore >= 50 ? "Assez facile" :
    fleschScore >= 40 ? "Standard" :
    fleschScore >= 30 ? "Assez difficile" :
    "Difficile";

  return {
    flesch_score: fleschScore,
    flesch_level: fleschLevel,
    lang_detected: lang,
    avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
    avg_word_length: Math.round(avgWordLength * 10) / 10,
    word_count: words.length,
  };
}

// ============================================================
// Robots.txt checker
// ============================================================

```


## `src/lib/providers/seo/semrush-provider.ts`

```typescript
import type { SeoProvider } from "./seo-provider";
import type { SeoData, CompetitorData } from "@/types/audit";

/**
 * SemrushProvider — DEPRECATED since v2.1 (2026-04-23).
 *
 * @deprecated Semrush non disponible depuis avril 2026.
 * Utiliser le Wizard Ultra (6 blocs A-F) avec AWT + GSC + GA4 + Moz + SimilarWeb + Seobility.
 * Voir POLE-PERFORMANCE.md v2.1 section 6.
 *
 * Ce provider reste en place pour la rétro-compatibilité des audits archivés
 * mais lève une erreur à l'initialisation si utilisé.
 */
export class SemrushProvider implements SeoProvider {
  readonly name = "semrush" as const;

  constructor() {
    if (!process.env.SEMRUSH_API_KEY) {
      throw new Error(
        "SEMRUSH_API_KEY is required. Set SEO_PROVIDER=free to use Palier 1."
      );
    }
  }

  async getDomainOverview(_domain: string): Promise<SeoData> {
    // TODO: Phase 2 — Implement Semrush API v3 integration
    // Endpoints: Domain Overview, Organic Research
    throw new Error("SemrushProvider not yet implemented. Switch to SEO_PROVIDER=free.");
  }

  async getCompetitors(_domain: string): Promise<CompetitorData[] | null> {
    // TODO: Phase 2 — Implement Semrush Competitors endpoint
    throw new Error("SemrushProvider not yet implemented. Switch to SEO_PROVIDER=free.");
  }
}

```


## `src/lib/providers/seo/seo-provider.ts`

```typescript
import type { SeoData, CompetitorData } from "@/types/audit";

/**
 * Interface abstraite pour les providers SEO.
 *
 * Palier 1 (Construction) : FreeSeoProvider — HTML analysis + PageSpeed API
 * Palier 2 (Production)   : SemrushProvider — Semrush API v3
 *
 * Le code métier ne connaît que cette interface.
 * Le swap se fait par configuration (env var SEO_PROVIDER).
 */
export interface SeoProvider {
  readonly name: "free" | "semrush";

  /**
   * Récupère les données SEO d'un domaine.
   * En Palier 1, les champs Semrush-only (organic_traffic, backlinks, etc.) sont null.
   */
  getDomainOverview(domain: string): Promise<SeoData>;

  /**
   * Récupère les concurrents organiques d'un domaine.
   * Retourne null en Palier 1 (pas de données disponibles).
   */
  getCompetitors(domain: string): Promise<CompetitorData[] | null>;
}

/**
 * Factory : instancie le bon provider selon la configuration.
 */
export async function createSeoProvider(): Promise<SeoProvider> {
  const providerName = process.env.SEO_PROVIDER || "free";

  switch (providerName) {
    case "semrush": {
      const { SemrushProvider } = await import("./semrush-provider");
      return new SemrushProvider();
    }
    case "free":
    default: {
      const { FreeSeoProvider } = await import("./free-seo-provider");
      return new FreeSeoProvider();
    }
  }
}

```


## `src/lib/parsers/semrush-parser.ts`

```typescript
// ============================================================
// Semrush CSV Parser — LEGACY (deprecated v2.1)
// ============================================================
// @deprecated Since v2.1 (2026-04-23), Semrush is replaced by AWT + GSC + GA4 + Moz + SimilarWeb + Seobility.
// Kept for backward compatibility with archived audits. New audits should use the Wizard Ultra (Phase 2C).
// ============================================================

export interface SemrushData {
  // Domain overview
  organic_traffic: number | null;
  organic_keywords: number | null;
  authority_score: number | null;
  backlinks_total: number | null;
  referring_domains: number | null;
  rank_ch: number | null;

  // Top keywords
  top_keywords: Array<{
    keyword: string;
    position: number;
    volume: number;
    url: string;
    type: "brand" | "organic";
  }>;

  // Competitors
  competitors: Array<{
    domain: string;
    rank: number | null;
    keywords: number | null;
    traffic: number | null;
    backlinks: number | null;
    authority_score: number | null;
  }>;

  // Site audit issues
  audit_issues: Array<{
    severity: "error" | "warning" | "notice";
    description: string;
    count: number;
  }>;
}

// ---------------------------------------------------------------------------
// Lightweight CSV helpers (no external library)
// ---------------------------------------------------------------------------

/** Detect delimiter: semicolon or comma */
function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

/** Split a CSV line respecting quoted fields */
function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Parse a block of CSV text into rows of key-value objects */
function parseCsvBlock(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/['"]/g, "").trim()
  );

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

/** Parse a numeric value, returning null when not parseable */
function num(val: string | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Find a header key in a row (case-insensitive, partial match) */
function findKey(row: Record<string, string>, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    const found = keys.find(
      (k) => k === lower || k.includes(lower) || lower.includes(k)
    );
    if (found && row[found] !== undefined) return row[found];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// CSV type detection based on headers
// ---------------------------------------------------------------------------

type CsvType = "organic_positions" | "backlinks" | "traffic" | "site_audit" | "competitors" | "gap" | "unknown";

function detectCsvType(headerLine: string): CsvType {
  const lower = headerLine.toLowerCase();
  if (lower.includes("position") && (lower.includes("keyword") || lower.includes("mot"))) return "organic_positions";
  if (lower.includes("backlink") || lower.includes("source url") || lower.includes("referring")) return "backlinks";
  if (lower.includes("authority score") && lower.includes("domain")) return "competitors";
  if (lower.includes("traffic") && lower.includes("domain")) return "competitors";
  if (lower.includes("organic traffic") || lower.includes("trafic")) return "traffic";
  if (lower.includes("severity") || lower.includes("issue") || lower.includes("audit")) return "site_audit";
  if (lower.includes("common keywords") || lower.includes("gap")) return "gap";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Individual section parsers
// ---------------------------------------------------------------------------

function parseOrganicPositions(
  rows: Array<Record<string, string>>,
  data: SemrushData,
  brandDomain?: string
): void {
  for (const row of rows) {
    const keyword = findKey(row, "keyword", "mot-clé", "mot_cle", "query") || "";
    const position = num(findKey(row, "position", "pos", "rang"));
    const volume = num(findKey(row, "search volume", "volume", "vol"));
    const url = findKey(row, "url", "landing page", "page") || "";

    if (keyword && position !== null) {
      // Simple brand detection: keyword contains domain root or looks branded
      const domainRoot = brandDomain
        ? brandDomain.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]/gi, "")
        : "";
      const isBrand =
        domainRoot.length > 2 &&
        keyword.toLowerCase().replace(/[^a-z0-9]/g, "").includes(domainRoot.toLowerCase());

      data.top_keywords.push({
        keyword,
        position: position,
        volume: volume ?? 0,
        url,
        type: isBrand ? "brand" : "organic",
      });
    }
  }

  // Also extract overview metrics from first row if available
  if (rows.length > 0) {
    const first = rows[0];
    if (!data.organic_keywords) {
      data.organic_keywords = rows.length; // number of keyword rows = keyword count
    }
  }
}

function parseBacklinks(
  rows: Array<Record<string, string>>,
  data: SemrushData
): void {
  // Backlink exports typically list individual links — count them
  if (!data.backlinks_total) {
    data.backlinks_total = rows.length;
  }

  // Count unique referring domains
  const domains = new Set<string>();
  for (const row of rows) {
    const source = findKey(row, "source url", "source", "referring url", "from url") || "";
    try {
      const domain = new URL(source.startsWith("http") ? source : `https://${source}`).hostname;
      domains.add(domain);
    } catch {
      // skip
    }
  }
  if (domains.size > 0 && !data.referring_domains) {
    data.referring_domains = domains.size;
  }
}

function parseCompetitors(
  rows: Array<Record<string, string>>,
  data: SemrushData
): void {
  for (const row of rows) {
    const domain = findKey(row, "domain", "competitor", "site", "url") || "";
    if (!domain) continue;

    data.competitors.push({
      domain,
      rank: num(findKey(row, "rank", "rang", "rank_ch", "position")),
      keywords: num(findKey(row, "keywords", "mots-clés", "organic keywords", "mots_cles")),
      traffic: num(findKey(row, "traffic", "trafic", "organic traffic", "visits")),
      backlinks: num(findKey(row, "backlinks", "liens", "total backlinks")),
      authority_score: num(findKey(row, "authority score", "as", "score")),
    });
  }

  // Extract domain overview from the first row if it's our domain
  if (rows.length > 0) {
    const first = rows[0];
    const traffic = num(findKey(first, "traffic", "trafic", "organic traffic"));
    const keywords = num(findKey(first, "keywords", "mots-clés", "organic keywords"));
    const as_score = num(findKey(first, "authority score", "as"));
    const backlinks = num(findKey(first, "backlinks", "liens"));
    const rank = num(findKey(first, "rank", "rang", "rank_ch"));

    if (traffic !== null && !data.organic_traffic) data.organic_traffic = traffic;
    if (keywords !== null && !data.organic_keywords) data.organic_keywords = keywords;
    if (as_score !== null && !data.authority_score) data.authority_score = as_score;
    if (backlinks !== null && !data.backlinks_total) data.backlinks_total = backlinks;
    if (rank !== null && !data.rank_ch) data.rank_ch = rank;
  }
}

function parseSiteAudit(
  rows: Array<Record<string, string>>,
  data: SemrushData
): void {
  for (const row of rows) {
    const description =
      findKey(row, "issue", "description", "problème", "check", "name") || "";
    const severityRaw = (
      findKey(row, "severity", "type", "level", "priorité", "priority") || "notice"
    ).toLowerCase();
    const count = num(findKey(row, "count", "pages", "occurrences", "nombre")) ?? 1;

    let severity: "error" | "warning" | "notice" = "notice";
    if (severityRaw.includes("err") || severityRaw.includes("critical") || severityRaw.includes("high")) {
      severity = "error";
    } else if (severityRaw.includes("warn") || severityRaw.includes("medium") || severityRaw.includes("moy")) {
      severity = "warning";
    }

    if (description) {
      data.audit_issues.push({ severity, description, count });
    }
  }
}

function parseTrafficOverview(
  rows: Array<Record<string, string>>,
  data: SemrushData
): void {
  if (rows.length === 0) return;
  // Traffic overview typically has one row or time-series; use the last row
  const row = rows[rows.length - 1];
  if (!data.organic_traffic) {
    data.organic_traffic = num(findKey(row, "organic traffic", "traffic", "trafic", "visits"));
  }
  if (!data.organic_keywords) {
    data.organic_keywords = num(findKey(row, "keywords", "mots-clés", "organic keywords"));
  }
  if (!data.authority_score) {
    data.authority_score = num(findKey(row, "authority score", "as"));
  }
  if (!data.rank_ch) {
    data.rank_ch = num(findKey(row, "rank", "rang", "rank_ch"));
  }
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse one or more Semrush CSV exports into a unified SemrushData structure.
 * Supports multiple CSVs concatenated (separated by blank lines) or a single CSV.
 */
export function parseSemrushCsv(csvContent: string): SemrushData {
  const data: SemrushData = {
    organic_traffic: null,
    organic_keywords: null,
    authority_score: null,
    backlinks_total: null,
    referring_domains: null,
    rank_ch: null,
    top_keywords: [],
    competitors: [],
    audit_issues: [],
  };

  // Strip BOM
  const content = csvContent.replace(/^\uFEFF/, "");

  // Split into blocks separated by 2+ blank lines (multiple CSVs concatenated)
  const blocks = content
    .split(/\n\s*\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  // If no multi-block split found, treat entire content as one block
  const csvBlocks = blocks.length > 0 ? blocks : [content];

  for (const block of csvBlocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 1) continue;

    const headerLine = lines[0];
    const csvType = detectCsvType(headerLine);
    const rows = parseCsvBlock(block);

    switch (csvType) {
      case "organic_positions":
        parseOrganicPositions(rows, data);
        break;
      case "backlinks":
        parseBacklinks(rows, data);
        break;
      case "competitors":
        parseCompetitors(rows, data);
        break;
      case "site_audit":
        parseSiteAudit(rows, data);
        break;
      case "traffic":
        parseTrafficOverview(rows, data);
        break;
      case "gap":
        // Gap analysis can contribute to competitors
        parseCompetitors(rows, data);
        break;
      case "unknown":
        // Try to extract any overview metrics we can
        if (rows.length > 0) {
          parseTrafficOverview(rows, data);
        }
        break;
    }
  }

  return data;
}

```

