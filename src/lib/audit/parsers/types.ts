/**
 * Types communs pour les 6 blocs A-F (POLE-PERF v2.1 § 6.4).
 */

// Bloc A — Ahrefs Webmaster Tools
export interface BlocAData {
  domain_rating: number | null;
  backlinks_total: number | null;
  referring_domains: number | null;
  top_referring_domains: Array<{ domain: string; dr: number }>;
  new_backlinks_30d: number | null;
  lost_backlinks_30d: number | null;
  positioned_keywords: number | null;
  top_keywords: Array<{
    keyword: string;
    position: number;
    volume: number | null;
    url: string | null;
  }>;
}

// Bloc B — Google Search Console
export interface BlocBData {
  total_clicks: number | null;
  total_impressions: number | null;
  avg_ctr: number | null;
  avg_position: number | null;
  period_months: number | null; // default 16
  top_queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number | null;
    position: number;
  }>;
  top_pages: Array<{
    url: string;
    clicks: number;
    impressions: number;
  }>;
  brand_vs_nonbrand?: {
    brand_clicks: number;
    nonbrand_clicks: number;
  };
}

// Bloc C — Google Analytics 4
export interface BlocCData {
  sessions_organic: number | null;
  users_organic: number | null;
  engagement_rate: number | null;
  avg_session_duration_sec: number | null;
  conversions_organic: number | null;
  period_months: number | null; // default 12
}

// Bloc D — Concurrents (Moz + SimilarWeb + Seobility)
export interface BlocDCompetitor {
  name: string;
  domain: string;
  moz_da: number | null;
  moz_spam_score: number | null;
  similarweb_traffic_monthly: number | null;
  similarweb_top_countries: string[];
  similarweb_top_keywords: string[];
  seobility_backlinks_total: number | null;
  top_10_referring_domains: string[];
}

export interface BlocDData {
  competitors: BlocDCompetitor[];
}

// Bloc E — Google Keyword Planner CH
export interface BlocEKeyword {
  keyword: string;
  volume_monthly: number;
  competition: "low" | "medium" | "high" | null;
  cpc_estimate_chf?: number | null;
}

export interface BlocEData {
  language: "fr" | "de" | "it" | "en" | string;
  country: "CH" | string;
  keywords: BlocEKeyword[];
}

// Bloc F — LLM Watch (structure alignée avec llmwatch_scores)
export interface BlocFData {
  dashboard_url: string | null;
  score_geo: number;
  score_presence: number;
  score_exactitude: number;
  score_sentiment: number;
  score_recommendation: number;
  score_by_llm: Record<string, number>;
  mention_rate_by_llm?: Record<string, number>;
  sample_queries: Array<{
    query: string;
    llm: string;
    cited: boolean;
    snippet?: string;
  }>;
  competitors_sov?: Array<{
    competitor: string;
    mention_rate: number;
    sov: number;
    avg_position?: number;
  }>;
  model_snapshot_version: string | null;
  run_count: number | null;
  score_stddev: number | null;
  run_level: string | null;
}

export type BlocData = BlocAData | BlocBData | BlocCData | BlocDData | BlocEData | BlocFData;

export interface ParseResult<T> {
  data: T;
  errors: string[];
  warnings: string[];
}
