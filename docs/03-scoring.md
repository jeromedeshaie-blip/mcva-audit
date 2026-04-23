# 03 — Scoring moteur

**Module** : 03 — Scoring moteur
**Version** : 2.1 (tag `v2.1-release`)

Moteur de scoring 7 thèmes × 205 critères. Poids centralisés v2.1, LLM-as-scorer, mock pour dryrun.

---

## `src/lib/scoring/constants.ts`

```typescript
/**
 * MCVA Audit — Scoring constants v2.1
 *
 * Centralized source of truth for all scoring weights, thresholds, and labels.
 * Aligned with POLE-PERFORMANCE.md v2.1 (2026-04-23).
 *
 * ⚠️ DO NOT modify these values without updating POLE-PERFORMANCE.md.
 * ⚠️ Score GEO™ is proprietary MCVA — jamais gonflé pour raisons commerciales.
 */

// ============================================================
// Versioning
// ============================================================

/** Stored alongside every score for reproducibility audit trails. */
export const SCORING_VERSION = "2.1" as const;

/** Date de la release v2.1 (POLE-PERFORMANCE.md). */
export const SCORING_VERSION_DATE = "2026-04-23" as const;

// ============================================================
// 7 themes — poids global audit (section 2 POLE-PERF)
// ============================================================

/**
 * NOTE: The AuditTheme type is defined in src/types/audit.ts (source of truth).
 * We use literal keys here to avoid circular imports.
 */

export const THEME_WEIGHTS = {
  seo: 0.20,
  geo: 0.25,
  perf: 0.12,
  a11y: 0.12,
  tech: 0.08,
  contenu: 0.15,
  rgesn: 0.08,
} as const;

/** Verify weights sum to 1.0 at import time. */
const _THEME_SUM = Object.values(THEME_WEIGHTS).reduce((s, w) => s + w, 0);
if (Math.abs(_THEME_SUM - 1.0) > 0.001) {
  throw new Error(`THEME_WEIGHTS must sum to 1.0, got ${_THEME_SUM}`);
}

export const THEME_FULL_LABELS = {
  seo: "SEO — Référencement naturel",
  geo: "GEO — Visibilité IA générative",
  perf: "Performance — Core Web Vitals",
  a11y: "Accessibilité — RGAA 4.1.2 / WCAG 2.1 AA",
  tech: "Technique — Stack, sécurité, accès IA",
  contenu: "Contenu — Qualité éditoriale & citabilité LLM",
  rgesn: "Éco-conception — RGESN",
} as const;

/** Number of criteria per theme. Total = 205. */
export const THEME_CRITERIA_COUNT = {
  seo: 80,     // CORE-EEAT
  geo: 40,     // CITE (+ Score GEO™ composite)
  perf: 15,
  a11y: 20,
  tech: 15,
  contenu: 15,
  rgesn: 20,
} as const;

// ============================================================
// CORE-EEAT — 8 dimensions pondérées (SEO, 80 critères)
// ============================================================

export const CORE_EEAT_WEIGHTS = {
  C: 0.15,    // Contextual Clarity
  O: 0.15,    // Optimization Quality
  R: 0.10,    // Reputation & References
  E: 0.10,    // Engagement Signals
  Exp: 0.15,  // Experience
  Ept: 0.15,  // Expertise
  A: 0.10,    // Authoritativeness
  T: 0.10,    // Trustworthiness
} as const;

const _CORE_EEAT_SUM = Object.values(CORE_EEAT_WEIGHTS).reduce((s, w) => s + w, 0);
if (Math.abs(_CORE_EEAT_SUM - 1.0) > 0.001) {
  throw new Error(`CORE_EEAT_WEIGHTS must sum to 1.0, got ${_CORE_EEAT_SUM}`);
}

export const CORE_EEAT_LABELS = {
  C: "Contextual Clarity",
  O: "Optimization Quality",
  R: "Reputation & References",
  E: "Engagement Signals",
  Exp: "Experience",
  Ept: "Expertise",
  A: "Authoritativeness",
  T: "Trustworthiness",
} as const;

// ============================================================
// CITE — 4 dimensions équipondérées (GEO, 40 critères)
// ============================================================

export const CITE_WEIGHTS = {
  C: 0.25,    // Crédibilité
  I: 0.25,    // Influence
  T: 0.25,    // Trust
  E: 0.25,    // Engagement
} as const;

const _CITE_SUM = Object.values(CITE_WEIGHTS).reduce((s, w) => s + w, 0);
if (Math.abs(_CITE_SUM - 1.0) > 0.001) {
  throw new Error(`CITE_WEIGHTS must sum to 1.0, got ${_CITE_SUM}`);
}

export const CITE_LABELS = {
  C: "Crédibilité",
  I: "Influence",
  T: "Trust",
  E: "Engagement",
} as const;

// ============================================================
// Score GEO™ — 4 composantes × 25 points (section 5 POLE-PERF)
// ============================================================

export const GEO_SCORE_COMPONENTS = {
  presence: 25,        // Mention Rate — % prompts avec la marque citée
  exactitude: 25,      // % citations factuellement correctes (vs KB client)
  sentiment: 25,       // Score sentiment moyen des citations (-1 à +1 → 0-25)
  recommendation: 25,  // Source Rate — % prompts avec recommandation explicite
} as const;

export const GEO_SCORE_MAX = Object.values(GEO_SCORE_COMPONENTS).reduce((s, v) => s + v, 0);
// → 100

/** Seuils d'interprétation Score GEO™ (section 5 POLE-PERF). */
export const GEO_SCORE_THRESHOLDS = [
  { min: 0, max: 25, level: "invisible", label: "Invisible",
    description: "La marque n'existe pas pour les LLMs" },
  { min: 26, max: 50, level: "emergent", label: "Émergent",
    description: "Présence sporadique, pas de fiabilité" },
  { min: 51, max: 75, level: "visible", label: "Visible",
    description: "Présence régulière, citée en alternative" },
  { min: 76, max: 100, level: "leader", label: "Leader",
    description: "Référence sectorielle, citée en premier" },
] as const;

export type GeoScoreLevel = typeof GEO_SCORE_THRESHOLDS[number]["level"];

/** Retourne le niveau d'interprétation pour un Score GEO™ donné. */
export function getGeoScoreLevel(score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    GEO_SCORE_THRESHOLDS.find((t) => clamped >= t.min && clamped <= t.max) ||
    GEO_SCORE_THRESHOLDS[0]
  );
}

// ============================================================
// Item scoring — statut/score (section 8 étape 3 POLE-PERF)
// ============================================================

export const ITEM_STATUS_RANGES = {
  fail: { min: 0, max: 24, label: "Non satisfait ou absent" },
  partial: { min: 25, max: 74, label: "Partiellement satisfait" },
  pass: { min: 75, max: 100, label: "Pleinement satisfait" },
} as const;

export type ItemStatus = keyof typeof ITEM_STATUS_RANGES;

/** Convert a numeric score (0-100) to its status bucket. */
export function scoreToStatus(score: number): ItemStatus {
  if (score >= ITEM_STATUS_RANGES.pass.min) return "pass";
  if (score >= ITEM_STATUS_RANGES.partial.min) return "partial";
  return "fail";
}

// ============================================================
// LLM snapshots pinned (section 5 POLE-PERF)
// ============================================================

export const LLM_SNAPSHOTS = {
  openai: "gpt-4o-2024-11-20",
  anthropic: "claude-sonnet-4-5-20250929",
  perplexity: "sonar-pro",
  gemini: "gemini-2.5-pro",
} as const;

// ============================================================
// Vercel deployment constraints — affects batching
// ============================================================

/**
 * Vercel function timeout per plan.
 * Hobby = 60s max — force small batches.
 * Pro   = 300s max — allows bigger batches.
 *
 * Read from env: set VERCEL_PLAN=pro to unlock larger batches.
 * Defaults to "hobby" for safety.
 */
export const VERCEL_PLAN =
  (process.env.NEXT_PUBLIC_VERCEL_PLAN as "hobby" | "pro") || "hobby";

export const VERCEL_MAX_DURATION_SECONDS = VERCEL_PLAN === "pro" ? 300 : 60;

/**
 * CORE-EEAT batching: how many dimensions to score per API call.
 * Hobby: 2 per call → 4 calls total for 8 dims
 * Pro:   4 per call → 2 calls total for 8 dims
 */
export const CORE_EEAT_BATCH_SIZE = VERCEL_PLAN === "pro" ? 4 : 2;

/**
 * CITE batching: 4 dimensions total.
 * Hobby: 2 per call → 2 calls
 * Pro:   4 per call → 1 call
 */
export const CITE_BATCH_SIZE = VERCEL_PLAN === "pro" ? 4 : 2;

// ============================================================
// Source traceability (section 6.5 POLE-PERF)
// ============================================================

export type DataSource =
  | "external_verified"  // blocs A-F importés
  | "html_estimation"    // scraping HTML seul
  | "not_evaluated";     // thème non demandé

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  external_verified: "Données vérifiées",
  html_estimation: "Estimation HTML",
  not_evaluated: "Non évalué",
};

// ============================================================
// External data blocks (section 6.4 POLE-PERF)
// ============================================================

export const EXTERNAL_BLOCKS = {
  A: { name: "Ahrefs Webmaster Tools", short: "AWT", criteria: ["CI-I01", "CI-I02", "CI-I03", "CI-I04", "R03", "R04"] as string[] },
  B: { name: "Google Search Console", short: "GSC", criteria: ["O01", "O02", "O03", "E05"] as string[] },
  C: { name: "Google Analytics 4", short: "GA4", criteria: ["E01", "E02", "E04"] as string[] },
  D: { name: "Concurrents (Moz + SimilarWeb + Seobility)", short: "Concurrents", criteria: [] as string[] },
  E: { name: "Google Keyword Planner CH", short: "KeywordPlanner", criteria: [] as string[] },
  F: { name: "LLM Watch dashboard", short: "LLM Watch", criteria: ["score_geo", "score_presence", "score_exactitude", "score_sentiment", "score_recommendation"] as string[] },
} as const;

export type ExternalBlockLetter = keyof typeof EXTERNAL_BLOCKS;

/**
 * Détermine si un audit Ultra peut être lancé selon les blocs disponibles.
 * Section 6.6 POLE-PERF : A+B+F = mode dégradé acceptable.
 */
export function canRunUltra(availableBlocks: ExternalBlockLetter[]): {
  canRun: boolean;
  mode: "full" | "degraded" | "geo_only" | "blocked";
  missingBlocks: ExternalBlockLetter[];
  reason: string;
} {
  const has = (l: ExternalBlockLetter) => availableBlocks.includes(l);
  const allBlocks: ExternalBlockLetter[] = ["A", "B", "C", "D", "E", "F"];
  const missing = allBlocks.filter((l) => !has(l));

  if (missing.length === 0) {
    return { canRun: true, mode: "full", missingBlocks: [], reason: "Ultra complet" };
  }
  if (has("A") && has("B") && has("F")) {
    return {
      canRun: true, mode: "degraded", missingBlocks: missing,
      reason: "Mode dégradé acceptable (A+B+F minimum)",
    };
  }
  if (has("F") && !has("A") && !has("B")) {
    return {
      canRun: false, mode: "geo_only", missingBlocks: missing,
      reason: "Seul le bloc F disponible → dégrader vers audit thématique GEO",
    };
  }
  return {
    canRun: false, mode: "blocked", missingBlocks: missing,
    reason: "Blocs insuffisants pour un Ultra (minimum A+B+F)",
  };
}

```


## `src/lib/scoring/scorer.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { AuditItem, CoreEeatDimension, CiteDimension, ItemStatus, QualityLevel } from "@/types/audit";
import { CORE_EEAT_ITEMS, EXPRESS_ITEMS, type CoreEeatItemDef } from "./core-eeat-items";
import { CITE_ITEMS, CITE_EXPRESS_ITEMS, type CiteItemDef } from "./cite-items";
import { QUALITY_CONFIG } from "@/lib/constants";
import { CORE_EEAT_WEIGHTS, CITE_WEIGHTS } from "./constants";

/**
 * Scoring CORE-EEAT via LLM.
 *
 * Stratégie : 1 appel LLM par dimension (8 appels parallèles en mode complet,
 * 8 appels avec moins d'items en mode express).
 * Chaque appel évalue les items d'une dimension sur le HTML scrapé.
 *
 * temperature: 0 pour maximiser la reproductibilité.
 */

const VALID_STATUSES: ItemStatus[] = ["pass", "partial", "fail"];

function validateStatus(status: unknown): ItemStatus {
  if (typeof status === "string") {
    const lower = status.toLowerCase().trim();
    if (VALID_STATUSES.includes(lower as ItemStatus)) {
      return lower as ItemStatus;
    }
  }
  return "partial";
}

interface LlmScoredItem {
  code?: string;
  status?: string;
  score?: number | string;
  notes?: string;
}

function safeParseJson(text: string): LlmScoredItem[] | null {
  // Try parsing the full text first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as LlmScoredItem[];
  } catch {
    // fall through to regex
  }

  // Try non-greedy regex extraction
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed)) return parsed as LlmScoredItem[];
  } catch {
    // fall through
  }

  // Try greedy as last resort (for nested arrays)
  const greedyMatch = text.match(/\[[\s\S]*\]/);
  if (!greedyMatch || greedyMatch[0] === jsonMatch?.[0]) return null;

  try {
    const parsed = JSON.parse(greedyMatch[0]);
    if (Array.isArray(parsed)) return parsed as LlmScoredItem[];
  } catch {
    // all parsing attempts failed
  }

  return null;
}

function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic();
}

export async function scoreItems(
  html: string,
  url: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  if (!html || html.trim().length < 50) {
    console.warn("[scorer] HTML trop court ou vide, scoring impossible");
    return [];
  }

  const items = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;

  // Group items by dimension
  const byDimension = new Map<string, CoreEeatItemDef[]>();
  for (const item of items) {
    const existing = byDimension.get(item.dimension) || [];
    existing.push(item);
    byDimension.set(item.dimension, existing);
  }

  // Score each dimension in parallel
  const config = QUALITY_CONFIG[quality];
  const notesDepth = config.notesDepth ?? "concise";
  const dimensionResults = await Promise.allSettled(
    Array.from(byDimension.entries()).map(([dimension, dimensionItems]) =>
      scoreDimension(html, url, dimension as CoreEeatDimension, dimensionItems, config.scoringModel, config.htmlMaxChars, config.maxTokensScoring, notesDepth)
    )
  );

  const results: Omit<AuditItem, "id" | "audit_id">[] = [];
  let failedDimensions = 0;

  for (const result of dimensionResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    } else {
      failedDimensions++;
      console.error("[scorer] Dimension scoring failed:", result.reason?.message || result.reason);
    }
  }

  if (failedDimensions > 0) {
    console.warn(`[scorer] ${failedDimensions}/${byDimension.size} CORE-EEAT dimensions failed`);
  }

  return results;
}

/**
 * Score a single CORE-EEAT dimension — exported for Inngest step-per-dimension pattern.
 */
export async function scoreOneDimension(
  html: string,
  url: string,
  dimension: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const allItems = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;
  const dimensionItems = allItems.filter((i) => i.dimension === dimension);
  if (dimensionItems.length === 0) return [];

  const config = QUALITY_CONFIG[quality];
  const notesDepth = config.notesDepth ?? "concise";
  return scoreDimension(html, url, dimension as CoreEeatDimension, dimensionItems, config.scoringModel, config.htmlMaxChars, config.maxTokensScoring, notesDepth);
}

/**
 * Score a single CITE dimension — exported for Inngest step-per-dimension pattern.
 */
export async function scoreOneCiteDimension(
  html: string,
  url: string,
  dimension: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const allItems = mode === "express" ? CITE_EXPRESS_ITEMS : CITE_ITEMS;
  const dimensionItems = allItems.filter((i) => i.dimension === dimension);
  if (dimensionItems.length === 0) return [];

  const config = QUALITY_CONFIG[quality];
  const notesDepth = config.notesDepth ?? "concise";
  return scoreCiteDimension(html, url, dimension as CiteDimension, dimensionItems, config.scoringModel, config.htmlMaxChars, config.maxTokensScoring, notesDepth);
}

/**
 * Get all unique dimensions for a given mode/framework.
 */
