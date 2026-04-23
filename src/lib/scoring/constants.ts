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
