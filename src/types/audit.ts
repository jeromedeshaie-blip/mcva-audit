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

export interface CoreEeatScores {
  C: number;
  O: number;
  R: number;
  E: number;
  Exp: number;
  Ept: number;
  A: number;
  T: number;
}

export interface CiteScores {
  C: number;
  I: number;
  T: number;
  E: number;
}

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

  // Semrush only (Palier 2) — null in Palier 1
  organic_traffic: number | null;
  organic_keywords: number | null;
  authority_score: number | null;
  backlinks_total: number | null;
  referring_domains: number | null;
  top_keywords: TopKeyword[] | null;
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
}

export interface AIModelResult {
  model: string; // "claude", "gpt-4o", "perplexity", "gemini", etc.
  mentioned: boolean;
  citation_text: string | null;
  sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
  context: string | null; // dans quel contexte la marque est citée
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

// --- User ---

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}