export function getCoreEeatDimensions(mode: "express" | "full"): string[] {
  const items = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;
  return [...new Set(items.map((i) => i.dimension))];
}

export function getCiteDimensions(mode: "express" | "full"): string[] {
  const items = mode === "express" ? CITE_EXPRESS_ITEMS : CITE_ITEMS;
  return [...new Set(items.map((i) => i.dimension))];
}

async function scoreDimension(
  html: string,
  url: string,
  dimension: CoreEeatDimension,
  items: CoreEeatItemDef[],
  model: string = "claude-sonnet-4-6",
  htmlMaxChars: number = 50000,
  maxTokens: number = 2000,
  notesDepth: "concise" | "detailed" = "concise"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const truncatedHtml = html.slice(0, htmlMaxChars);

  const itemsList = items
    .map(
      (item) =>
        `- ${item.code}: ${item.label} — ${item.description}`
    )
    .join("\n");

  const notesInstruction = notesDepth === "detailed"
    ? `"notes": "Analyse détaillée en 3-5 phrases : (1) constat factuel observé dans le HTML, (2) impact sur le référencement/visibilité IA, (3) recommandation concrète avec exemple de code/config si applicable"`
    : `"notes": "Explication concise en français (1-2 phrases)"`;

  const prompt = `Tu es un auditeur SEO/GEO expert. Analyse cette page web et évalue chaque critère ci-dessous.

URL: ${url}

HTML de la page (tronqué si nécessaire):
\`\`\`html
${truncatedHtml}
\`\`\`

Critères à évaluer (dimension ${dimension}):
${itemsList}

Pour CHAQUE critère, réponds en JSON avec un tableau d'objets:
[
  {
    "code": "C01",
    "status": "pass" | "partial" | "fail",
    "score": 0-100,
    ${notesInstruction}
  }
]

Règles de scoring:
- "pass" = 75-100 : le critère est pleinement satisfait
- "partial" = 25-74 : le critère est partiellement satisfait
- "fail" = 0-24 : le critère n'est pas satisfait
- Sois factuel et précis. Base ton évaluation uniquement sur ce qui est observable dans le HTML.
- Pour les critères GEO-First, sois particulièrement attentif à la compatibilité avec les moteurs IA.

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ni après.`;

  const anthropic = createAnthropicClient();

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content[0];
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

  if (!text) {
    console.warn(`[scorer] Empty response for CORE-EEAT dimension ${dimension} (model: ${model})`);
    return makeFallbackItems(items, "core_eeat");
  }

  // Parse JSON response with robust fallbacks
  const parsed = safeParseJson(text);
  if (!parsed) {
    console.warn(`[scorer] Failed to parse JSON for CORE-EEAT dimension ${dimension}`);
    return makeFallbackItems(items, "core_eeat");
  }

  // Map parsed results back to items
  return items.map((item) => {
    const found = parsed.find((p: any) => p?.code === item.code);

    const score = typeof found?.score === "number"
      ? Math.min(100, Math.max(0, Math.round(found.score)))
      : typeof found?.score === "string"
        ? Math.min(100, Math.max(0, Math.round(parseFloat(found.score)) || 50))
        : 50;

    return {
      framework: "core_eeat" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status: validateStatus(found?.status),
      score,
      notes: typeof found?.notes === "string" ? found.notes : null,
      is_geo_first: item.isGeoFirst,
      is_express_item: item.isExpress,
    };
  });
}

/**
 * Calcule les scores agrégés par dimension à partir des items scorés.
 */
export function aggregateScores(
  items: Omit<AuditItem, "id" | "audit_id">[]
): Record<string, number> {
  const byDimension = new Map<string, number[]>();

  for (const item of items) {
    const scores = byDimension.get(item.dimension) || [];
    scores.push(item.score);
    byDimension.set(item.dimension, scores);
  }

  const result: Record<string, number> = {};
  for (const [dim, scores] of byDimension) {
    if (scores.length === 0) continue;
    result[dim] = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
  }

  return result;
}

/**
 * Scoring CITE via LLM — même approche que CORE-EEAT.
 * 1 appel par dimension (4 dimensions), évalue la crédibilité du domaine.
 */
export async function scoreCiteItems(
  html: string,
  url: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  if (!html || html.trim().length < 50) {
    console.warn("[scorer] HTML trop court ou vide, scoring CITE impossible");
    return [];
  }

  const items = mode === "express" ? CITE_EXPRESS_ITEMS : CITE_ITEMS;

  const byDimension = new Map<string, CiteItemDef[]>();
  for (const item of items) {
    const existing = byDimension.get(item.dimension) || [];
    existing.push(item);
    byDimension.set(item.dimension, existing);
  }

  const config = QUALITY_CONFIG[quality];
  const notesDepth = config.notesDepth ?? "concise";
  const dimensionResults = await Promise.allSettled(
    Array.from(byDimension.entries()).map(([dimension, dimensionItems]) =>
      scoreCiteDimension(html, url, dimension as CiteDimension, dimensionItems, config.scoringModel, config.htmlMaxChars, config.maxTokensScoring, notesDepth)
    )
  );

  const results: Omit<AuditItem, "id" | "audit_id">[] = [];
  let failedDimensions = 0;

  for (const result of dimensionResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    } else {
      failedDimensions++;
      console.error("[scorer] CITE dimension scoring failed:", result.reason?.message || result.reason);
    }
  }

  if (failedDimensions > 0) {
    console.warn(`[scorer] ${failedDimensions}/${byDimension.size} CITE dimensions failed`);
  }

  return results;
}

async function scoreCiteDimension(
  html: string,
  url: string,
  dimension: CiteDimension,
  items: CiteItemDef[],
  model: string = "claude-sonnet-4-6",
  htmlMaxChars: number = 50000,
  maxTokens: number = 2000,
  notesDepth: "concise" | "detailed" = "concise"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const truncatedHtml = html.slice(0, htmlMaxChars);

  const dimensionLabels: Record<string, string> = {
    C: "Crédibilité",
    I: "Influence",
    T: "Confiance (Trust)",
    E: "Engagement",
  };

  const itemsList = items
    .map((item) => `- ${item.code}: ${item.label} — ${item.description}`)
    .join("\n");

  const notesInstruction = notesDepth === "detailed"
    ? `"notes": "Analyse détaillée en 3-5 phrases : (1) constat factuel observé dans le HTML, (2) impact sur le référencement/visibilité IA, (3) recommandation concrète avec exemple de code/config si applicable"`
    : `"notes": "Explication concise en français (1-2 phrases)"`;

  const prompt = `Tu es un auditeur spécialisé en crédibilité et autorité de domaine. Analyse cette page web et évalue chaque critère CITE ci-dessous.

URL: ${url}

HTML de la page (tronqué si nécessaire):
\`\`\`html
${truncatedHtml}
\`\`\`

Critères à évaluer (dimension ${dimensionLabels[dimension]} — ${dimension}):
${itemsList}

Pour CHAQUE critère, réponds en JSON avec un tableau d'objets:
[
  {
    "code": "CI-C01",
    "status": "pass" | "partial" | "fail",
    "score": 0-100,
    ${notesInstruction}
  }
]

Règles de scoring:
- "pass" = 75-100 : le critère est pleinement satisfait
- "partial" = 25-74 : le critère est partiellement satisfait
- "fail" = 0-24 : le critère n'est pas satisfait
- Sois factuel et précis. Base ton évaluation sur ce qui est observable dans le HTML et les signaux disponibles.

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ni après.`;

  const anthropic = createAnthropicClient();

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content[0];
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

  if (!text) {
    console.warn(`[scorer] Empty response for CITE dimension ${dimension} (model: ${model})`);
    return makeFallbackItems(items.map(i => ({ ...i, isGeoFirst: false })), "cite");
  }

  const parsed = safeParseJson(text);
  if (!parsed) {
    console.warn(`[scorer] Failed to parse JSON for CITE dimension ${dimension}`);
    return makeFallbackItems(items.map(i => ({ ...i, isGeoFirst: false })), "cite");
  }

  return items.map((item) => {
    const found = parsed.find((p: any) => p?.code === item.code);

    const score = typeof found?.score === "number"
      ? Math.min(100, Math.max(0, Math.round(found.score)))
      : typeof found?.score === "string"
        ? Math.min(100, Math.max(0, Math.round(parseFloat(found.score)) || 50))
        : 50;

    return {
      framework: "cite" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status: validateStatus(found?.status),
      score,
      notes: typeof found?.notes === "string" ? found.notes : null,
      is_geo_first: false,
      is_express_item: item.isExpress,
    };
  });
}

/**
 * Calcule le score SEO consolidé (0-100) à partir des scores CORE-EEAT.
 * Poids centralisés dans ./constants.ts (CORE_EEAT_WEIGHTS).
 */
export function calculateSeoScore(
  coreEeatScores: Record<string, number>
): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const [dim, weight] of Object.entries(CORE_EEAT_WEIGHTS)) {
    if (coreEeatScores[dim] !== undefined) {
      weighted += coreEeatScores[dim] * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
}

/**
 * Calcule le score CITE consolidé (0-100) à partir des scores par dimension.
 * Poids centralisés dans ./constants.ts (CITE_WEIGHTS — 25 % chacune).
 */
export function calculateCiteScore(
  citeScores: Record<string, number>
): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const [dim, weight] of Object.entries(CITE_WEIGHTS)) {
    if (citeScores[dim] !== undefined) {
      weighted += citeScores[dim] * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
}

// --- Helpers ---

function makeFallbackItems(
  items: Array<{ code: string; label: string; dimension: string; isExpress: boolean; isGeoFirst: boolean }>,
  framework: "core_eeat" | "cite"
): Omit<AuditItem, "id" | "audit_id">[] {
  return items.map((item) => ({
    framework,
    dimension: item.dimension,
    item_code: item.code,
    item_label: item.label,
    status: "partial" as ItemStatus,
    score: 50,
    notes: "Scoring automatique non disponible — évaluation manuelle requise.",
    is_geo_first: item.isGeoFirst,
    is_express_item: item.isExpress,
  }));
}

```


## `src/lib/scoring/theme-scorer.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { AuditItem, ItemStatus, QualityLevel, Framework } from "@/types/audit";
import { PERF_ITEMS, PERF_PRE_AUDIT_ITEMS } from "./perf-items";
import { A11Y_ITEMS, A11Y_PRE_AUDIT_ITEMS } from "./a11y-items";
import { RGESN_ITEMS, RGESN_PRE_AUDIT_ITEMS } from "./rgesn-items";
import { TECH_ITEMS, TECH_PRE_AUDIT_ITEMS } from "./tech-items";
import { CONTENU_ITEMS, CONTENU_PRE_AUDIT_ITEMS } from "./contenu-items";
import { QUALITY_CONFIG } from "@/lib/constants";

/**
 * Generic theme scorer — scores items for perf, a11y, rgesn, tech, contenu.
 * Same pattern as CORE-EEAT/CITE scoring but for the 5 new themes.
 */

const VALID_STATUSES: ItemStatus[] = ["pass", "partial", "fail"];

interface ItemDef {
  code: string;
  label: string;
  dimension: string;
  description: string;
}

interface LlmScoredItem {
  code?: string;
  status?: string;
  score?: number | string;
  notes?: string;
}

function validateStatus(status: unknown): ItemStatus {
  if (typeof status === "string") {
    const lower = status.toLowerCase().trim();
    if (VALID_STATUSES.includes(lower as ItemStatus)) return lower as ItemStatus;
  }
  return "partial";
}

function safeParseJson(text: string): LlmScoredItem[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* fallthrough */ }

  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fallthrough */ }
  }

  const greedyMatch = text.match(/\[[\s\S]*\]/);
  if (greedyMatch && greedyMatch[0] !== jsonMatch?.[0]) {
    try {
      const parsed = JSON.parse(greedyMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fallthrough */ }
  }

  return null;
}

// ─── Item registry ───

const THEME_ITEMS: Record<string, { full: ItemDef[]; preAudit: ItemDef[] }> = {
  perf: { full: PERF_ITEMS, preAudit: PERF_PRE_AUDIT_ITEMS },
  a11y: { full: A11Y_ITEMS, preAudit: A11Y_PRE_AUDIT_ITEMS },
  rgesn: { full: RGESN_ITEMS, preAudit: RGESN_PRE_AUDIT_ITEMS },
  tech: { full: TECH_ITEMS, preAudit: TECH_PRE_AUDIT_ITEMS },
  contenu: { full: CONTENU_ITEMS, preAudit: CONTENU_PRE_AUDIT_ITEMS },
};

const THEME_PROMPTS: Record<string, string> = {
  perf: "Tu es un expert en performance web. Évalue les critères de performance suivants en analysant le HTML.",
  a11y: "Tu es un expert en accessibilité web (RGAA/WCAG). Évalue les critères d'accessibilité suivants en analysant le HTML.",
  rgesn: "Tu es un expert en éco-conception numérique (RGESN). Évalue les critères d'éco-conception suivants en analysant le HTML. Si un critère n'est pas auditable à distance, mets le statut 'partial' avec une note explicative.",
  tech: "Tu es un expert en audit technique web. Évalue les critères techniques suivants en analysant le HTML et les en-têtes HTTP.",
  contenu: "Tu es un expert en stratégie de contenu web. Évalue les critères de qualité de contenu suivants en analysant le HTML.",
};

// ─── Main scoring function ───

/**
 * Score all items for a given theme.
 * @param theme - "perf" | "a11y" | "rgesn" | "tech" | "contenu"
 * @param html - Scraped HTML
 * @param url - Audit URL
 * @param mode - "express" (pre_audit) or "full" (complet/ultra)
 * @param quality - LLM quality tier
 */
export async function scoreTheme(
  theme: string,
  html: string,
  url: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const registry = THEME_ITEMS[theme];
  if (!registry) throw new Error(`Unknown theme: ${theme}`);

  const items = mode === "express" ? registry.preAudit : registry.full;
  if (items.length === 0) return [];

  // Group by dimension for parallel scoring
  const byDimension = new Map<string, ItemDef[]>();
  for (const item of items) {
    const arr = byDimension.get(item.dimension) || [];
    arr.push(item);
    byDimension.set(item.dimension, arr);
  }

  const config = QUALITY_CONFIG[quality];
  const truncatedHtml = html.slice(0, config.htmlMaxChars);
  const notesDepth = config.notesDepth ?? "concise";

  // Score dimensions in batches of 3 to avoid overwhelming the API
  // (ultra + A11y = 12 dimensions; all 12 in parallel would timeout in 60s)
  const BATCH_SIZE = 3;
  const dimensionEntries = Array.from(byDimension.entries());
  const allItems: Omit<AuditItem, "id" | "audit_id">[] = [];
  let failed = 0;

  for (let i = 0; i < dimensionEntries.length; i += BATCH_SIZE) {
    const batch = dimensionEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(([dimension, dimItems]) =>
        scoreDimensionItems(
          theme,
          dimension,
          dimItems,
          truncatedHtml,
          url,
          config.scoringModel,
          config.maxTokensScoring,
          notesDepth
        )
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      } else {
        failed++;
        console.error(`[theme-scorer][${theme}] Dimension failed:`, result.reason?.message);
      }
    }
  }

  if (failed > 0) {
    console.warn(`[theme-scorer][${theme}] ${failed}/${byDimension.size} dimensions failed`);
  }

  return allItems;
}

/**
 * Score a single dimension within a theme — for step-by-step API flow.
 */
export async function scoreThemeDimension(
  theme: string,
  dimension: string,
  html: string,
  url: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const registry = THEME_ITEMS[theme];
  if (!registry) throw new Error(`Unknown theme: ${theme}`);

  const items = mode === "express" ? registry.preAudit : registry.full;
  const dimItems = items.filter((i) => i.dimension === dimension);
  if (dimItems.length === 0) return [];

  const config = QUALITY_CONFIG[quality];
  const truncatedHtml = html.slice(0, config.htmlMaxChars);
  const notesDepth = config.notesDepth ?? "concise";

  return scoreDimensionItems(
    theme,
    dimension,
    dimItems,
    truncatedHtml,
    url,
    config.scoringModel,
    config.maxTokensScoring,
    notesDepth
  );
}

/**
 * Get all unique dimensions for a theme.
 */
