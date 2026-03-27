// ============================================================
// Types centraux de la plateforme Audit SEO/GEO MCVA
// ============================================================

// --- Enums ---

export type AuditType = "express" | "full";
export type AuditStatus = "pending" | "processing" | "completed" | "error";
export type ItemStatus = "pass" | "partial" | "fail";
export type Framework = "core_eeat" | "cite";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type UserRole = "analyst" | "bizdev" | "admin";
export type QualityLevel = "eco" | "standard" | "premium";

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
  status: AuditStatus;
  parent_audit_id: string | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

// --- Scores ---

export type CoreEeatScores = Record<string, number>;

export type CiteScores = Record<string, number>;

export interface AuditScores {
  id: string;
  audit_id: string;
  score_seo: number;
  score_geo: number;
  score_core_eeat: CoreEeatScores;
  score_cite: CiteScores;
  seo_provider: "free" | "semrush";
  seo_data: SeoData;
  geo_provider: "direct_ai" | "qwairy";
  geo_data: GeoData;
  competitors: CompetitorData[] | null;
}

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
