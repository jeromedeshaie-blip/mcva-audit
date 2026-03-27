export type AuditStatus = "pass" | "warn" | "fail";
export type Priority = "critical" | "high" | "medium" | "low";

export interface SeoCheck {
  id: string;
  label: string;
  status: AuditStatus;
  value?: string;
  expected?: string;
  impact: "seo" | "geo" | "both";
  description?: string;
}

export interface PerformanceData {
  score: number;
  lcp: number;
  cls: number;
  fid: number;
  ttfb: number;
  fcp: number;
  mobile_score: number;
  desktop_score: number;
}

export interface AccessibilityViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  nodes_count: number;
  wcag_criteria: string;
}

export interface ReadabilityData {
  flesch_score: number;
  flesch_level: string;
  lang_detected: string;
  avg_sentence_length: number;
  avg_word_length: number;
  keyword_density: Record<string, number>;
  word_count: number;
}

export interface SchemaData {
  schemas_found: string[];
  has_local_business: boolean;
  has_faq: boolean;
  has_breadcrumb: boolean;
  has_website: boolean;
  issues: string[];
}

export interface AuditRecommendation {
  id: string;
  priority: Priority;
  dimension: "seo" | "performance" | "accessibility" | "readability" | "geo";
  title: string;
  description: string;
  action: string;
  impact_points: number;
  effort: "low" | "medium" | "high";
}

export interface SiteAuditResult {
  url: string;
  audited_at: string;
  score_global: number;
  score_seo: number;
  score_performance: number;
  score_accessibility: number;
  score_readability: number;
  seo_checks: SeoCheck[];
  performance_data: PerformanceData;
  accessibility_data: AccessibilityViolation[];
  readability_data: ReadabilityData;
  schema_data: SchemaData;
  recommendations: AuditRecommendation[];
  pages_crawled: number;
  crawl_duration_ms: number;
  error?: string;
}