export function getThemeDimensions(theme: string, mode: "express" | "full"): string[] {
  const registry = THEME_ITEMS[theme];
  if (!registry) return [];
  const items = mode === "express" ? registry.preAudit : registry.full;
  return [...new Set(items.map((i) => i.dimension))];
}

// ─── Internal ───

async function scoreDimensionItems(
  theme: string,
  dimension: string,
  items: ItemDef[],
  html: string,
  url: string,
  model: string,
  maxTokens: number,
  notesDepth: "concise" | "detailed" = "concise"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const anthropic = new Anthropic();
  const systemPrompt = THEME_PROMPTS[theme] || "Tu es un auditeur web expert.";

  const criteriaList = items
    .map((i) => `- ${i.code}: ${i.label} — ${i.description}`)
    .join("\n");

  const notesInstruction = notesDepth === "detailed"
    ? `"notes": "Analyse détaillée en 3-5 phrases : (1) constat factuel observé dans le HTML, (2) impact sur le référencement/visibilité IA, (3) recommandation concrète avec exemple de code/config si applicable"`
    : `"notes": "explication courte"`;

  const prompt = `${systemPrompt}

URL analysée : ${url}

HTML (tronqué) :
${html}

Critères à évaluer (dimension "${dimension}") :
${criteriaList}

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
[
  { "code": "${items[0].code}", "status": "pass"|"partial"|"fail", "score": 0-100, ${notesInstruction} }
]

Règles de scoring :
- pass (75-100) : critère respecté
- partial (25-74) : partiellement respecté
- fail (0-24) : non respecté ou absent
- Sois honnête, ne gonfle pas les scores.`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = safeParseJson(text);

  const framework = theme as Framework;
  const itemMap = new Map(items.map((i) => [i.code, i]));

  if (!parsed) {
    console.warn(`[theme-scorer][${theme}][${dimension}] JSON parse failed, using fallback`);
    return items.map((item) => ({
      framework,
      dimension,
      item_code: item.code,
      item_label: item.label,
      status: "partial" as const,
      score: 50,
      notes: "Évaluation automatique indisponible",
      is_geo_first: false,
      is_express_item: false,
    }));
  }

  return parsed
    .filter((r) => r.code && itemMap.has(r.code))
    .map((r) => {
      const def = itemMap.get(r.code!)!;
      const score = Math.round(Math.min(100, Math.max(0, Number(r.score) || 50)));
      return {
        framework,
        dimension,
        item_code: r.code!,
        item_label: def.label,
        status: validateStatus(r.status),
        score,
        notes: typeof r.notes === "string" ? r.notes : r.notes ? String(r.notes) : null,
        is_geo_first: false,
        is_express_item: false,
      };
    });
}

```


## `src/lib/scoring/action-plan.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { QUALITY_CONFIG } from "@/lib/constants";
import type { QualityLevel, SeoData, GeoData, Framework } from "@/types/audit";

/**
 * Generate a strategic action plan using LLM.
 * Extracted from Inngest functions to be reusable in direct API flow.
 */
export async function generateActionPlan(
  items: Array<{
    item_code: string;
    item_label: string;
    status: string;
    score: number;
    notes: string | null;
    dimension?: string;
    framework?: string;
  }>,
  seoData: SeoData | null,
  geoData: GeoData | null,
  url: string,
  quality: QualityLevel = "standard"
): Promise<
  Array<{
    priority: "P1" | "P2" | "P3" | "P4";
    title: string;
    description: string;
    impact_points: number;
    effort: string;
    category: string;
  }>
