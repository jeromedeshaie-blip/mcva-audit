export type LlmProvider = "openai" | "anthropic" | "perplexity" | "gemini";
export type Lang = "fr" | "de" | "en";
export type ClientPlan = "starter" | "business" | "enterprise";
export type MonitoringFrequency = "weekly" | "monthly" | "quarterly" | "manual";

export interface LlmWatchClient {
  id: string;
  name: string;
  sector: string;
  location: string;
  plan: ClientPlan;
  contact_email: string;
  active: boolean;
  monitoring_frequency: MonitoringFrequency;
  last_monitored_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LlmWatchQuery {
  id: string;
  client_id: string;
  text_fr: string;
  text_de: string | null;
  text_en: string | null;
  active: boolean;
  created_at: string;
}

export interface LlmWatchScore {
  id: string;
  client_id: string;
  week_start: string;
  score: number;
  score_by_llm: Record<LlmProvider, number>;
  score_by_lang: Record<Lang, number>;
  citation_rate: number;
  created_at: string;
}

export interface LlmWatchCitation {
  id: string;
  client_id: string;
  query_id: string;
  llm: LlmProvider;
  lang: Lang;
  response_raw: string | null;
  cited: boolean;
  rank: number | null;
  snippet: string | null;
  collected_at: string;
}

export interface LlmWatchCompetitor {
  id: string;
  client_id: string;
  name: string;
  keywords: string[];
  active: boolean;
}

export interface CompetitorScore {
  id: string;
  competitor_id: string;
  client_id: string;
  name?: string;
  week_start: string;
  score: number;
  score_by_llm: Record<LlmProvider, number>;
  created_at: string;
}

export interface LlmWatchReport {
  id: string;
  client_id: string;
  period: string;
  pdf_url: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface LlmWatchRecommendation {
  id: string;
  client_id: string;
  week_start: string;
  priority: number; // 1=haute, 2=moyenne, 3=basse
  category: "content" | "technical" | "brand" | "competitive" | "multilingual";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  created_at: string;
}

export interface LlmWatchAlert {
  id: string;
  client_id: string;
  competitor_id: string | null;
  alert_type: "competitor_gain" | "competitor_loss" | "client_drop";
  delta: number;
  llm: LlmProvider | null;
  message: string;
  sent_at: string | null;
  created_at: string;
}
