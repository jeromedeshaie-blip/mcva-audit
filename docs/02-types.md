# 02 — Types partagés

**Module** : 02 — Types partagés
**Version** : 2.1 (tag `v2.1-release`)

Types TypeScript centraux utilisés dans toute l'app.

---

## `src/types/audit.ts`

```typescript
// ============================================================
// Types centraux de la plateforme Audit SEO/GEO MCVA
// ============================================================

// --- Enums ---

export type AuditType = "express" | "full" | "pre_audit" | "ultra";
export type AuditTheme = "seo" | "geo" | "perf" | "a11y" | "rgesn" | "tech" | "contenu";
export type AuditStatus = "pending" | "processing" | "completed" | "error";
export type ItemStatus = "pass" | "partial" | "fail";
export type Framework = "core_eeat" | "cite" | "perf" | "a11y" | "rgesn" | "tech" | "contenu";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type UserRole = "analyst" | "bizdev" | "admin";
export type QualityLevel = "eco" | "standard" | "premium" | "ultra" | "dryrun";

// CORE-EEAT dimensions
export type CoreEeatDimension = "C" | "O" | "R" | "E" | "Exp" | "Ept" | "A" | "T";

// CITE dimensions
export type CiteDimension = "C" | "I" | "T" | "E";

// --- Audit ---

export interface Audit {
  id: string;
  url: string;
  domain: string;
  sector: string | null;
  audit_type: AuditType;
  theme: AuditTheme | null;
  themes: AuditTheme[];
  reference: string | null;
  brand_name: string | null;
  status: AuditStatus;
  parent_audit_id: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  is_spa: boolean;
}

// --- Scores ---

export type CoreEeatScores = Record<string, number>;

export type CiteScores = Record<string, number>;

export interface AuditScores {
  id: string;
  audit_id: string;
  score_seo: number;
  score_geo: number;
  score_perf: number | null;
  score_a11y: number | null;
  score_rgesn: number | null;
  score_tech: number | null;
  score_contenu: number | null;
  score_global: number | null;
  score_core_eeat: CoreEeatScores;
  score_cite: CiteScores;
  seo_provider: "free" | "semrush";
  seo_data: SeoData;
  geo_provider: "direct_ai" | "qwairy";
  geo_data: GeoData;
  perf_data: Record<string, unknown>;
  a11y_data: Record<string, unknown>;
  rgesn_data: Record<string, unknown>;
  tech_data: Record<string, unknown>;
  contenu_data: Record<string, unknown>;
  competitors: CompetitorData[] | null;
}

// --- Audit Uploads (Semrush/Qwairy CSV) ---

export interface AuditUpload {
  id: string;
  audit_id: string;
  source: "semrush" | "qwairy" | "pagespeed";
  file_name: string;
  file_type: string;
  file_size: number;
  parsed_data: Record<string, unknown>;
  status: "pending" | "parsing" | "parsed" | "error";
  error_message: string | null;
  uploaded_by: string;
  created_at: string;
}

// --- Theme metadata ---

export const THEME_LABELS: Record<AuditTheme, string> = {
  seo: "SEO",
  geo: "GEO / Score GEO™",
  perf: "Performance",
  a11y: "Accessibilité",
  rgesn: "Éco-conception (RGESN)",
  tech: "Technique",
  contenu: "Contenu",
};

export const AUDIT_LEVEL_LABELS: Record<AuditType, string> = {
  pre_audit: "Pré-Audit",
  express: "Pré-Audit",
  full: "Audit Complet",
  ultra: "Ultra Audit",
};

export const THEME_PRICES: Record<AuditTheme, number> = {
  seo: 990,
  geo: 1490,
  perf: 490,
  a11y: 1490,
  rgesn: 990,
  tech: 490,
  contenu: 490,
};

/**
 * Ultra Audit global score weights per theme.
 *
 * ⚠️ Centralized in src/lib/scoring/constants.ts (THEME_WEIGHTS).
 * This export is kept for backward compatibility.
 */
import { THEME_WEIGHTS } from "@/lib/scoring/constants";
export const GLOBAL_SCORE_WEIGHTS: Record<AuditTheme, number> = THEME_WEIGHTS;

// --- SEO Data (provider-agnostic) ---

export interface SeoData {
  // Available in both tiers
  meta_title: string | null;
  meta_description: string | null;
  h1_count: number;
  h2_count: number;
  has_schema_org: boolean;
  schema_types: string[];
  internal_links_count: number;
  external_links_count: number;
  images_without_alt: number;
  page_speed_score: number | null;
  core_web_vitals: CoreWebVitals | null;

  // Technical checks (enriched from SITEAUDIT spec)
  technical_checks?: TechnicalCheck[];
  schema_detail?: SchemaDetail;
  readability?: ReadabilityData;
  has_https?: boolean;
  has_viewport?: boolean;
  has_canonical?: boolean;
  canonical_url?: string | null;
  has_robots_txt?: boolean;
  has_sitemap?: boolean;
  sitemap_url?: string | null;
  hreflang_tags?: { lang: string; href: string }[];
  meta_title_length?: number | null;
  meta_description_length?: number | null;

  // Site Audit composite scores (enriched in full audit)
  site_audit_scores?: {
    seo: number;
    performance: number;
    accessibility: number;
    readability: number;
  };
  site_audit_global?: number;
  performance_data?: {
    mobile: { score: number; lcp: number; cls: number; fid: number; ttfb: number; fcp: number; mobile_score: number; desktop_score: number };
    desktop: { score: number; lcp: number; cls: number; fid: number; ttfb: number; fcp: number; mobile_score: number; desktop_score: number };
    score: number;
  };

  // Semrush only (Palier 2) — null in Palier 1
  organic_traffic: number | null;
  organic_keywords: number | null;
  authority_score: number | null;
  backlinks_total: number | null;
  referring_domains: number | null;
  top_keywords: TopKeyword[] | null;
}

// --- Technical Audit Checks ---

export type TechCheckStatus = "pass" | "warn" | "fail";

export interface TechnicalCheck {
  id: string;
  label: string;
  status: TechCheckStatus;
  value?: string;
  expected?: string;
  impact: "seo" | "geo" | "both";
  description?: string;
}

export interface SchemaDetail {
  schemas_found: string[];
  has_local_business: boolean;
  has_faq: boolean;
  has_breadcrumb: boolean;
  has_website: boolean;
  issues: string[];
}

export interface ReadabilityData {
  flesch_score: number;
  flesch_level: string;
  lang_detected: string;
  avg_sentence_length: number;
  avg_word_length: number;
  word_count: number;
}

export interface CoreWebVitals {
  lcp: number | null; // Largest Contentful Paint (ms)
  fid: number | null; // First Input Delay (ms)
  cls: number | null; // Cumulative Layout Shift
  inp: number | null; // Interaction to Next Paint (ms)
  ttfb: number | null; // Time to First Byte (ms)
}

export interface TopKeyword {
  keyword: string;
  position: number;
  volume: number;
}

// --- GEO Data (provider-agnostic) ---

export interface GeoData {
  ai_visibility_score: number; // 0-100
  models_tested: AIModelResult[];
  brand_mentioned: boolean;
  brand_sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
  citation_count: number;
  models_coverage: number; // nombre de modèles testés
  _all_models_failed?: boolean; // true if every model API call failed
  _errors?: string[]; // error messages when models failed
}

export interface AIModelResult {
  model: string; // "claude", "gpt-4o", "perplexity", "gemini", etc.
  mentioned: boolean;
  citation_text: string | null;
  sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
  context: string | null; // dans quel contexte la marque est citée
  quality_score?: number; // 0-100: quality of the mention (position, recommendation, detail)
  mention_position?: "first" | "top3" | "listed" | "not_mentioned"; // where in the response
  is_recommended?: boolean; // explicitly recommended by the model
  _actually_tested?: boolean; // false if API key was missing (won't count in scoring)
}

// --- Audit Items (CORE-EEAT / CITE) ---

export interface AuditItem {
  id: string;
  audit_id: string;
  framework: Framework;
  dimension: string;
  item_code: string;
  item_label: string;
  status: ItemStatus;
  score: number;
  notes: string | null;
  is_geo_first: boolean;
  is_express_item: boolean;
}

// --- Action Plan ---

export interface AuditAction {
  id: string;
  audit_id: string;
  priority: Priority;
  title: string;
  description: string;
  impact_points: number;
  effort: string;
  category: "SEO" | "GEO" | "contenu" | "technique" | "notoriete";
  theme?: string;
  kpi?: string;
}

// --- Competitors ---

export interface CompetitorData {
  domain: string;
  score_seo: number | null;
  score_geo: number | null;
  organic_traffic: number | null;
  authority_score: number | null;
}

// --- Sector Rankings ---

export interface SectorRanking {
  id: string;
  sector: string;
  domain: string;
  score_seo: number;
  score_geo: number;
  rank_seo: number;
  rank_geo: number;
  week_of: string;
  created_at: string;
}

// --- Benchmarks ---

export type BenchmarkStatus = "draft" | "running" | "completed" | "error";

export interface Benchmark {
  id: string;
  name: string;
  sub_category: string;
  geographic_scope: string;
  status: BenchmarkStatus;
  domains_count: number;
  completed_count: number;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface BenchmarkDomain {
  id: string;
  benchmark_id: string;
  domain: string;
  url: string;
  audit_id: string | null;
  rank_seo: number | null;
  rank_geo: number | null;
  score_seo: number | null;
  score_geo: number | null;
}

// --- User ---

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

```