> {
  const config = QUALITY_CONFIG[quality];

  const failedItems = items
    .filter((item) => item.status !== "pass")
    .sort((a, b) => a.score - b.score);

  const passedItems = items.filter((item) => item.status === "pass");

  const coreEeatFails = failedItems.filter((i) => !i.item_code.startsWith("CI-"));
  const citeFails = failedItems.filter((i) => i.item_code.startsWith("CI-"));

  // Summarize SEO data context
  const seoContext = seoData
    ? [
        seoData.meta_title ? `Title: "${seoData.meta_title}"` : "Title: manquant",
        seoData.meta_description
          ? `Meta desc: "${seoData.meta_description}"`
          : "Meta desc: manquante",
        `H1: ${seoData.h1_count ?? "?"}, H2: ${seoData.h2_count ?? "?"}`,
        `Schema.org: ${seoData.has_schema_org ? (seoData.schema_types || []).join(", ") : "aucun"}`,
        `Liens internes: ${seoData.internal_links_count ?? "?"}, externes: ${seoData.external_links_count ?? "?"}`,
        `Images sans alt: ${seoData.images_without_alt ?? "?"}`,
        seoData.page_speed_score !== null && seoData.page_speed_score !== undefined
          ? `PageSpeed: ${seoData.page_speed_score}/100`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Donnees SEO non disponibles";

  // Summarize GEO data context
  const geoContext = geoData
    ? [
        `Score visibilite IA: ${geoData.ai_visibility_score}/100`,
        `Marque mentionnee: ${geoData.brand_mentioned ? "oui" : "non"}`,
        `Sentiment: ${geoData.brand_sentiment}`,
        `Citations: ${geoData.citation_count} sur ${geoData.models_coverage} modeles testes`,
        ...(geoData.models_tested || [])
          .filter((m: any) => m._actually_tested !== false)
          .map(
            (m: any) =>
              `  - ${m.model}: ${m.mentioned ? `mentionne (position: ${m.mention_position}, score: ${m.quality_score}/100)` : "non mentionne"}`
          ),
      ].join("\n")
    : "Donnees GEO non disponibles";

  const itemsSummary = failedItems
    .slice(0, 15)
    .map(
      (i) =>
        `[${i.item_code}] ${i.item_label} — ${i.score}/100`
    )
    .join("\n");

  const prompt = `Consultant SEO/GEO senior MCVA Consulting. Plan d'action strategique pour : ${url}

Echecs: ${failedItems.length}/${items.length} items. CORE-EEAT: ${coreEeatFails.length}, CITE: ${citeFails.length}.
SEO: ${seoContext}
GEO: ${geoContext}
Top echecs: ${itemsSummary}

Genere 10-15 actions en JSON strict. Format:
[{"priority":"P1","title":"max 60 chars","description":"2-3 phrases, probleme + solution concrete + impact attendu","impact_points":15,"effort":"2-3 jours","category":"technique"}]

REGLES CRITIQUES :
- P1=critique/immediat, P2=important/cette semaine, P3=recommande/ce mois, P4=optimisation/trimestre
- Categories: technique/contenu/GEO/notoriete/SEO
- Min 2 actions GEO (visibilite IA)
- Titres professionnels style cabinet de conseil (jamais "Ameliorer X")

VARIATION OBLIGATOIRE des impacts et efforts — chaque action doit avoir des valeurs DIFFERENTES et REALISTES :
- impact_points: varier entre 5 et 25 selon l'importance reelle (PAS tous a 20)
- effort: varier parmi "< 1h", "1-2h", "1 jour", "2-3 jours", "1 semaine", "2-4 semaines"
- La PREMIERE action P1 DOIT etre un quick win: effort "< 1h" ou "1-2h", concrete et actionnable immediatement (ex: ajout schema.org, correction meta, etc.)
- Les actions contenu/notoriete prennent plus de temps (1 semaine+), les actions techniques sont souvent rapides

JSON uniquement, sans texte avant ni apres.`;

  try {
    const anthropic = new Anthropic();
    // Use Haiku for action plan — it's strategic synthesis, not precise scoring
    // Much faster (~5-10s vs 20-40s for Sonnet) to stay within Vercel 60s limit
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-20250404",
      max_tokens: 2500,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content[0];
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (!text) {
      console.warn("[action-plan] Empty LLM response, falling back to basic plan");
      return generateFallbackActionPlan(failedItems);
    }

    const parsed = safeParseJsonActions(text);
    if (!parsed || parsed.length === 0) {
      console.warn("[action-plan] Failed to parse LLM response, falling back");
      return generateFallbackActionPlan(failedItems);
    }

    const validPriorities = ["P1", "P2", "P3", "P4"];
    const validCategories = ["technique", "contenu", "GEO", "notoriete", "SEO"];

    const mapped = parsed.slice(0, 20).map((action: any) => ({
      priority: validPriorities.includes(action.priority) ? action.priority : "P3",
      title:
        typeof action.title === "string"
          ? action.title.slice(0, 120)
          : "Action recommandee",
      description:
        typeof action.description === "string"
          ? action.description.slice(0, 600)
          : "",
      impact_points:
        typeof action.impact_points === "number"
          ? Math.min(25, Math.max(1, Math.round(action.impact_points)))
          : 5,
      effort:
        typeof action.effort === "string" ? action.effort.slice(0, 30) : "1-2 jours",
      category: validCategories.includes(action.category) ? action.category : "SEO",
    }));
    return deduplicateActions(mapped).slice(0, 15);
  } catch (error) {
    console.error("[action-plan] LLM generation failed:", error);
    return generateFallbackActionPlan(failedItems);
  }
}

/**
 * Deduplicate actions by normalized title (keep highest impact).
 */
function deduplicateActions<T extends { title: string; impact_points: number }>(
  actions: T[]
): T[] {
  const seen = new Map<string, T>();
  for (const action of actions) {
    const key = action.title
      .toLowerCase()
      .replace(/[^a-zàâäéèêëïîôùûüÿç0-9\s]/g, "")
      .split(/\s+/)
      .slice(0, 5)
      .join(" ");
    const existing = seen.get(key);
    if (!existing || action.impact_points > existing.impact_points) {
      seen.set(key, action);
    }
  }
  return Array.from(seen.values());
}

function safeParseJsonActions(text: string): any[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }

  const match = text.match(/\[[\s\S]*?\](?=[^[\]]*$)/);
  if (!match) {
    const greedyMatch = text.match(/\[[\s\S]*\]/);
    if (!greedyMatch) return null;
    try {
      const parsed = JSON.parse(greedyMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(match![0]);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }

  return null;
}

function categorizeItem(code: string): string {
  if (code.startsWith("CI-")) {
    const citeDim = code.charAt(3);
    const citeMap: Record<string, string> = {
      C: "notoriete",
      I: "notoriete",
      T: "contenu",
      E: "contenu",
    };
    return citeMap[citeDim] || "SEO";
  }
  const prefix = code.replace(/\d+$/, "");
  const map: Record<string, string> = {
    C: "contenu",
    O: "technique",
    R: "notoriete",
    E: "contenu",
    Exp: "contenu",
    Ept: "contenu",
    A: "notoriete",
    T: "technique",
  };
  return map[prefix] || "SEO";
}

function generateFallbackActionPlan(
  failedItems: Array<{
    item_code: string;
    item_label: string;
    status: string;
    score: number;
    notes: string | null;
  }>
): Array<{
  priority: "P1" | "P2" | "P3" | "P4";
  title: string;
  description: string;
  impact_points: number;
  effort: string;
  category: string;
}> {
  return failedItems
    .sort((a, b) => a.score - b.score)
    .slice(0, 15)
    .map((item, idx) => ({
      priority: (
        idx < 3 ? "P1" : idx < 7 ? "P2" : idx < 12 ? "P3" : "P4"
      ) as "P1" | "P2" | "P3" | "P4",
      title: `Ameliorer : ${item.item_label}`,
      description:
        item.notes || `Le critere ${item.item_code} necessite une amelioration.`,
      impact_points: Math.max(1, Math.round((100 - item.score) / 5)),
      effort: item.score < 25 ? "2-3 jours" : "1-2h",
      category: categorizeItem(item.item_code),
    }));
}

// ============================================================
// Ultra Audit — Premium Action Plan (20-25 actions)
// ============================================================

type UltraActionItem = {
  item_code: string;
  item_label: string;
  status: string;
  score: number;
  notes: string | null;
  dimension?: string;
  framework?: string;
};

type UltraAction = {
  priority: "P1" | "P2" | "P3" | "P4";
  title: string;
  description: string;
  impact_points: number;
  effort: string;
  category: string;
  theme: string;
  kpi: string;
};

/**
 * Build enriched SEO context for Ultra Audit prompt.
 */
function buildUltraSeoContext(seoData: SeoData | null): string {
  if (!seoData) return "Donnees SEO non disponibles";

  const lines: (string | null)[] = [
    seoData.meta_title ? `Title: "${seoData.meta_title}"` : "Title: manquant",
    seoData.meta_title_length != null
      ? `  Longueur title: ${seoData.meta_title_length} caracteres`
      : null,
    seoData.meta_description
      ? `Meta description: "${seoData.meta_description}"`
      : "Meta description: manquante",
    seoData.meta_description_length != null
      ? `  Longueur meta desc: ${seoData.meta_description_length} caracteres`
      : null,
    `H1: ${seoData.h1_count ?? "?"}, H2: ${seoData.h2_count ?? "?"}`,
    `Schema.org: ${seoData.has_schema_org ? (seoData.schema_types || []).join(", ") : "aucun"}`,
    seoData.schema_detail
      ? `  Schemas: ${seoData.schema_detail.schemas_found.join(", ") || "aucun"} | FAQ: ${seoData.schema_detail.has_faq ? "oui" : "non"} | LocalBusiness: ${seoData.schema_detail.has_local_business ? "oui" : "non"} | Breadcrumb: ${seoData.schema_detail.has_breadcrumb ? "oui" : "non"}`
      : null,
    `Liens internes: ${seoData.internal_links_count ?? "?"}, externes: ${seoData.external_links_count ?? "?"}`,
    `Images sans alt: ${seoData.images_without_alt ?? "?"}`,
    seoData.page_speed_score != null
      ? `PageSpeed: ${seoData.page_speed_score}/100`
      : null,
    seoData.core_web_vitals
      ? `Core Web Vitals — LCP: ${seoData.core_web_vitals.lcp ?? "?"}ms, CLS: ${seoData.core_web_vitals.cls ?? "?"}, FID: ${seoData.core_web_vitals.fid ?? "?"}ms, INP: ${seoData.core_web_vitals.inp ?? "?"}ms, TTFB: ${seoData.core_web_vitals.ttfb ?? "?"}ms`
      : null,
    seoData.has_https != null ? `HTTPS: ${seoData.has_https ? "oui" : "non"}` : null,
    seoData.has_canonical != null
      ? `Canonical: ${seoData.has_canonical ? seoData.canonical_url || "oui" : "non"}`
      : null,
    seoData.has_robots_txt != null
      ? `robots.txt: ${seoData.has_robots_txt ? "present" : "absent"}`
      : null,
    seoData.has_sitemap != null
      ? `Sitemap: ${seoData.has_sitemap ? seoData.sitemap_url || "present" : "absent"}`
      : null,
    seoData.readability
      ? `Lisibilite Flesch: ${seoData.readability.flesch_score} (${seoData.readability.flesch_level}), ${seoData.readability.word_count} mots, phrases moy. ${seoData.readability.avg_sentence_length} mots`
      : null,
    seoData.organic_traffic != null
      ? `Trafic organique: ${seoData.organic_traffic}`
      : null,
    seoData.organic_keywords != null
      ? `Mots-cles organiques: ${seoData.organic_keywords}`
      : null,
    seoData.authority_score != null
      ? `Authority Score: ${seoData.authority_score}`
      : null,
    seoData.backlinks_total != null
      ? `Backlinks: ${seoData.backlinks_total} (${seoData.referring_domains ?? "?"} domaines referents)`
      : null,
    seoData.top_keywords && seoData.top_keywords.length > 0
      ? `Top keywords: ${seoData.top_keywords.slice(0, 10).map((k) => `${k.keyword} (pos ${k.position}, vol ${k.volume})`).join("; ")}`
      : null,
    seoData.performance_data
      ? `Performance mobile: ${seoData.performance_data.mobile?.score ?? "?"}/100, desktop: ${seoData.performance_data.desktop?.score ?? "?"}/100`
      : null,
  ];

  return lines.filter(Boolean).join("\n");
}

/**
 * Build enriched GEO context for Ultra Audit prompt.
 */
function buildUltraGeoContext(geoData: GeoData | null): string {
  if (!geoData) return "Donnees GEO non disponibles";

  const lines: string[] = [
    `Score visibilite IA: ${geoData.ai_visibility_score}/100`,
    `Marque mentionnee: ${geoData.brand_mentioned ? "oui" : "non"}`,
    `Sentiment global: ${geoData.brand_sentiment}`,
    `Citations: ${geoData.citation_count} sur ${geoData.models_coverage} modeles testes`,
  ];

  const testedModels = (geoData.models_tested || []).filter(
    (m) => m._actually_tested !== false
  );

  for (const m of testedModels) {
    const details = [
      m.mentioned ? "mentionne" : "non mentionne",
      m.mention_position ? `position: ${m.mention_position}` : null,
      m.quality_score != null ? `score qualite: ${m.quality_score}/100` : null,
      m.is_recommended != null
        ? `recommande: ${m.is_recommended ? "oui" : "non"}`
        : null,
      m.sentiment ? `sentiment: ${m.sentiment}` : null,
      m.context ? `contexte: "${m.context}"` : null,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`  - ${m.model}: ${details}`);
  }

  if (geoData._all_models_failed) {
    lines.push("ATTENTION: Tous les modeles IA ont echoue lors du test.");
  }

  return lines.join("\n");
}

/**
 * Build per-framework diagnostic summaries from all items.
 */
function buildFrameworkSummaries(
  items: UltraActionItem[]
): string {
  const frameworkLabels: Record<string, string> = {
    core_eeat: "CORE-EEAT (SEO)",
    cite: "CITE (GEO / Visibilite IA)",
    perf: "Performance",
    a11y: "Accessibilite",
    rgesn: "Eco-conception (RGESN)",
    tech: "Technique",
    contenu: "Contenu",
  };

  const grouped: Record<string, UltraActionItem[]> = {};
  for (const item of items) {
    const fw = item.framework || "unknown";
    if (!grouped[fw]) grouped[fw] = [];
    grouped[fw].push(item);
  }

  const sections: string[] = [];

  for (const [fw, fwItems] of Object.entries(grouped)) {
    const label = frameworkLabels[fw] || fw;
    const passed = fwItems.filter((i) => i.status === "pass").length;
    const failed = fwItems.filter((i) => i.status !== "pass");
    const avgScore =
      fwItems.length > 0
        ? Math.round(
            fwItems.reduce((sum, i) => sum + i.score, 0) / fwItems.length
          )
        : 0;

    const failList = failed
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map((i) => `  - [${i.item_code}] ${i.item_label} — ${i.score}/100${i.notes ? ` (${i.notes})` : ""}`)
      .join("\n");

    sections.push(
      `### ${label}\nScore moyen: ${avgScore}/100 | Reussis: ${passed}/${fwItems.length} | Echecs: ${failed.length}\n${failList || "  Aucun echec"}`
    );
  }

  return sections.join("\n\n");
}

/**
 * Generate a premium Ultra Audit action plan (20-25 actions).
 * Uses Sonnet with a detailed strategic prompt.
 */
export async function generateUltraActionPlan(
  items: UltraActionItem[],
  seoData: SeoData | null,
  geoData: GeoData | null,
  url: string,
  quality: QualityLevel = "premium"
): Promise<UltraAction[]> {
  const failedItems = items
    .filter((item) => item.status !== "pass")
    .sort((a, b) => a.score - b.score);

  const passedItems = items.filter((item) => item.status === "pass");

  const seoContext = buildUltraSeoContext(seoData);
  const geoContext = buildUltraGeoContext(geoData);
  const frameworkSummaries = buildFrameworkSummaries(items);

  const prompt = `Tu es un consultant senior en stratégie digitale chez MCVA Consulting SA (Suisse).
Tu produis le plan d'action stratégique pour un Ultra Audit digital (rapport premium à CHF 4'900).

## SITE AUDITÉ
URL : ${url}
Items évalués : ${items.length} (${passedItems.length} réussis, ${failedItems.length} en échec)

## DONNÉES SEO
${seoContext}

## DONNÉES GEO (VISIBILITÉ IA)
${geoContext}

## DIAGNOSTIC PAR THÈME
${frameworkSummaries}

## CONSIGNES DE GÉNÉRATION

Génère exactement 20-25 actions en JSON. Chaque action DOIT contenir :

[{
  "priority": "P1",
  "title": "Titre stratégique cabinet de conseil (max 80 chars, jamais 'Améliorer X')",
  "description": "Paragraphe de 4-6 phrases structuré : (1) DIAGNOSTIC — constat factuel avec données chiffrées, (2) PRESCRIPTION — action concrète avec exemple de code/config/contenu si applicable, (3) IMPACT — résultat attendu chiffré",
  "impact_points": 15,
  "effort": "2-3 jours",
  "category": "technique",
  "theme": "seo",
  "kpi": "Meta description présente sur 100% des pages"
}]

## RÈGLES CRITIQUES

RÉPARTITION OBLIGATOIRE :
- Phase 1 (P1) Quick Wins : 6-8 actions, effort < 1 jour chacune
- Phase 2 (P2) Fondations : 8-10 actions, effort 1 jour à 1 semaine
- Phase 3 (P3+P4) Accélération : 6-8 actions, effort 1-4 semaines

COUVERTURE THÉMATIQUE OBLIGATOIRE :
- Min 4 actions SEO
- Min 3 actions GEO
- Min 2 actions Performance
- Min 2 actions Accessibilité
- Min 2 actions Contenu
- Min 1 action Technique
- Min 1 action Éco-conception

VARIATION OBLIGATOIRE :
- impact_points : varier 3-25
- effort : varier parmi "< 1h", "1-2h", "demi-journée", "1 jour", "2-3 jours", "1 semaine", "2 semaines", "1 mois"
- La PREMIÈRE action P1 = quick win immédiat (< 1h, très concret)

QUALITÉ DES DESCRIPTIONS :
- Chaque description est UNIQUE et SPÉCIFIQUE au site audité
- Citer les données concrètes du diagnostic
- Donner des exemples de code, schema.org, balises quand pertinent
- Jamais de formulation générique

Catégories : technique | contenu | GEO | notoriete | SEO
Thèmes : seo | geo | perf | a11y | rgesn | tech | contenu

JSON uniquement, sans texte avant ni après.`;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content[0];
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (!text) {
      console.warn("[ultra-action-plan] Empty LLM response, falling back to basic plan");
      return generateUltraFallbackActionPlan(failedItems);
    }

    const parsed = safeParseJsonActions(text);
    if (!parsed || parsed.length === 0) {
      console.warn("[ultra-action-plan] Failed to parse LLM response, falling back");
      return generateUltraFallbackActionPlan(failedItems);
    }

    const validPriorities = ["P1", "P2", "P3", "P4"];
    const validCategories = ["technique", "contenu", "GEO", "notoriete", "SEO"];
    const validThemes = ["seo", "geo", "perf", "a11y", "rgesn", "tech", "contenu"];

    const actions: UltraAction[] = parsed.slice(0, 25).map((action: any) => ({
      priority: validPriorities.includes(action.priority)
        ? action.priority
        : "P3",
      title:
        typeof action.title === "string"
          ? action.title.slice(0, 120)
          : "Action recommandee",
      description:
        typeof action.description === "string"
          ? action.description.slice(0, 1500)
          : "",
      impact_points:
        typeof action.impact_points === "number"
          ? Math.min(25, Math.max(1, Math.round(action.impact_points)))
          : 5,
      effort:
        typeof action.effort === "string" ? action.effort.slice(0, 30) : "1-2 jours",
      category: validCategories.includes(action.category)
        ? action.category
        : "SEO",
      theme: validThemes.includes(action.theme) ? action.theme : "seo",
      kpi:
        typeof action.kpi === "string" ? action.kpi.slice(0, 300) : "",
    }));

    const deduplicated = deduplicateActions(actions);

    // Validate theme coverage and log warnings
    validateUltraThemeCoverage(deduplicated);

    return deduplicated;
  } catch (error) {
    console.error("[ultra-action-plan] LLM generation failed:", error);
    return generateUltraFallbackActionPlan(failedItems);
  }
}

/**
 * Validate that Ultra Audit actions meet minimum theme coverage requirements.
 * Logs warnings if minimums are not met.
 */
function validateUltraThemeCoverage(actions: UltraAction[]): void {
  const themeMinimums: Record<string, number> = {
    seo: 4,
    geo: 3,
    perf: 2,
    a11y: 2,
    contenu: 2,
    tech: 1,
    rgesn: 1,
  };

  const themeCounts: Record<string, number> = {};
  for (const action of actions) {
    themeCounts[action.theme] = (themeCounts[action.theme] || 0) + 1;
  }

  for (const [theme, min] of Object.entries(themeMinimums)) {
    const count = themeCounts[theme] || 0;
    if (count < min) {
      console.warn(
        `[ultra-action-plan] Theme coverage warning: "${theme}" has ${count} actions (minimum: ${min})`
      );
    }
  }
}

/**
 * Fallback action plan for Ultra Audit when LLM fails.
 */
function generateUltraFallbackActionPlan(
  failedItems: UltraActionItem[]
): UltraAction[] {
  const themeFromFramework: Record<string, string> = {
    core_eeat: "seo",
    cite: "geo",
    perf: "perf",
    a11y: "a11y",
    rgesn: "rgesn",
    tech: "tech",
    contenu: "contenu",
  };

  return failedItems
    .sort((a, b) => a.score - b.score)
    .slice(0, 25)
    .map((item, idx) => ({
      priority: (
        idx < 7 ? "P1" : idx < 16 ? "P2" : idx < 22 ? "P3" : "P4"
      ) as "P1" | "P2" | "P3" | "P4",
      title: `Corriger : ${item.item_label}`,
      description:
        item.notes || `Le critere ${item.item_code} necessite une amelioration.`,
      impact_points: Math.max(1, Math.round((100 - item.score) / 4)),
      effort: item.score < 25 ? "2-3 jours" : "1-2h",
      category: categorizeItem(item.item_code),
      theme: themeFromFramework[item.framework || ""] || "seo",
      kpi: `Score ${item.item_code} > 75/100`,
    }));
}

```


## `src/lib/scoring/external-mapping.ts`

```typescript
/**
 * External blocks → scoring enrichment (POLE-PERFORMANCE v2.1 § 6.5)
 *
 * Quand les blocs A-F sont fournis, ils remplacent ou complètent l'estimation HTML
 * pour certains critères. Chaque critère enrichi expose sa source dans `score_source`.
 */

import type {
  BlocAData, BlocBData, BlocCData, BlocDData, BlocEData, BlocFData,
} from "@/lib/audit/parsers/types";
import type { DataSource } from "./constants";

export interface EnrichedCriterion {
  item_code: string;
  score: number;
  source: DataSource;
  source_label: string | null;
  raw_value?: number | null;
}

export interface BlocsBundle {
  A?: BlocAData;
  B?: BlocBData;
  C?: BlocCData;
  D?: BlocDData;
  E?: BlocEData;
  F?: BlocFData;
  sourceLabels?: Partial<Record<"A" | "B" | "C" | "D" | "E" | "F", string>>;
}

// -------------------------------------------------------------------
// Bloc A — AWT → CITE Influence + CORE-EEAT Reputation
// -------------------------------------------------------------------
// Thresholds sont pragmatiques pour PME Suisse; documentés dans POLE-PERF § 4 CITE I.

function scoreDomainRating(dr: number): number {
  if (dr >= 50) return 95;
  if (dr >= 30) return 75;
  if (dr >= 15) return 55;
  if (dr >= 5) return 35;
  return 15;
}

function scoreBacklinks(count: number): number {
  if (count >= 5000) return 95;
  if (count >= 1000) return 75;
  if (count >= 200) return 55;
  if (count >= 50) return 35;
  return 15;
}

function scoreReferringDomains(rd: number): number {
  if (rd >= 200) return 95;
  if (rd >= 80) return 75;
  if (rd >= 30) return 55;
  if (rd >= 10) return 35;
  return 15;
}

function scoreAuthorityBacklinks(topRD: Array<{ dr: number }>): number {
  // Compte les RD avec DR >= 50 (autorité forte)
  const strong = topRD.filter((d) => d.dr >= 50).length;
  if (strong >= 5) return 95;
  if (strong >= 2) return 75;
  if (strong >= 1) return 55;
  return 25;
}

export function enrichFromBlocA(a: BlocAData, sourceLabel: string): EnrichedCriterion[] {
  const out: EnrichedCriterion[] = [];
  const src: DataSource = "external_verified";

  if (a.domain_rating != null) {
    out.push({
      item_code: "CI-I01",
      score: scoreDomainRating(a.domain_rating),
      source: src,
      source_label: sourceLabel,
      raw_value: a.domain_rating,
    });
  }
  if (a.backlinks_total != null) {
    out.push({
      item_code: "CI-I02",
      score: scoreBacklinks(a.backlinks_total),
      source: src,
      source_label: sourceLabel,
      raw_value: a.backlinks_total,
    });
    // R03 — volume de backlinks (CORE-EEAT)
    out.push({
      item_code: "R03",
      score: scoreBacklinks(a.backlinks_total),
      source: src,
      source_label: sourceLabel,
      raw_value: a.backlinks_total,
    });
  }
  if (a.referring_domains != null) {
    out.push({
      item_code: "CI-I03",
      score: scoreReferringDomains(a.referring_domains),
      source: src,
      source_label: sourceLabel,
      raw_value: a.referring_domains,
    });
    // R04 — diversité RD
    out.push({
      item_code: "R04",
      score: scoreReferringDomains(a.referring_domains),
      source: src,
      source_label: sourceLabel,
      raw_value: a.referring_domains,
    });
  }
  if (a.top_referring_domains && a.top_referring_domains.length > 0) {
    out.push({
      item_code: "CI-I04",
      score: scoreAuthorityBacklinks(a.top_referring_domains),
      source: src,
      source_label: sourceLabel,
      raw_value: a.top_referring_domains.filter((d) => d.dr >= 50).length,
    });
  }

  return out;
}

// -------------------------------------------------------------------
// Bloc B — GSC → Optimization + Engagement
// -------------------------------------------------------------------

function scoreAvgPosition(pos: number): number {
  if (pos <= 5) return 95;
  if (pos <= 10) return 80;
  if (pos <= 20) return 60;
  if (pos <= 40) return 40;
  return 20;
}

function scoreCtr(ctr: number): number {
  // ctr exprimé en % (ex 5.2 = 5.2%)
  if (ctr >= 5) return 90;
  if (ctr >= 3) return 70;
  if (ctr >= 1.5) return 50;
  if (ctr >= 0.5) return 30;
  return 15;
}

function scoreKeywordDiversity(topQueriesCount: number): number {
  // Nb de top requêtes = proxy pour diversité de positionnement
  if (topQueriesCount >= 20) return 90;
  if (topQueriesCount >= 10) return 65;
  if (topQueriesCount >= 3) return 45;
  return 20;
}

export function enrichFromBlocB(b: BlocBData, sourceLabel: string): EnrichedCriterion[] {
  const out: EnrichedCriterion[] = [];
  const src: DataSource = "external_verified";

  if (b.avg_position != null) {
    // O01 — positions (valeur pondérée dans CORE-EEAT Optimization)
    out.push({
      item_code: "O01",
      score: scoreAvgPosition(b.avg_position),
      source: src,
      source_label: sourceLabel,
      raw_value: b.avg_position,
    });
  }
  if (b.avg_ctr != null) {
    out.push({
      item_code: "O02",
      score: scoreCtr(b.avg_ctr),
      source: src,
      source_label: sourceLabel,
      raw_value: b.avg_ctr,
    });
  }
  if (b.top_queries.length > 0) {
    out.push({
      item_code: "O03",
      score: scoreKeywordDiversity(b.top_queries.length),
      source: src,
      source_label: sourceLabel,
      raw_value: b.top_queries.length,
    });
  }
  // E05 — engagement via CTR moyen (proxy)
  if (b.avg_ctr != null) {
    out.push({
      item_code: "E05",
      score: scoreCtr(b.avg_ctr),
      source: src,
      source_label: sourceLabel,
      raw_value: b.avg_ctr,
    });
  }

  return out;
}

// -------------------------------------------------------------------
// Bloc C — GA4 → Engagement
// -------------------------------------------------------------------

function scoreEngagementRate(rate: number): number {
  // GA4 engagement rate en %
  if (rate >= 70) return 95;
  if (rate >= 55) return 75;
  if (rate >= 40) return 55;
  if (rate >= 25) return 35;
  return 15;
}

function scoreSessionDuration(sec: number): number {
  if (sec >= 180) return 90;
  if (sec >= 90) return 70;
  if (sec >= 45) return 50;
  if (sec >= 20) return 30;
  return 15;
}

function scoreConversions(count: number): number {
  if (count >= 500) return 95;
  if (count >= 100) return 75;
  if (count >= 20) return 55;
  if (count >= 5) return 35;
  return 15;
}

export function enrichFromBlocC(c: BlocCData, sourceLabel: string): EnrichedCriterion[] {
  const out: EnrichedCriterion[] = [];
  const src: DataSource = "external_verified";

  if (c.engagement_rate != null) {
    out.push({
      item_code: "E01",
      score: scoreEngagementRate(c.engagement_rate),
      source: src,
      source_label: sourceLabel,
      raw_value: c.engagement_rate,
    });
  }
  if (c.avg_session_duration_sec != null) {
    out.push({
      item_code: "E02",
      score: scoreSessionDuration(c.avg_session_duration_sec),
      source: src,
      source_label: sourceLabel,
      raw_value: c.avg_session_duration_sec,
    });
  }
  if (c.conversions_organic != null) {
    out.push({
      item_code: "E04",
      score: scoreConversions(c.conversions_organic),
      source: src,
      source_label: sourceLabel,
      raw_value: c.conversions_organic,
    });
  }

  return out;
}

// -------------------------------------------------------------------
// Bloc F — LLM Watch override complet du Score GEO™
// -------------------------------------------------------------------

export interface ScoreGeoOverride {
  score_geo: number;
  score_presence: number;
  score_exactitude: number;
  score_sentiment: number;
  score_recommendation: number;
  score_by_llm: Record<string, number>;
  source: DataSource;
  source_label: string;
  metadata: {
    model_snapshot_version: string | null;
    run_count: number | null;
    score_stddev: number | null;
    run_level: string | null;
  };
}

export function buildScoreGeoOverride(
  f: BlocFData,
  sourceLabel: string
): ScoreGeoOverride {
  return {
    score_geo: f.score_geo,
    score_presence: f.score_presence,
    score_exactitude: f.score_exactitude,
    score_sentiment: f.score_sentiment,
    score_recommendation: f.score_recommendation,
    score_by_llm: f.score_by_llm,
    source: "external_verified",
    source_label: sourceLabel,
    metadata: {
      model_snapshot_version: f.model_snapshot_version,
      run_count: f.run_count,
      score_stddev: f.score_stddev,
      run_level: f.run_level,
    },
  };
}

// -------------------------------------------------------------------
// Orchestration — applique tous les enrichissements disponibles
// -------------------------------------------------------------------

export interface ScoringEnrichment {
  /** Criteria scores keyed by item_code (override HTML-only scores). */
  criteria: Record<string, EnrichedCriterion>;
  /** Score GEO™ override si bloc F présent. */
  scoreGeoOverride: ScoreGeoOverride | null;
  /** Source labels pour le rapport final. */
  sourceLabels: string[];
}

export function buildEnrichment(bundle: BlocsBundle): ScoringEnrichment {
  const criteria: Record<string, EnrichedCriterion> = {};
  const sourceLabels: string[] = [];
  let scoreGeoOverride: ScoreGeoOverride | null = null;

  if (bundle.A) {
    const label = bundle.sourceLabels?.A || "AWT export";
    sourceLabels.push(label);
    for (const e of enrichFromBlocA(bundle.A, label)) criteria[e.item_code] = e;
  }
  if (bundle.B) {
    const label = bundle.sourceLabels?.B || "GSC export";
    sourceLabels.push(label);
    for (const e of enrichFromBlocB(bundle.B, label)) criteria[e.item_code] = e;
  }
  if (bundle.C) {
    const label = bundle.sourceLabels?.C || "GA4 export";
    sourceLabels.push(label);
    for (const e of enrichFromBlocC(bundle.C, label)) criteria[e.item_code] = e;
  }
  if (bundle.F) {
    const label = bundle.sourceLabels?.F || "LLM Watch run";
    sourceLabels.push(label);
    scoreGeoOverride = buildScoreGeoOverride(bundle.F, label);
  }

  return { criteria, scoreGeoOverride, sourceLabels };
}

/**
 * Construit la mention de sources pour inclusion dans le rapport final.
 * Ex: "Sources : AWT export 2026-04-23, GSC export 2026-04-23, LLM Watch run 2026-04-22"
 * (§ 6.5 POLE-PERF — toujours mentionner).
 */
export function formatSourcesCitation(labels: string[]): string {
  if (labels.length === 0) return "Sources : estimation HTML uniquement (mode dégradé)";
  return `Sources : ${labels.join(", ")}`;
}

```


## `src/lib/scoring/mock-scorer.ts`

```typescript
/**
 * Mock scorer for dry-run mode.
 * Generates realistic-looking audit items WITHOUT calling the Anthropic API.
 * Used to test the full pipeline (init → scoring → finalize → results → PDF) at zero cost.
 */

import { CORE_EEAT_ITEMS, EXPRESS_ITEMS } from "./core-eeat-items";
import { CITE_ITEMS } from "./cite-items";
import type { ItemStatus } from "@/types/audit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random based on string seed */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 100) / 100;
}

function mockScore(seed: string): number {
  const r = seededRandom(seed);
  // Distribution: 25% fail (0-35), 35% partial (36-69), 40% pass (70-100)
  if (r < 0.25) return Math.round(10 + r * 100);
  if (r < 0.60) return Math.round(35 + r * 55);
  return Math.round(65 + r * 35);
}

function mockStatus(score: number): ItemStatus {
  if (score >= 70) return "pass";
  if (score >= 40) return "partial";
  return "fail";
}

function mockNotes(label: string, status: ItemStatus, score: number): string {
  const statusLabel = status === "pass" ? "Conforme" : status === "partial" ? "Partiellement conforme" : "Non conforme";
  return `[DRY-RUN] ${statusLabel} (${score}/100). Critere: "${label}". Ceci est une note de test generee sans appel LLM.`;
}

// ---------------------------------------------------------------------------
// CORE-EEAT mock scorer
// ---------------------------------------------------------------------------

export function mockScoreOneDimension(
  dimension: string,
  mode: "express" | "full",
): Array<{
  framework: "core_eeat";
  dimension: string;
  item_code: string;
  item_label: string;
  status: ItemStatus;
  score: number;
  notes: string;
  is_geo_first: boolean;
  is_express_item: boolean;
}> {
  const pool = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;
  const dimItems = pool.filter((i) => i.dimension === dimension);

  return dimItems.map((item) => {
    const score = mockScore(`core_eeat-${item.code}`);
    const status = mockStatus(score);
    return {
      framework: "core_eeat" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status,
      score,
      notes: mockNotes(item.label, status, score),
      is_geo_first: item.isGeoFirst ?? false,
      is_express_item: item.isExpress ?? false,
    };
  });
}

// ---------------------------------------------------------------------------
// CITE mock scorer
// ---------------------------------------------------------------------------

export function mockScoreOneCiteDimension(
  dimension: string,
): Array<{
  framework: "cite";
  dimension: string;
  item_code: string;
  item_label: string;
  status: ItemStatus;
  score: number;
  notes: string;
  is_geo_first: boolean;
  is_express_item: boolean;
}> {
  const dimItems = CITE_ITEMS.filter((i) => i.dimension === dimension);

  return dimItems.map((item) => {
    const score = mockScore(`cite-${item.code}`);
    const status = mockStatus(score);
    return {
      framework: "cite" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status,
      score,
      notes: mockNotes(item.label, status, score),
      is_geo_first: false,
      is_express_item: item.isExpress ?? false,
    };
  });
}

// ---------------------------------------------------------------------------
// Theme mock scorer (perf, a11y, rgesn, tech, contenu)
// ---------------------------------------------------------------------------

/** Theme dimension definitions (same structure as theme-scorer.ts) */
const THEME_DIMENSIONS: Record<string, string[]> = {
  perf: ["lcp", "cls", "inp", "ttfb", "resources", "caching", "compression", "images", "fonts", "scripts", "lazy_loading", "cdn", "http2", "preload", "critical_css"],
  a11y: ["perceivable_text", "perceivable_media", "perceivable_color", "operable_keyboard", "operable_navigation", "operable_timing", "understandable_language", "understandable_forms", "understandable_errors", "robust_parsing", "robust_aria", "robust_compatibility"],
  rgesn: ["ecodesign_weight", "ecodesign_requests", "ecodesign_cache", "ecodesign_images", "ecodesign_scripts", "ecodesign_fonts", "ecodesign_animations"],
  tech: ["security_https", "security_headers", "seo_robots", "seo_sitemap", "seo_canonical", "mobile_viewport", "mobile_responsive", "structured_data", "i18n_hreflang", "error_handling"],
  contenu: ["quality_depth", "quality_freshness", "quality_expertise", "structure_headings", "structure_readability", "media_images", "media_videos", "engagement_cta", "engagement_internal_links", "semantic_entities", "semantic_topical_coverage"],
};

export function mockScoreThemeDimension(
  theme: string,
  dimension: string,
): Array<{
  framework: string;
  dimension: string;
  item_code: string;
  item_label: string;
  status: ItemStatus;
  score: number;
  notes: string;
  is_geo_first: boolean;
  is_express_item: boolean;
}> {
  // Generate 2-4 items per dimension
  const seed = `${theme}-${dimension}`;
  const numItems = 2 + Math.round(seededRandom(seed + "-count") * 2);
  const items = [];

  for (let i = 0; i < numItems; i++) {
    const code = `${theme.toUpperCase().slice(0, 3)}-${dimension.slice(0, 3).toUpperCase()}${String(i + 1).padStart(2, "0")}`;
    const label = `${dimension.replace(/_/g, " ")} - critere ${i + 1}`;
    const score = mockScore(`${seed}-${i}`);
    const status = mockStatus(score);

    items.push({
      framework: theme,
      dimension,
      item_code: code,
      item_label: label,
      status,
      score,
      notes: mockNotes(label, status, score),
      is_geo_first: false,
      is_express_item: false,
    });
  }

  return items;
}

export function mockGetThemeDimensions(theme: string): string[] {
  return THEME_DIMENSIONS[theme] || [];
}

// ---------------------------------------------------------------------------
// GEO mock data
// ---------------------------------------------------------------------------

export function mockGeoData(url: string) {
  return {
    ai_visibility_score: 32,
    models_tested: [
      {
        model: "gpt-4o",
        mentioned: true,
        citation_text: `[DRY-RUN] ${url} est mentionné comme référence dans le domaine.`,
        sentiment: "neutral" as const,
        context: "Mentionné dans une liste de ressources.",
        quality_score: 45,
        mention_position: "listed" as const,
        is_recommended: false,
      },
      {
        model: "perplexity",
        mentioned: true,
        citation_text: `[DRY-RUN] Le site ${url} propose des services professionnels.`,
        sentiment: "positive" as const,
        context: "Cité comme acteur du secteur.",
        quality_score: 55,
        mention_position: "top3" as const,
        is_recommended: true,
      },
    ],
    brand_mentioned: true,
    brand_sentiment: "neutral" as const,
    citation_count: 2,
    models_coverage: 2,
  };
}

// ---------------------------------------------------------------------------
// Action plan mock
// ---------------------------------------------------------------------------

export function mockActionPlan(isUltra: boolean) {
  const actions = [
    { priority: "P1", title: "Optimiser les balises title et meta-description", description: "[DRY-RUN] Les balises title et meta-description doivent etre uniques et optimisees pour chaque page.", impact_points: 8, effort: "< 1h", category: "SEO", theme: "seo", kpi: "CTR organique +15%" },
    { priority: "P1", title: "Corriger les erreurs Core Web Vitals (LCP)", description: "[DRY-RUN] Le LCP depasse le seuil recommande. Optimiser les images et le rendu initial.", impact_points: 9, effort: "1-2 jours", category: "technique", theme: "perf", kpi: "LCP < 2.5s" },
    { priority: "P2", title: "Ajouter le balisage Schema.org", description: "[DRY-RUN] Aucun schema structured data detecte. Ajouter Organization, LocalBusiness ou Service.", impact_points: 7, effort: "< 1h", category: "SEO", theme: "tech", kpi: "Rich snippets SERP" },
    { priority: "P2", title: "Ameliorer l'accessibilite des formulaires", description: "[DRY-RUN] Les champs de formulaire manquent de labels associes et d'attributs aria.", impact_points: 6, effort: "1-2 jours", category: "technique", theme: "a11y", kpi: "Score a11y +20pts" },
    { priority: "P2", title: "Creer du contenu expert pour les IA generatives", description: "[DRY-RUN] Publier des contenus FAQ, How-to et definitions claires pour etre cite par les LLM.", impact_points: 8, effort: "1 semaine", category: "GEO", theme: "geo", kpi: "Citations IA x2" },
    { priority: "P3", title: "Optimiser le poids des pages (eco-conception)", description: "[DRY-RUN] Reduire le poids total des pages sous 1MB. Compresser images, minifier CSS/JS.", impact_points: 5, effort: "1-2 jours", category: "technique", theme: "rgesn", kpi: "Poids page -40%" },
    { priority: "P3", title: "Ameliorer le maillage interne", description: "[DRY-RUN] Les pages profondes manquent de liens internes. Ajouter des liens contextuels.", impact_points: 6, effort: "1-2 jours", category: "contenu", theme: "contenu", kpi: "Pages indexees +25%" },
    { priority: "P3", title: "Renforcer la securite HTTP (headers)", description: "[DRY-RUN] Ajouter les headers Content-Security-Policy, X-Frame-Options, Permissions-Policy.", impact_points: 4, effort: "< 1h", category: "technique", theme: "tech", kpi: "Score securite A+" },
    { priority: "P4", title: "Deployer une strategie de backlinks", description: "[DRY-RUN] Le profil de liens entrants est faible. Identifier des opportunites de partenariats.", impact_points: 7, effort: "1 mois", category: "notoriete", theme: "seo", kpi: "DA +10 en 6 mois" },
    { priority: "P4", title: "Mettre en place un suivi de visibilite IA", description: "[DRY-RUN] Monitorer les citations dans ChatGPT, Perplexity et Gemini mensuellement.", impact_points: 3, effort: "1-2 jours", category: "GEO", theme: "geo", kpi: "Rapport mensuel GEO" },
  ];

  if (isUltra) {
    return actions.slice(0, 10);
  }
  return actions.slice(0, 7).map(({ theme, kpi, ...rest }) => rest);
}

```


## `src/lib/scoring/core-eeat-items.ts`

```typescript
import type { CoreEeatDimension } from "@/types/audit";

/**
 * Définition des 80 items CORE-EEAT.
 * Les 20 items marqués `isExpress: true` sont les plus discriminants
 * et sont utilisés dans l'audit express.
 *
 * TODO: À affiner lors de l'atelier avec Arthur (Question ouverte Q7).
 * Les items express actuels sont une sélection préliminaire basée sur
 * le repo aaron-he-zhu/seo-geo-claude-skills.
 */

export interface CoreEeatItemDef {
  code: string;
  label: string;
  dimension: CoreEeatDimension;
  description: string;
  isExpress: boolean;
  isGeoFirst: boolean;
}

export const CORE_EEAT_ITEMS: CoreEeatItemDef[] = [
  // === C — Contextual Clarity (10 items) ===
  { code: "C01", label: "Titre de page clair et descriptif", dimension: "C", description: "Le title tag reflète précisément le contenu et l'intention de la page.", isExpress: true, isGeoFirst: false },
  { code: "C02", label: "Structure de contenu IA-compatible", dimension: "C", description: "Le contenu est structuré de manière à être facilement extrait et cité par les moteurs IA (définitions claires, paragraphes autonomes).", isExpress: true, isGeoFirst: true },
  { code: "C03", label: "Hiérarchie de headings logique", dimension: "C", description: "H1 unique, H2-H6 en cascade logique reflétant la structure du contenu.", isExpress: false, isGeoFirst: false },
  { code: "C04", label: "Introduction contextualisante", dimension: "C", description: "Le premier paragraphe définit clairement le sujet, le contexte et la valeur pour le lecteur.", isExpress: false, isGeoFirst: false },
  { code: "C05", label: "Méta-description optimisée", dimension: "C", description: "Meta description présente, unique, entre 120-160 caractères, incitant au clic.", isExpress: true, isGeoFirst: false },
  { code: "C06", label: "URL sémantique", dimension: "C", description: "L'URL est courte, lisible et contient les mots-clés principaux.", isExpress: false, isGeoFirst: false },
  { code: "C07", label: "Fil d'Ariane (breadcrumb)", dimension: "C", description: "Breadcrumb visible et balisé en structured data.", isExpress: false, isGeoFirst: false },
  { code: "C08", label: "Langue déclarée", dimension: "C", description: "Attribut lang sur la balise html, cohérent avec le contenu.", isExpress: false, isGeoFirst: false },
  { code: "C09", label: "Données structurées contextuelles", dimension: "C", description: "Schema.org pertinent (FAQ, HowTo, Article, Organization) pour enrichir la compréhension IA.", isExpress: true, isGeoFirst: true },
  { code: "C10", label: "Cohérence titre/contenu", dimension: "C", description: "Le contenu de la page correspond effectivement à ce que le titre et la meta description promettent.", isExpress: false, isGeoFirst: false },

  // === O — Optimization Quality (10 items) ===
  { code: "O01", label: "Mot-clé principal dans le titre", dimension: "O", description: "Le mot-clé cible apparaît naturellement dans le title tag.", isExpress: true, isGeoFirst: false },
  { code: "O02", label: "Densité et placement des mots-clés", dimension: "O", description: "Mots-clés présents dans H1, premiers paragraphes, sans sur-optimisation.", isExpress: false, isGeoFirst: false },
  { code: "O03", label: "Optimisation pour les questions IA", dimension: "O", description: "Le contenu répond directement à des questions que les utilisateurs posent aux IA (format question/réponse).", isExpress: true, isGeoFirst: true },
  { code: "O04", label: "Images optimisées (alt, taille, format)", dimension: "O", description: "Toutes les images ont un alt descriptif, sont compressées et en format moderne (WebP/AVIF).", isExpress: true, isGeoFirst: false },
  { code: "O05", label: "Maillage interne contextuel", dimension: "O", description: "Liens internes pertinents avec ancres descriptives vers les pages stratégiques.", isExpress: false, isGeoFirst: false },
  { code: "O06", label: "Temps de chargement", dimension: "O", description: "LCP < 2.5s, Core Web Vitals dans le vert.", isExpress: false, isGeoFirst: false },
  { code: "O07", label: "Mobile-first", dimension: "O", description: "Le site est responsive et offre une UX optimale sur mobile.", isExpress: false, isGeoFirst: false },
  { code: "O08", label: "Canonicalisation", dimension: "O", description: "Balise canonical correctement définie, pas de contenu dupliqué.", isExpress: false, isGeoFirst: false },
  { code: "O09", label: "Sitemap XML", dimension: "O", description: "Sitemap à jour, soumis à Google Search Console.", isExpress: false, isGeoFirst: false },
  { code: "O10", label: "Robots.txt cohérent", dimension: "O", description: "Robots.txt ne bloque pas les pages stratégiques, autorise les crawlers IA.", isExpress: false, isGeoFirst: false },

  // === R — Reputation & References (10 items) ===
  { code: "R01", label: "Citations par les moteurs IA", dimension: "R", description: "La marque est citée dans les réponses de ChatGPT, Perplexity, Claude, Gemini.", isExpress: true, isGeoFirst: true },
  { code: "R02", label: "Présence dans les sources fiables", dimension: "R", description: "Mentions sur Wikipédia, articles de presse, sites institutionnels.", isExpress: true, isGeoFirst: true },
  { code: "R03", label: "Backlinks de qualité", dimension: "R", description: "Liens entrants depuis des domaines à forte autorité et thématiquement pertinents.", isExpress: true, isGeoFirst: true },
  { code: "R04", label: "Diversité des domaines référents", dimension: "R", description: "Les backlinks proviennent de domaines variés, pas d'un seul réseau.", isExpress: false, isGeoFirst: true },
  { code: "R05", label: "Mentions de marque sans lien", dimension: "R", description: "La marque est mentionnée sur des sites tiers même sans lien hypertexte.", isExpress: false, isGeoFirst: true },
  { code: "R06", label: "Avis et témoignages", dimension: "R", description: "Avis clients visibles, balisés en schema.org (Review, AggregateRating).", isExpress: false, isGeoFirst: false },
  { code: "R07", label: "Présence Google Business Profile", dimension: "R", description: "Fiche GBP complète et à jour avec avis.", isExpress: false, isGeoFirst: false },
  { code: "R08", label: "Cohérence NAP", dimension: "R", description: "Nom, Adresse, Téléphone identiques sur tous les annuaires.", isExpress: false, isGeoFirst: false },
  { code: "R09", label: "Liens sortants vers des sources fiables", dimension: "R", description: "Le contenu cite des sources reconnues (études, rapports, institutions).", isExpress: false, isGeoFirst: false },
  { code: "R10", label: "Absence de signaux négatifs", dimension: "R", description: "Pas de pénalités manuelles, pas de contenu toxique associé.", isExpress: false, isGeoFirst: false },

  // === E — Engagement Signals (10 items) ===
  { code: "E01", label: "Contenu engageant et partageable", dimension: "E", description: "Le contenu incite au partage social et à l'interaction, format adapté aux citations IA.", isExpress: true, isGeoFirst: true },
  { code: "E02", label: "Call-to-action clairs", dimension: "E", description: "CTAs visibles et pertinents guidant l'utilisateur.", isExpress: false, isGeoFirst: false },
  { code: "E03", label: "Contenu multimédia", dimension: "E", description: "Vidéos, infographies, images enrichissant l'expérience.", isExpress: true, isGeoFirst: false },
  { code: "E04", label: "Lisibilité du contenu", dimension: "E", description: "Paragraphes courts, listes à puces, mise en forme facilitant la lecture.", isExpress: false, isGeoFirst: false },
  { code: "E05", label: "Temps de lecture estimé", dimension: "E", description: "Contenu substantiel (> 1500 mots pour les pages piliers).", isExpress: false, isGeoFirst: false },
  { code: "E06", label: "Interaction utilisateur", dimension: "E", description: "Formulaires, commentaires, chat ou autres mécanismes d'interaction.", isExpress: false, isGeoFirst: false },
  { code: "E07", label: "Partage social facilité", dimension: "E", description: "Boutons de partage, Open Graph tags, Twitter Cards.", isExpress: false, isGeoFirst: false },
  { code: "E08", label: "Navigation intuitive", dimension: "E", description: "Menu clair, recherche interne, accès rapide aux pages clés.", isExpress: false, isGeoFirst: false },
  { code: "E09", label: "Absence de publicité intrusive", dimension: "E", description: "Pas de popups agressifs, pas d'interstitiels bloquants.", isExpress: false, isGeoFirst: false },
  { code: "E10", label: "Accessibilité (a11y)", dimension: "E", description: "Contraste suffisant, navigation clavier, ARIA labels.", isExpress: false, isGeoFirst: false },

  // === Exp — Experience (10 items) ===
  { code: "Exp01", label: "Contenu basé sur l'expérience réelle", dimension: "Exp", description: "Le contenu démontre une expérience directe du sujet (cas clients, exemples vécus).", isExpress: true, isGeoFirst: false },
  { code: "Exp02", label: "Études de cas détaillées", dimension: "Exp", description: "Présence d'études de cas avec métriques et résultats concrets.", isExpress: true, isGeoFirst: false },
  { code: "Exp03", label: "Témoignages clients authentiques", dimension: "Exp", description: "Témoignages avec noms, entreprises, photos — pas de témoignages génériques.", isExpress: false, isGeoFirst: false },
  { code: "Exp04", label: "Contenu original (pas IA générique)", dimension: "Exp", description: "Le contenu apporte une perspective unique, pas du texte IA reformulé.", isExpress: false, isGeoFirst: false },
  { code: "Exp05", label: "Visuels originaux", dimension: "Exp", description: "Photos, captures d'écran, graphiques créés en interne (pas de stock photos génériques).", isExpress: false, isGeoFirst: false },
  { code: "Exp06", label: "Démonstration de processus", dimension: "Exp", description: "Le contenu montre le comment (tutoriels, méthodologies, behind-the-scenes).", isExpress: false, isGeoFirst: false },
  { code: "Exp07", label: "Contenu à jour", dimension: "Exp", description: "Dates de publication/mise à jour visibles, contenu actualisé.", isExpress: false, isGeoFirst: false },
  { code: "Exp08", label: "Granularité du contenu", dimension: "Exp", description: "Le sujet est traité en profondeur, pas en surface.", isExpress: false, isGeoFirst: false },
  { code: "Exp09", label: "Perspective locale/sectorielle", dimension: "Exp", description: "Le contenu intègre des spécificités locales ou sectorielles pertinentes.", isExpress: false, isGeoFirst: false },
  { code: "Exp10", label: "Portfolio / réalisations", dimension: "Exp", description: "Section portfolio ou réalisations démontrant l'expérience concrète.", isExpress: false, isGeoFirst: false },

  // === Ept — Expertise (10 items) ===
  { code: "Ept01", label: "Auteurs identifiés et qualifiés", dimension: "Ept", description: "Les auteurs sont nommés avec bio, qualifications et liens vers profils professionnels.", isExpress: true, isGeoFirst: false },
  { code: "Ept02", label: "Contenu démontrant l'expertise", dimension: "Ept", description: "Analyses approfondies, données exclusives, insights sectoriels non triviaux.", isExpress: true, isGeoFirst: false },
  { code: "Ept03", label: "Certifications et accréditations", dimension: "Ept", description: "Certifications professionnelles, labels, accréditations affichés.", isExpress: false, isGeoFirst: false },
  { code: "Ept04", label: "Publications et interventions", dimension: "Ept", description: "Liens vers des publications, conférences, webinaires des experts.", isExpress: false, isGeoFirst: false },
  { code: "Ept05", label: "Méthodologie expliquée", dimension: "Ept", description: "La méthodologie de travail est documentée et transparente.", isExpress: false, isGeoFirst: false },
  { code: "Ept06", label: "FAQ technique", dimension: "Ept", description: "Section FAQ répondant aux questions techniques du domaine.", isExpress: false, isGeoFirst: false },
  { code: "Ept07", label: "Vocabulaire spécialisé maîtrisé", dimension: "Ept", description: "Utilisation correcte du jargon professionnel du secteur.", isExpress: false, isGeoFirst: false },
  { code: "Ept08", label: "Comparatifs et benchmarks", dimension: "Ept", description: "Présence de comparatifs objectifs basés sur des données.", isExpress: false, isGeoFirst: false },
  { code: "Ept09", label: "Guides et ressources pédagogiques", dimension: "Ept", description: "Contenu éducatif structuré aidant le lecteur à progresser.", isExpress: false, isGeoFirst: false },
  { code: "Ept10", label: "Veille et actualités sectorielles", dimension: "Ept", description: "Contenu de veille démontrant un suivi actif du secteur.", isExpress: false, isGeoFirst: false },

  // === A — Authoritativeness (10 items) ===
  { code: "A01", label: "Reconnaissance sectorielle", dimension: "A", description: "La marque est reconnue comme référence dans son secteur (classements, awards).", isExpress: true, isGeoFirst: false },
  { code: "A02", label: "Couverture médiatique", dimension: "A", description: "Articles de presse, interviews, mentions dans les médias spécialisés.", isExpress: true, isGeoFirst: false },
  { code: "A03", label: "Partenariats stratégiques", dimension: "A", description: "Partenariats avec des organisations reconnues, visibles sur le site.", isExpress: false, isGeoFirst: false },
  { code: "A04", label: "Présence Knowledge Graph Google", dimension: "A", description: "La marque apparaît dans le Knowledge Graph (Knowledge Panel).", isExpress: false, isGeoFirst: false },
  { code: "A05", label: "Page Wikipédia", dimension: "A", description: "Article Wikipédia dédié à la marque ou contribution notable.", isExpress: false, isGeoFirst: false },
  { code: "A06", label: "Profils sociaux vérifiés", dimension: "A", description: "Comptes sociaux actifs, vérifiés, avec audience significative.", isExpress: false, isGeoFirst: false },
  { code: "A07", label: "Contenu repris par des tiers", dimension: "A", description: "Le contenu est cité, repris ou référencé par d'autres sites d'autorité.", isExpress: false, isGeoFirst: false },
  { code: "A08", label: "Ancienneté du domaine", dimension: "A", description: "Le domaine a un historique établi (> 2 ans).", isExpress: false, isGeoFirst: false },
  { code: "A09", label: "Consistance de publication", dimension: "A", description: "Rythme de publication régulier démontrant un engagement continu.", isExpress: false, isGeoFirst: false },
  { code: "A10", label: "Ecosystem de contenu", dimension: "A", description: "Blog, podcast, newsletter, chaîne YouTube — présence multi-canal.", isExpress: false, isGeoFirst: false },

  // === T — Trustworthiness (10 items) ===
  { code: "T01", label: "HTTPS et sécurité", dimension: "T", description: "Certificat SSL valide, HSTS activé, pas de contenu mixte.", isExpress: true, isGeoFirst: false },
  { code: "T02", label: "Mentions légales complètes", dimension: "T", description: "CGV, politique de confidentialité, mentions légales conformes RGPD.", isExpress: true, isGeoFirst: false },
  { code: "T03", label: "Coordonnées vérifiables", dimension: "T", description: "Adresse physique, téléphone, email de contact facilement accessibles.", isExpress: false, isGeoFirst: false },
  { code: "T04", label: "Transparence tarifaire", dimension: "T", description: "Tarifs ou fourchettes de prix affichés quand applicable.", isExpress: false, isGeoFirst: false },
  { code: "T05", label: "Politique de retour/garantie", dimension: "T", description: "Conditions de retour/garantie claires (e-commerce).", isExpress: false, isGeoFirst: false },
  { code: "T06", label: "Avis vérifiés", dimension: "T", description: "Avis provenant de plateformes vérifiées (Google, Trustpilot, etc.).", isExpress: false, isGeoFirst: false },
  { code: "T07", label: "Absence de dark patterns", dimension: "T", description: "Pas de techniques manipulatoires (urgence artificielle, opt-out cachés).", isExpress: false, isGeoFirst: false },
  { code: "T08", label: "Transparence sur l'utilisation de l'IA", dimension: "T", description: "Si du contenu est généré par IA, c'est indiqué.", isExpress: false, isGeoFirst: false },
  { code: "T09", label: "Sécurité des données utilisateur", dimension: "T", description: "Formulaires sécurisés, pas de fuite de données, conformité RGPD.", isExpress: false, isGeoFirst: false },
  { code: "T10", label: "Sources citées et vérifiables", dimension: "T", description: "Les affirmations sont soutenues par des sources avec liens.", isExpress: false, isGeoFirst: false },
];

export const EXPRESS_ITEMS = CORE_EEAT_ITEMS.filter((item) => item.isExpress);
export const GEO_FIRST_ITEMS = CORE_EEAT_ITEMS.filter((item) => item.isGeoFirst);

// Verify counts
if (CORE_EEAT_ITEMS.length !== 80) {
  console.warn(`Expected 80 CORE-EEAT items, got ${CORE_EEAT_ITEMS.length}`);
}
if (EXPRESS_ITEMS.length !== 20) {
  console.warn(`Expected 20 express items, got ${EXPRESS_ITEMS.length}`);
}

```


## `src/lib/scoring/cite-items.ts`

```typescript
import type { CiteDimension } from "@/types/audit";

/**
 * Définition des 40 items CITE (Crédibilité, Influence, Confiance, Engagement).
 * Les 10 items marqués `isExpress: true` sont utilisés dans l'audit express.
 *
 * TODO: À affiner lors de l'atelier avec Arthur (Question ouverte Q7).
 */

export interface CiteItemDef {
  code: string;
  label: string;
  dimension: CiteDimension;
  description: string;
  isExpress: boolean;
}

export const CITE_ITEMS: CiteItemDef[] = [
  // === C — Crédibilité (10 items) ===
  { code: "CI-C01", label: "Ancienneté du domaine", dimension: "C", description: "Le domaine existe depuis plus de 2 ans, démontrant une présence établie.", isExpress: true },
  { code: "CI-C02", label: "Certificat SSL et sécurité", dimension: "C", description: "HTTPS actif avec certificat valide, HSTS configuré.", isExpress: false },
  { code: "CI-C03", label: "Mentions légales et CGV", dimension: "C", description: "Pages légales complètes, conformes RGPD, facilement accessibles.", isExpress: true },
  { code: "CI-C04", label: "Cohérence des informations", dimension: "C", description: "Les informations de l'entreprise (NAP, description, secteur) sont cohérentes sur tous les canaux.", isExpress: false },
  { code: "CI-C05", label: "Pages À propos détaillées", dimension: "C", description: "Page À propos avec histoire, équipe, valeurs, chiffres clés.", isExpress: true },
  { code: "CI-C06", label: "Registre du commerce vérifiable", dimension: "C", description: "Numéro de registre du commerce ou SIRET/IDE mentionné et vérifiable.", isExpress: false },
  { code: "CI-C07", label: "Coordonnées physiques", dimension: "C", description: "Adresse physique, téléphone et email de contact clairement affichés.", isExpress: false },
  { code: "CI-C08", label: "Politique de confidentialité", dimension: "C", description: "Politique de protection des données détaillée et à jour.", isExpress: false },
  { code: "CI-C09", label: "Absence de contenu trompeur", dimension: "C", description: "Pas de fausses promesses, pas de dark patterns, pas de contenu clickbait.", isExpress: false },
  { code: "CI-C10", label: "Qualité éditoriale", dimension: "C", description: "Contenu sans fautes, bien structuré, professionnellement rédigé.", isExpress: false },

  // === I — Influence (10 items) ===
  { code: "CI-I01", label: "Authority Score", dimension: "I", description: "Score d'autorité du domaine (Semrush AS, Moz DA, ou équivalent via signaux publics).", isExpress: true },
  { code: "CI-I02", label: "Volume de backlinks", dimension: "I", description: "Nombre significatif de liens entrants depuis des domaines tiers.", isExpress: false },
  { code: "CI-I03", label: "Diversité des domaines référents", dimension: "I", description: "Backlinks provenant d'un large éventail de domaines, pas concentrés.", isExpress: true },
  { code: "CI-I04", label: "Backlinks depuis sites d'autorité", dimension: "I", description: "Liens depuis des sites .gouv, .edu, médias reconnus, organisations professionnelles.", isExpress: false },
  { code: "CI-I05", label: "Présence médiatique", dimension: "I", description: "Articles de presse, interviews, citations dans les médias spécialisés.", isExpress: true },
  { code: "CI-I06", label: "Audience réseaux sociaux", dimension: "I", description: "Présence active sur les réseaux sociaux avec audience significative.", isExpress: false },
  { code: "CI-I07", label: "Trafic organique estimé", dimension: "I", description: "Volume de trafic organique mensuel (Semrush ou estimation).", isExpress: false },
  { code: "CI-I08", label: "Nombre de mots-clés positionnés", dimension: "I", description: "Volume de mots-clés sur lesquels le domaine se positionne dans le top 100.", isExpress: false },
  { code: "CI-I09", label: "Présence dans les annuaires professionnels", dimension: "I", description: "Référencement dans les annuaires et répertoires de la profession.", isExpress: false },
  { code: "CI-I10", label: "Partenariats et affiliations", dimension: "I", description: "Partenariats visibles avec des organisations reconnues du secteur.", isExpress: false },

  // === T — Confiance / Trust (10 items) ===
  { code: "CI-T01", label: "Avis clients vérifiés", dimension: "T", description: "Avis sur Google Business, Trustpilot, ou plateformes d'avis vérifiés.", isExpress: true },
  { code: "CI-T02", label: "Note moyenne des avis", dimension: "T", description: "Note moyenne supérieure à 4/5 sur les principales plateformes.", isExpress: false },
  { code: "CI-T03", label: "Réponse aux avis", dimension: "T", description: "L'entreprise répond aux avis (positifs et négatifs) de manière professionnelle.", isExpress: false },
  { code: "CI-T04", label: "Témoignages clients détaillés", dimension: "T", description: "Témoignages avec noms, fonctions, entreprises, contexte du projet.", isExpress: true },
  { code: "CI-T05", label: "Études de cas avec résultats", dimension: "T", description: "Études de cas détaillées avec métriques avant/après.", isExpress: false },
  { code: "CI-T06", label: "Labels et certifications", dimension: "T", description: "Labels de qualité, certifications sectorielles, ISO, etc.", isExpress: false },
  { code: "CI-T07", label: "Google Business Profile complet", dimension: "T", description: "Fiche GBP complète avec photos, horaires, services, avis.", isExpress: false },
  { code: "CI-T08", label: "Présence Wikipédia", dimension: "T", description: "Article ou mention sur Wikipédia démontrant la notoriété.", isExpress: false },
  { code: "CI-T09", label: "Transparence tarifaire", dimension: "T", description: "Tarifs ou fourchettes de prix affichés quand applicable.", isExpress: false },
  { code: "CI-T10", label: "Garanties et engagements", dimension: "T", description: "Garanties de service, SLA, engagements qualité formalisés.", isExpress: false },

  // === E — Engagement (10 items) ===
  { code: "CI-E01", label: "Fréquence de publication", dimension: "E", description: "Rythme de publication régulier sur le blog ou les actualités.", isExpress: true },
  { code: "CI-E02", label: "Activité sur les réseaux sociaux", dimension: "E", description: "Publications régulières et interactions sur les réseaux sociaux.", isExpress: false },
  { code: "CI-E03", label: "Newsletter ou contenus récurrents", dimension: "E", description: "Newsletter, podcast, webinaires ou autre format de contenu récurrent.", isExpress: false },
  { code: "CI-E04", label: "Participation à des événements", dimension: "E", description: "Participation à des conférences, salons, webinaires du secteur.", isExpress: true },
  { code: "CI-E05", label: "Communauté active", dimension: "E", description: "Commentaires, forum, ou communauté en ligne active.", isExpress: false },
  { code: "CI-E06", label: "Contenu interactif", dimension: "E", description: "Outils, calculateurs, quiz, ou contenus interactifs proposés.", isExpress: false },
  { code: "CI-E07", label: "Mises à jour du site", dimension: "E", description: "Le site est régulièrement mis à jour (dates récentes visibles).", isExpress: false },
  { code: "CI-E08", label: "Réactivité de contact", dimension: "E", description: "Chat en ligne, formulaire de contact avec réponse rapide promise.", isExpress: false },
  { code: "CI-E09", label: "Contenu à valeur ajoutée gratuit", dimension: "E", description: "Guides, templates, outils gratuits démontrant la générosité de l'expertise.", isExpress: false },
  { code: "CI-E10", label: "Engagement RSE/ESG", dimension: "E", description: "Engagement social ou environnemental visible et documenté.", isExpress: false },
];

export const CITE_EXPRESS_ITEMS = CITE_ITEMS.filter((item) => item.isExpress);

if (CITE_ITEMS.length !== 40) {
  console.warn(`Expected 40 CITE items, got ${CITE_ITEMS.length}`);
}
if (CITE_EXPRESS_ITEMS.length !== 10) {
  console.warn(`Expected 10 CITE express items, got ${CITE_EXPRESS_ITEMS.length}`);
}

```


## `src/lib/scoring/a11y-items.ts`

```typescript
/**
 * Définition des 20 items Accessibilité (RGAA 4.1.2).
 * Couvre les 13 thématiques RGAA, priorisées par impact.
 * Les items marqués `isPreAudit: true` sont vérifiables en pré-audit automatisé.
 */

export interface A11yItemDef {
  code: string;
  label: string;
  dimension: string; // maps to RGAA thematic
  description: string;
  isPreAudit: boolean;
}

export const A11Y_ITEMS: A11yItemDef[] = [
  // === Images ===
  { code: "A11Y01", label: "Textes alternatifs (alt) présents et pertinents", dimension: "images", description: "Toutes les images porteuses d'information possèdent un attribut alt décrivant leur contenu de manière pertinente.", isPreAudit: true },
  { code: "A11Y02", label: "Images décoratives marquées aria-hidden", dimension: "images", description: "Les images purement décoratives sont marquées avec aria-hidden=\"true\" ou un alt vide pour être ignorées par les lecteurs d'écran.", isPreAudit: true },

  // === Couleurs ===
  { code: "A11Y03", label: "Contraste texte/fond ≥ 4.5:1", dimension: "couleurs", description: "Le ratio de contraste entre le texte et son arrière-plan respecte le minimum WCAG AA de 4.5:1 (3:1 pour les grands textes).", isPreAudit: true },
  { code: "A11Y04", label: "Information non véhiculée uniquement par la couleur", dimension: "couleurs", description: "L'information transmise par la couleur est doublée par un autre moyen visuel (icône, texte, motif).", isPreAudit: false },

  // === Liens ===
  { code: "A11Y05", label: "Intitulés de liens explicites et descriptifs", dimension: "liens", description: "Chaque lien possède un intitulé compréhensible hors contexte (pas de « cliquez ici » ou « en savoir plus » seul).", isPreAudit: true },

  // === Scripts ===
  { code: "A11Y06", label: "Composants interactifs accessibles au clavier", dimension: "scripts", description: "Tous les composants interactifs (menus, modales, accordéons) sont utilisables au clavier sans souris.", isPreAudit: false },
  { code: "A11Y07", label: "Messages de statut accessibles (aria-live)", dimension: "scripts", description: "Les messages de statut dynamiques (succès, erreur, chargement) utilisent aria-live pour être annoncés par les lecteurs d'écran.", isPreAudit: false },

  // === Éléments obligatoires ===
  { code: "A11Y08", label: "Titre de page présent et pertinent", dimension: "elements_obligatoires", description: "Chaque page possède un élément <title> unique et descriptif reflétant son contenu.", isPreAudit: true },
  { code: "A11Y09", label: "Langue de la page déclarée (lang)", dimension: "elements_obligatoires", description: "L'attribut lang est présent sur la balise <html> et correspond à la langue principale du contenu.", isPreAudit: false },

  // === Structuration ===
  { code: "A11Y10", label: "Hiérarchie des titres (H1→H6) logique et sans saut", dimension: "structuration", description: "La hiérarchie des titres est cohérente : un seul H1 par page, pas de saut de niveau (ex. H2 → H4 sans H3).", isPreAudit: false },
  { code: "A11Y11", label: "Listes correctement balisées (ul/ol/dl)", dimension: "structuration", description: "Les listes de contenu utilisent les balises sémantiques appropriées (ul, ol, dl) et non des paragraphes ou des div.", isPreAudit: false },

  // === Présentation ===
  { code: "A11Y12", label: "Zoom 200% sans perte de contenu", dimension: "presentation", description: "Le contenu reste lisible et fonctionnel avec un zoom navigateur à 200%, sans perte d'information ni barre de défilement horizontale.", isPreAudit: false },
  { code: "A11Y13", label: "Focus visible sur les éléments interactifs", dimension: "presentation", description: "Un indicateur de focus clairement visible est affiché sur tous les éléments interactifs lors de la navigation clavier.", isPreAudit: false },

  // === Formulaires ===
  { code: "A11Y14", label: "Labels associés à chaque champ", dimension: "formulaires", description: "Chaque champ de formulaire est associé à un label explicite via l'attribut for/id ou un aria-label.", isPreAudit: false },
  { code: "A11Y15", label: "Messages d'erreur explicites et accessibles", dimension: "formulaires", description: "Les erreurs de formulaire sont décrites de manière explicite, associées au champ concerné et annoncées aux technologies d'assistance.", isPreAudit: false },

  // === Navigation ===
  { code: "A11Y16", label: "Ordre de tabulation logique", dimension: "navigation", description: "L'ordre de tabulation suit l'ordre visuel et logique du contenu, sans piège clavier.", isPreAudit: false },
  { code: "A11Y17", label: "Skip link présent", dimension: "navigation", description: "Un lien d'évitement (« Aller au contenu principal ») est présent en début de page pour sauter la navigation.", isPreAudit: false },

  // === Cadres ===
  { code: "A11Y18", label: "Titres de frames/iframes", dimension: "cadres", description: "Chaque iframe et frame possède un attribut title décrivant son contenu.", isPreAudit: false },

  // === Multimédia ===
  { code: "A11Y19", label: "Sous-titres pour les vidéos", dimension: "multimedia", description: "Les vidéos contenant de la parole disposent de sous-titres synchronisés et fidèles.", isPreAudit: false },

  // === Consultation ===
  { code: "A11Y20", label: "Documents téléchargeables accessibles", dimension: "consultation", description: "Les documents proposés en téléchargement (PDF, DOCX) respectent les règles d'accessibilité (structure, alt, balisage).", isPreAudit: false },
];

export const A11Y_PRE_AUDIT_ITEMS = A11Y_ITEMS.filter((item) => item.isPreAudit);

// Verify counts
if (A11Y_ITEMS.length !== 20) {
  console.warn(`Expected 20 A11Y items, got ${A11Y_ITEMS.length}`);
}

```


## `src/lib/scoring/perf-items.ts`

```typescript
/**
 * Définition des 15 items Performance.
 * Les 5 items marqués `isPreAudit: true` (CWV) sont utilisés dans le pré-audit.
 * L'audit complet/ultra utilise les 15 items.
 */

export interface PerfItemDef {
  code: string;
  label: string;
  dimension: string; // "cwv" | "assets" | "js_css"
  description: string;
  isPreAudit: boolean;
}

export const PERF_ITEMS: PerfItemDef[] = [
  // === CWV — Core Web Vitals (5 items, all isPreAudit) ===
  { code: "PERF01", label: "LCP (Largest Contentful Paint) < 2.5s", dimension: "cwv", description: "Le plus grand élément visible se charge en moins de 2,5 secondes.", isPreAudit: true },
  { code: "PERF02", label: "CLS (Cumulative Layout Shift) < 0.1", dimension: "cwv", description: "La stabilité visuelle est assurée : pas de décalages de mise en page inattendus.", isPreAudit: true },
  { code: "PERF03", label: "INP (Interaction to Next Paint) < 200ms", dimension: "cwv", description: "Les interactions utilisateur obtiennent une réponse visuelle en moins de 200 ms.", isPreAudit: true },
  { code: "PERF04", label: "FCP (First Contentful Paint) < 1.8s", dimension: "cwv", description: "Le premier contenu visible s'affiche en moins de 1,8 seconde.", isPreAudit: true },
  { code: "PERF05", label: "TTFB (Time to First Byte) < 800ms", dimension: "cwv", description: "Le serveur répond en moins de 800 ms après la requête initiale.", isPreAudit: true },

  // === Assets (5 items) ===
  { code: "PERF06", label: "Poids total de la page < 2 Mo", dimension: "assets", description: "Le poids total de la page (HTML, CSS, JS, images, fonts) reste sous les 2 Mo.", isPreAudit: false },
  { code: "PERF07", label: "Images optimisées (WebP/AVIF, lazy loading)", dimension: "assets", description: "Les images utilisent des formats modernes (WebP/AVIF) et le chargement différé (lazy loading).", isPreAudit: false },
  { code: "PERF08", label: "Fonts web optimisées (≤2 familles, swap/optional)", dimension: "assets", description: "Maximum 2 familles de polices web, avec font-display: swap ou optional pour éviter le FOIT.", isPreAudit: false },
  { code: "PERF09", label: "Compression activée (gzip/brotli)", dimension: "assets", description: "Les ressources textuelles sont servies avec compression gzip ou brotli.", isPreAudit: false },
  { code: "PERF10", label: "CDN pour les ressources statiques", dimension: "assets", description: "Les ressources statiques (images, JS, CSS) sont servies via un CDN pour réduire la latence.", isPreAudit: false },

  // === JS/CSS (5 items) ===
  { code: "PERF11", label: "JavaScript non bloquant (defer/async)", dimension: "js_css", description: "Les scripts JS utilisent defer ou async pour ne pas bloquer le rendu de la page.", isPreAudit: false },
  { code: "PERF12", label: "CSS critique inliné / au-dessus de la ligne de flottaison", dimension: "js_css", description: "Le CSS critique est inliné ou chargé en priorité pour un rendu rapide au-dessus de la ligne de flottaison.", isPreAudit: false },
  { code: "PERF13", label: "Requêtes tierces limitées (analytics, widgets)", dimension: "js_css", description: "Le nombre de requêtes vers des domaines tiers (analytics, widgets, pubs) est maîtrisé.", isPreAudit: false },
  { code: "PERF14", label: "Service Worker / cache stratégique", dimension: "js_css", description: "Un Service Worker ou une stratégie de cache HTTP est en place pour les ressources récurrentes.", isPreAudit: false },
  { code: "PERF15", label: "Pas de scripts inutiles ou redondants", dimension: "js_css", description: "Aucun script JS inutilisé, dupliqué ou obsolète n'est chargé sur la page.", isPreAudit: false },
];

export const PERF_PRE_AUDIT_ITEMS = PERF_ITEMS.filter((item) => item.isPreAudit);

// Verify counts
if (PERF_ITEMS.length !== 15) {
  console.warn(`Expected 15 PERF items, got ${PERF_ITEMS.length}`);
}
if (PERF_PRE_AUDIT_ITEMS.length !== 5) {
  console.warn(`Expected 5 pre-audit PERF items, got ${PERF_PRE_AUDIT_ITEMS.length}`);
}

```


## `src/lib/scoring/tech-items.ts`

```typescript
/**
 * Définition des 15 items Technical.
 * Les 5 items marqués `isPreAudit: true` sont utilisés dans le pré-audit.
 * L'audit complet/ultra utilise les 15 items.
 */

export interface TechItemDef {
  code: string;
  label: string;
  dimension: string; // "stack" | "security" | "ia_access"
  description: string;
  isPreAudit: boolean;
}

export const TECH_ITEMS: TechItemDef[] = [
  // === Stack & Hosting (5 items) ===
  { code: "TECH01", label: "HTTPS avec redirection HTTP→HTTPS", dimension: "stack", description: "Le site force la connexion sécurisée via une redirection automatique HTTP vers HTTPS.", isPreAudit: true },
  { code: "TECH02", label: "Certificat SSL valide et à jour", dimension: "stack", description: "Le certificat SSL/TLS est valide, non expiré et émis par une autorité reconnue.", isPreAudit: true },
  { code: "TECH03", label: "Responsive design (4 breakpoints)", dimension: "stack", description: "Le site s'adapte correctement à 4 breakpoints (mobile, tablette, desktop, large desktop).", isPreAudit: true },
  { code: "TECH04", label: "Plateforme identifiée et à jour", dimension: "stack", description: "Le CMS ou framework utilisé est identifiable et dans une version récente/supportée.", isPreAudit: false },
  { code: "TECH05", label: "DNS correctement configuré (SPF/DKIM/DMARC si visible)", dimension: "stack", description: "La configuration DNS inclut les enregistrements SPF, DKIM et DMARC pour l'authentification email.", isPreAudit: false },

  // === Security Headers (5 items) ===
  { code: "TECH06", label: "Content-Security-Policy présent", dimension: "security", description: "L'en-tête Content-Security-Policy est défini pour limiter les sources de contenu autorisées.", isPreAudit: true },
  { code: "TECH07", label: "X-Frame-Options / X-Content-Type-Options présents", dimension: "security", description: "Les en-têtes X-Frame-Options et X-Content-Type-Options sont définis pour prévenir le clickjacking et le MIME sniffing.", isPreAudit: true },
  { code: "TECH08", label: "Referrer-Policy configurée", dimension: "security", description: "L'en-tête Referrer-Policy est défini pour contrôler les informations de référent transmises.", isPreAudit: false },
  { code: "TECH09", label: "Permissions-Policy configurée", dimension: "security", description: "L'en-tête Permissions-Policy est défini pour restreindre l'accès aux API navigateur (caméra, géolocalisation, etc.).", isPreAudit: false },
  { code: "TECH10", label: "Strict-Transport-Security (HSTS)", dimension: "security", description: "L'en-tête HSTS est défini pour forcer les connexions HTTPS sur une durée longue.", isPreAudit: false },

  // === IA Accessibility (5 items) ===
  { code: "TECH11", label: "robots.txt autorise les bots IA (GPTBot, ClaudeBot, PerplexityBot)", dimension: "ia_access", description: "Le fichier robots.txt n'interdit pas l'accès aux crawlers des moteurs IA principaux.", isPreAudit: false },
  { code: "TECH12", label: "llms.txt présent et renseigné", dimension: "ia_access", description: "Un fichier llms.txt est présent à la racine et fournit le contexte nécessaire aux LLM.", isPreAudit: false },
  { code: "TECH13", label: "sitemap.xml valide et à jour", dimension: "ia_access", description: "Le sitemap XML est présent, valide, référencé dans robots.txt et contient les pages actives.", isPreAudit: false },
  { code: "TECH14", label: "Données structurées schema.org (LocalBusiness, FAQ, etc.)", dimension: "ia_access", description: "Des données structurées schema.org pertinentes sont implémentées (LocalBusiness, FAQ, Organization, etc.).", isPreAudit: false },
  { code: "TECH15", label: "Pas d'anomalies techniques (copyright à jour, liens morts, erreurs console)", dimension: "ia_access", description: "Aucune anomalie technique visible : copyright à jour, pas de liens morts, pas d'erreurs JavaScript en console.", isPreAudit: false },
];

export const TECH_PRE_AUDIT_ITEMS = TECH_ITEMS.filter((item) => item.isPreAudit);

// Verify counts
if (TECH_ITEMS.length !== 15) {
  console.warn(`Expected 15 TECH items, got ${TECH_ITEMS.length}`);
}
if (TECH_PRE_AUDIT_ITEMS.length !== 5) {
  console.warn(`Expected 5 pre-audit TECH items, got ${TECH_PRE_AUDIT_ITEMS.length}`);
}

```


## `src/lib/scoring/contenu-items.ts`

```typescript
/**
 * Définition des 15 items Audit de Contenu.
 * Dimensions : profondeur, qualité, légal, potentiel GEO.
 * Les items marqués `isPreAudit: true` sont vérifiables en pré-audit automatisé.
 */

export interface ContenuItemDef {
  code: string;
  label: string;
  dimension: "depth" | "quality" | "legal" | "geo_potential";
  description: string;
  isPreAudit: boolean;
}

export const CONTENU_ITEMS: ContenuItemDef[] = [
  // === Depth (5 items) ===
  { code: "CONT01", label: "Pages principales avec contenu substantiel (>300 mots)", dimension: "depth", description: "Les pages stratégiques contiennent un contenu suffisamment développé (minimum 300 mots) pour apporter une réelle valeur au visiteur.", isPreAudit: true },
  { code: "CONT02", label: "FAQ structurée présente", dimension: "depth", description: "Une section FAQ est présente, structurée avec des balises sémantiques et idéalement balisée en schema.org FAQPage.", isPreAudit: true },
  { code: "CONT03", label: "Blog/actualités actif (publications récentes)", dimension: "depth", description: "Un espace blog ou actualités est maintenu avec des publications récentes (moins de 3 mois), démontrant une activité éditoriale régulière.", isPreAudit: true },
  { code: "CONT04", label: "Témoignages/cas clients présents", dimension: "depth", description: "Le site présente des témoignages clients ou des études de cas concrètes renforçant la crédibilité et l'expérience.", isPreAudit: false },
  { code: "CONT05", label: "Contenu multimédia (vidéos, infographies)", dimension: "depth", description: "Le contenu est enrichi par des éléments multimédias pertinents (vidéos, infographies, schémas) qui complètent le texte.", isPreAudit: false },

  // === Quality (5 items) ===
  { code: "CONT06", label: "Hiérarchie Hn claire et descriptive", dimension: "quality", description: "Les titres H1 à H6 forment une hiérarchie logique et descriptive qui structure le contenu de manière compréhensible.", isPreAudit: true },
  { code: "CONT07", label: "Lisibilité adaptée à l'audience (Flesch ≥ 50)", dimension: "quality", description: "Le niveau de lisibilité du contenu est adapté à l'audience cible, avec un score de lisibilité Flesch-Kincaid supérieur ou égal à 50.", isPreAudit: false },
  { code: "CONT08", label: "CTAs présents et clairs sur chaque page", dimension: "quality", description: "Chaque page dispose d'appels à l'action (CTA) visibles, explicites et pertinents guidant le visiteur vers l'étape suivante.", isPreAudit: true },
  { code: "CONT09", label: "Ton de voix cohérent et professionnel", dimension: "quality", description: "Le ton éditorial est uniforme sur l'ensemble du site, professionnel et adapté au positionnement de la marque.", isPreAudit: false },
  { code: "CONT10", label: "Contenu original (pas de texte générique/dupliqué)", dimension: "quality", description: "Le contenu est original, apporte une perspective unique et ne reprend pas du texte générique ou dupliqué d'autres sources.", isPreAudit: false },

  // === Legal (3 items) ===
  { code: "CONT11", label: "Politique de confidentialité conforme nLPD/RGPD", dimension: "legal", description: "Une politique de confidentialité est publiée, conforme à la nLPD suisse et au RGPD européen, détaillant les traitements de données.", isPreAudit: false },
  { code: "CONT12", label: "Mentions légales présentes et complètes", dimension: "legal", description: "Les mentions légales sont présentes avec les informations obligatoires : raison sociale, adresse, contact, numéro d'enregistrement.", isPreAudit: false },
  { code: "CONT13", label: "Gestion des cookies transparente (bannière + paramétrage)", dimension: "legal", description: "Un bandeau cookies conforme est présent avec possibilité de paramétrage granulaire (accepter, refuser, personnaliser).", isPreAudit: false },

  // === GEO Potential (2 items) ===
  { code: "CONT14", label: "Contenu structuré pour citabilité IA (données structurées, FAQ, réponses directes)", dimension: "geo_potential", description: "Le contenu est formaté pour être facilement extrait par les moteurs IA : données structurées schema.org, réponses directes aux questions, paragraphes autonomes et citables.", isPreAudit: false },
  { code: "CONT15", label: "Multilinguisme disponible (opportunité marché)", dimension: "geo_potential", description: "Le site propose du contenu dans plusieurs langues adaptées à son marché cible (FR/DE/EN pour la Suisse, par exemple).", isPreAudit: false },
];

export const CONTENU_PRE_AUDIT_ITEMS = CONTENU_ITEMS.filter((item) => item.isPreAudit);

// Verify counts
if (CONTENU_ITEMS.length !== 15) {
  console.warn(`Expected 15 CONTENU items, got ${CONTENU_ITEMS.length}`);
}

```


## `src/lib/scoring/rgesn-items.ts`

```typescript
/**
 * Définition des 20 items Éco-conception (RGESN).
 * Focus sur les critères observables côté client.
 * `isAuditableRemotely: false` pour les items nécessitant un accès serveur/code.
 */

export interface RgesnItemDef {
  code: string;
  label: string;
  dimension: "strategy" | "ux_ui" | "content" | "frontend" | "backend" | "hosting";
  description: string;
  isPreAudit: boolean;
  isAuditableRemotely: boolean;
}

export const RGESN_ITEMS: RgesnItemDef[] = [
  // === UX/UI (5 items) ===
  { code: "RGESN01", label: "Pas d'autoplay vidéo/audio", dimension: "ux_ui", description: "Aucune vidéo ou piste audio ne se lance automatiquement au chargement de la page (réf. RGESN 4.1).", isPreAudit: true, isAuditableRemotely: true },
  { code: "RGESN02", label: "Pas de scroll infini", dimension: "ux_ui", description: "Le site utilise une pagination classique plutôt qu'un défilement infini qui charge du contenu en continu (réf. RGESN 4.2).", isPreAudit: true, isAuditableRemotely: true },
  { code: "RGESN03", label: "Composants natifs privilégiés (pas de surcouche JS)", dimension: "ux_ui", description: "Les composants d'interface utilisent les éléments HTML natifs plutôt que des surcouches JavaScript lourdes (réf. RGESN 4.5).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN04", label: "Sobriété média (vidéos/animations limitées au nécessaire)", dimension: "ux_ui", description: "Les vidéos et animations sont utilisées uniquement quand elles apportent une valeur informationnelle réelle (réf. RGESN 4.7).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN05", label: "≤2 familles de polices, poids total ≤ 400Ko", dimension: "ux_ui", description: "Le site utilise au maximum 2 familles de polices pour un poids total n'excédant pas 400 Ko (réf. RGESN 4.8).", isPreAudit: true, isAuditableRemotely: true },

  // === Content (5 items) ===
  { code: "RGESN06", label: "Images au format adapté (WebP/AVIF)", dimension: "content", description: "Les images sont servies dans des formats modernes et efficaces comme WebP ou AVIF (réf. RGESN 5.1).", isPreAudit: true, isAuditableRemotely: true },
  { code: "RGESN07", label: "Images compressées et redimensionnées", dimension: "content", description: "Les images sont compressées de manière adaptée à leur usage et redimensionnées aux dimensions nécessaires (réf. RGESN 5.2).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN08", label: "Vidéos en définition adaptée au contexte", dimension: "content", description: "Les vidéos sont servies dans une résolution adaptée au contexte d'affichage et au terminal (réf. RGESN 5.3).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN09", label: "Mode audio seul disponible pour les vidéos", dimension: "content", description: "Un mode écoute seule est proposé pour les vidéos dont le contenu audio est suffisant (réf. RGESN 5.5).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN10", label: "Contenus obsolètes archivés/supprimés", dimension: "content", description: "Les contenus périmés ou obsolètes sont archivés ou supprimés régulièrement (réf. RGESN 5.8).", isPreAudit: false, isAuditableRemotely: true },

  // === Frontend (5 items) ===
  { code: "RGESN11", label: "Poids page + requêtes limités par écran", dimension: "frontend", description: "Le poids total de la page et le nombre de requêtes HTTP sont maîtrisés et limités (réf. RGESN 6.1).", isPreAudit: true, isAuditableRemotely: true },
  { code: "RGESN12", label: "Cache navigateur configuré", dimension: "frontend", description: "Les en-têtes de cache HTTP (Cache-Control, ETag) sont correctement configurés pour les ressources statiques (réf. RGESN 6.2).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN13", label: "Ressources compressées (gzip/brotli)", dimension: "frontend", description: "Les ressources textuelles (HTML, CSS, JS) sont servies avec compression gzip ou brotli (réf. RGESN 6.3).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN14", label: "Dimensions images = dimensions affichage", dimension: "frontend", description: "Les images sont servies aux dimensions réelles d'affichage, sans redimensionnement côté navigateur (réf. RGESN 6.4).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN15", label: "Pas de ressources inutiles chargées", dimension: "frontend", description: "Aucune ressource (JS, CSS, police, image) n'est chargée sans être effectivement utilisée sur la page (réf. RGESN 6.5).", isPreAudit: false, isAuditableRemotely: true },

  // === Backend/Hosting (5 items) ===
  { code: "RGESN16", label: "Cache serveur configuré", dimension: "backend", description: "Un mécanisme de cache côté serveur est en place pour éviter les recalculs inutiles (réf. RGESN 7.1).", isPreAudit: false, isAuditableRemotely: false },
  { code: "RGESN17", label: "Durées de rétention des données définies", dimension: "backend", description: "Les durées de conservation des données sont définies et les données expirées sont purgées (réf. RGESN 7.2).", isPreAudit: false, isAuditableRemotely: false },
  { code: "RGESN18", label: "Hébergement éco-responsable", dimension: "hosting", description: "L'hébergeur affiche une politique environnementale et des engagements mesurables (réf. RGESN 8.1).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN19", label: "Énergie renouvelable documentée", dimension: "hosting", description: "L'hébergeur documente sa part d'énergie renouvelable dans son mix énergétique (réf. RGESN 8.5).", isPreAudit: false, isAuditableRemotely: false },
  { code: "RGESN20", label: "Localisation serveur cohérente avec audience", dimension: "hosting", description: "Les serveurs sont géographiquement proches de l'audience cible pour minimiser la latence et l'empreinte réseau (réf. RGESN 8.6).", isPreAudit: false, isAuditableRemotely: true },
];

export const RGESN_PRE_AUDIT_ITEMS = RGESN_ITEMS.filter((item) => item.isPreAudit);
export const RGESN_REMOTE_AUDITABLE_ITEMS = RGESN_ITEMS.filter((item) => item.isAuditableRemotely);

// Verify counts
if (RGESN_ITEMS.length !== 20) {
  console.warn(`Expected 20 RGESN items, got ${RGESN_ITEMS.length}`);
}

```

