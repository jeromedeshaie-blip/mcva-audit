# 04 — LLM Watch v2

**Module** : 04 — LLM Watch v2
**Version** : 2.1 (tag `v2.1-release`)

Monitoring Score GEO™ propriétaire MCVA. 4 LLMs (OpenAI/Anthropic/Perplexity/Gemini), LLM-as-judge, 4 composantes du Score GEO™.

---

## `src/lib/llmwatch/types.ts`

```typescript
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
  model_snapshot_version: string | null;
  models_used: Record<LlmProvider, string> | null;
  run_level: string | null;
  run_count: number;
  score_stddev: number | null;
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

```


## `src/lib/llmwatch/scoring.ts`

```typescript
import type { LlmProvider, Lang } from "./types";

export interface RawResult {
  llm: LlmProvider;
  lang: Lang;
  cited: boolean;
  rank: number | null;
}

/** Pondération par LLM (volumétrie marché 2026) */
const LLM_WEIGHTS: Record<LlmProvider, number> = {
  openai: 0.35,
  perplexity: 0.3,
  anthropic: 0.2,
  gemini: 0.15,
};

/** Score de rang : 1er = 1.0, 2e = 0.75, 3e = 0.5, 4e+ = 0.25 */
function rankScore(rank: number | null): number {
  if (!rank) return 0;
  const weights: Record<number, number> = { 1: 1.0, 2: 0.75, 3: 0.5 };
  return weights[rank] ?? 0.25;
}

export function computeScore(results: RawResult[]): {
  score: number;
  scoreByLlm: Record<string, number>;
  scoreByLang: Record<string, number>;
  citationRate: number;
} {
  if (!results.length)
    return { score: 0, scoreByLlm: {}, scoreByLang: {}, citationRate: 0 };

  // Taux de citation global
  const cited = results.filter((r) => r.cited);
  const citationRate = (cited.length / results.length) * 100;

  // Score pondéré par LLM
  const weightedScore = results.reduce((sum, r) => {
    const w = LLM_WEIGHTS[r.llm] ?? 0.1;
    return sum + w * rankScore(r.rank);
  }, 0);

  // Score par LLM (pour le dashboard)
  const scoreByLlm: Record<string, number> = {};
  for (const llm of Object.keys(LLM_WEIGHTS)) {
    const llmResults = results.filter((r) => r.llm === llm);
    if (!llmResults.length) {
      scoreByLlm[llm] = 0;
      continue;
    }
    const llmCited = llmResults.filter((r) => r.cited);
    const llmRate = llmCited.length / llmResults.length;
    const llmRank =
      llmCited.reduce((s, r) => s + rankScore(r.rank), 0) /
      (llmCited.length || 1);
    scoreByLlm[llm] = Math.round((llmRate * 0.6 + llmRank * 0.4) * 100);
  }

  // Score par langue
  const scoreByLang: Record<string, number> = {};
  for (const lang of ["fr", "de", "en"] as const) {
    const langResults = results.filter((r) => r.lang === lang);
    if (!langResults.length) {
      scoreByLang[lang] = 0;
      continue;
    }
    const langCited = langResults.filter((r) => r.cited);
    scoreByLang[lang] = Math.round(
      (langCited.length / langResults.length) * 100
    );
  }

  // Score composite final 0–100
  const avgRank = cited.length
    ? cited.reduce((s, r) => s + rankScore(r.rank), 0) / cited.length
    : 0;
  const score = Math.min(
    Math.round(
      (citationRate / 100) * 0.5 * 100 +
        avgRank * 0.3 * 100 +
        weightedScore * 0.2 * 100
    ),
    100
  );

  return {
    score,
    scoreByLlm,
    scoreByLang,
    citationRate: Math.round(citationRate),
  };
}

```


## `src/lib/llmwatch/validation.ts`

```typescript
/**
 * LLM Watch — Validation d'artefacts (section 13 POLE-PERF v2.1)
 *
 * "Ne jamais utiliser un artefact comme mesure."
 *
 * Pendant l'audit FDM (avril 2026), deux exports LLM Watch brisés ont été rejetés :
 * - scores dérivés de 0 réponses analysées (impossible)
 * - citation rate à 9143 % (hors borne)
 * - queries malformées
 *
 * Ce module détecte ces anomalies avant qu'elles ne polluent un audit.
 */

import type { LlmWatchScore } from "./types";

export interface ValidationIssue {
  severity: "error" | "warning";
  field: string;
  message: string;
  actual?: unknown;
  expected?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Liste formatée pour bug backlog (Linear/Jira/GitHub Issues). */
  backlogEntry: string | null;
}

/**
 * Valide un snapshot Score GEO™. Retourne valid=false si anomalie critique.
 * La convention POLE-PERFORMANCE v2.1 : "produire un bug backlog avant de continuer".
 */
export function validateLlmWatchScore(
  score: Partial<LlmWatchScore> & { total_responses?: number | null; citation_rate?: number | null }
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Score GEO™ global doit être dans 0-100
  if (typeof score.score === "number") {
    if (score.score < 0 || score.score > 100) {
      issues.push({
        severity: "error",
        field: "score",
        message: "Score GEO™ hors borne [0, 100]",
        actual: score.score,
        expected: "0 ≤ score ≤ 100",
      });
    }
  }

  // Chaque composante 0-25
  const components = [
    { key: "score_presence", label: "Présence" },
    { key: "score_exactitude", label: "Exactitude" },
    { key: "score_sentiment", label: "Sentiment" },
    { key: "score_recommendation", label: "Recommandation" },
  ] as const;

  for (const { key, label } of components) {
    const v = (score as any)[key];
    if (v != null && typeof v === "number") {
      if (v < 0 || v > 25) {
        issues.push({
          severity: "error",
          field: key,
          message: `Composante ${label} hors borne [0, 25]`,
          actual: v,
          expected: "0 ≤ valeur ≤ 25",
        });
      }
    }
  }

  // Citation rate doit être dans 0-1 (ratio) ou 0-100 (%) — on tolère les deux conventions
  if (typeof score.citation_rate === "number") {
    if (score.citation_rate < 0) {
      issues.push({
        severity: "error",
        field: "citation_rate",
        message: "Citation rate négatif (impossible)",
        actual: score.citation_rate,
      });
    } else if (score.citation_rate > 100) {
      // Exemple FDM: 9143 %
      issues.push({
        severity: "error",
        field: "citation_rate",
        message: "Citation rate anormalement élevé (>100)",
        actual: score.citation_rate,
        expected: "0 ≤ rate ≤ 1 (ratio) ou 0 ≤ rate ≤ 100 (%)",
      });
    }
  }

  // Score dérivé de 0 réponses analysées = invalide
  if (typeof score.total_responses === "number" && score.total_responses === 0) {
    issues.push({
      severity: "error",
      field: "total_responses",
      message: "Score calculé à partir de 0 réponses (artefact — rejeter)",
      actual: 0,
      expected: "total_responses > 0",
    });
  }

  // Métadonnées v2 attendues (POLE-PERF section 6.4 bloc F)
  if (!score.model_snapshot_version) {
    issues.push({
      severity: "warning",
      field: "model_snapshot_version",
      message: "model_snapshot_version manquant — reproductibilité non garantie",
    });
  }
  if (!score.models_used) {
    issues.push({
      severity: "warning",
      field: "models_used",
      message: "models_used manquant — source LLMs non tracée",
    });
  }

  const hasError = issues.some((i) => i.severity === "error");
  const backlogEntry = hasError ? formatBugBacklog(score, issues) : null;

  return {
    valid: !hasError,
    issues,
    backlogEntry,
  };
}

/**
 * Formate un rapport de bug pour Linear/Jira/GitHub Issues.
 * Section 13 POLE-PERF : "produire un bug backlog avant de continuer".
 */
function formatBugBacklog(
  score: Partial<LlmWatchScore>,
  issues: ValidationIssue[]
): string {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  const lines: string[] = [
    `**Bug: LLM Watch artifact — snapshot ${score.id || "unknown"}**`,
    ``,
    `**Client**: ${score.client_id || "unknown"}`,
    `**Week**: ${score.week_start || "unknown"}`,
    `**Score**: ${score.score ?? "null"}/100`,
    ``,
    `### Errors (${errors.length})`,
  ];
  for (const e of errors) {
    lines.push(`- **${e.field}**: ${e.message}`);
    if (e.actual !== undefined) lines.push(`  - Actual: \`${JSON.stringify(e.actual)}\``);
    if (e.expected) lines.push(`  - Expected: \`${e.expected}\``);
  }
  if (warnings.length > 0) {
    lines.push(``, `### Warnings (${warnings.length})`);
    for (const w of warnings) {
      lines.push(`- **${w.field}**: ${w.message}`);
    }
  }
  lines.push(
    ``,
    `### Action`,
    `Rejeter cet artefact. Ne pas l'utiliser dans le rapport d'audit.`,
    `Relancer un monitoring propre via LLM Watch avant de finaliser.`,
    ``,
    `_Détecté par validateLlmWatchScore() — POLE-PERF v2.1 section 13._`,
  );
  return lines.join("\n");
}

/**
 * Valide aussi les raw_results (queries individuelles).
 */
export interface RawResultCheck {
  query_text?: string | null;
  response_raw?: string | null;
  cited?: boolean | null;
  sentiment_score?: number | null;
}

export function validateRawResult(r: RawResultCheck): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!r.query_text || r.query_text.trim().length === 0) {
    issues.push({
      severity: "error",
      field: "query_text",
      message: "Query vide ou manquante",
    });
  }

  if (typeof r.sentiment_score === "number") {
    if (r.sentiment_score < -1 || r.sentiment_score > 1) {
      issues.push({
        severity: "error",
        field: "sentiment_score",
        message: "Sentiment score hors borne [-1, +1]",
        actual: r.sentiment_score,
      });
    }
  }

  return issues;
}

```


## `src/lib/llmwatch/alerts.ts`

```typescript
import type { LlmWatchAlert } from "./types";

const ALERT_THRESHOLD = 10; // points de variation minimum pour déclencher une alerte

interface ScoreEntry {
  id: string;
  name: string;
  currentScore: number;
  previousScore: number;
  isClient: boolean;
  competitorId?: string;
}

/**
 * Détecte les alertes basées sur les variations de score semaine/semaine.
 */
export function detectAlerts(
  clientId: string,
  entries: ScoreEntry[]
): Omit<LlmWatchAlert, "id" | "created_at">[] {
  const alerts: Omit<LlmWatchAlert, "id" | "created_at">[] = [];

  for (const entry of entries) {
    const delta = entry.currentScore - entry.previousScore;

    if (Math.abs(delta) < ALERT_THRESHOLD) continue;

    if (entry.isClient && delta < 0) {
      alerts.push({
        client_id: clientId,
        competitor_id: null,
        alert_type: "client_drop",
        delta,
        llm: null,
        message: `${entry.name} a perdu ${Math.abs(delta)} pts de visibilité cette semaine (${entry.previousScore} → ${entry.currentScore})`,
        sent_at: null,
      });
    } else if (!entry.isClient) {
      alerts.push({
        client_id: clientId,
        competitor_id: entry.competitorId || null,
        alert_type: delta > 0 ? "competitor_gain" : "competitor_loss",
        delta,
        llm: null,
        message: `${entry.name} ${delta > 0 ? "a gagné" : "a perdu"} ${Math.abs(delta)} pts (${entry.previousScore} → ${entry.currentScore})`,
        sent_at: null,
      });
    }
  }

  return alerts;
}

```


## `src/lib/llm-providers.ts`

```typescript
// src/lib/llm-providers.ts
// Interface unifiée pour interroger les 4 LLMs du Score GEO™

export interface LLMResponse {
  provider: string;
  model: string;
  query: string;
  response: string;
  tokensUsed: number;
  latencyMs: number;
  costUsd: number;
}

interface ProviderConfig {
  name: string;
  model: string;
  apiKey: string;
  endpoint: string;
}

// Bump this date string every time you update model snapshots below.
// Stored alongside each score for reproducibility audit trails.
export const MODEL_SNAPSHOT_VERSION = "2026-04-08";

const PROVIDERS: ProviderConfig[] = [
  {
    name: "openai",
    // Pinned snapshot — update manually every 6 months after testing
    model: "gpt-4o-2024-11-20",
    apiKey: process.env.OPENAI_API_KEY!,
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
  {
    name: "anthropic",
    // Pinned snapshot — claude-sonnet-4-5-20250929 is latest stable
    model: "claude-sonnet-4-5-20250929",
    apiKey: process.env.ANTHROPIC_API_KEY!,
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  {
    name: "perplexity",
    // Perplexity does not offer dated snapshots — limitation documented
    model: "sonar-pro",
    apiKey: process.env.PERPLEXITY_API_KEY!,
    endpoint: "https://api.perplexity.ai/chat/completions",
  },
  {
    name: "gemini",
    // Pinned to Gemini 2.5 Pro GA (stable, no preview suffix)
    model: "gemini-2.5-pro",
    apiKey: process.env.GEMINI_API_KEY!,
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  },
];

// ----- Appels par provider -----

async function callOpenAI(
  config: ProviderConfig,
  query: string
): Promise<LLMResponse> {
  const start = Date.now();
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: query }],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error: ${JSON.stringify(data)}`);

  const usage = data.usage || {};
  return {
    provider: config.name,
    model: config.model,
    query,
    response: data.choices?.[0]?.message?.content || "",
    tokensUsed: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    latencyMs: Date.now() - start,
    costUsd: estimateCost("openai", usage.prompt_tokens, usage.completion_tokens),
  };
}

async function callAnthropic(
  config: ProviderConfig,
  query: string
): Promise<LLMResponse> {
  const start = Date.now();
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1500,
      messages: [{ role: "user", content: query }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic error: ${JSON.stringify(data)}`);

  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  return {
    provider: config.name,
    model: config.model,
    query,
    response: data.content?.[0]?.text || "",
    tokensUsed: inputTokens + outputTokens,
    latencyMs: Date.now() - start,
    costUsd: estimateCost("anthropic", inputTokens, outputTokens),
  };
}

async function callPerplexity(
  config: ProviderConfig,
  query: string
): Promise<LLMResponse> {
  const start = Date.now();
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: query }],
      max_tokens: 1500,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Perplexity error: ${JSON.stringify(data)}`);

  const usage = data.usage || {};
  return {
    provider: config.name,
    model: config.model,
    query,
    response: data.choices?.[0]?.message?.content || "",
    tokensUsed: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    latencyMs: Date.now() - start,
    costUsd: estimateCost("perplexity", usage.prompt_tokens, usage.completion_tokens),
  };
}

async function callGemini(
  config: ProviderConfig,
  query: string
): Promise<LLMResponse> {
  const start = Date.now();
  const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: query }] }],
      generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data)}`);

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = data.usageMetadata || {};
  return {
    provider: config.name,
    model: config.model,
    query,
    response: text,
    tokensUsed:
      (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
    latencyMs: Date.now() - start,
    costUsd: estimateCost(
      "gemini",
      usage.promptTokenCount,
      usage.candidatesTokenCount
    ),
  };
}

// ----- Estimation des coûts (prix approx. avril 2026) -----

function estimateCost(
  provider: string,
  inputTokens: number = 0,
  outputTokens: number = 0
): number {
  const rates: Record<string, { input: number; output: number }> = {
    openai: { input: 2.5 / 1e6, output: 10 / 1e6 },      // GPT-4o-2024-11-20
    anthropic: { input: 3 / 1e6, output: 15 / 1e6 },      // Claude Sonnet 4.5
    perplexity: { input: 3 / 1e6, output: 15 / 1e6 },     // Sonar Pro
    gemini: { input: 1.25 / 1e6, output: 10 / 1e6 },      // Gemini 2.5 Pro
  };
  const rate = rates[provider] || { input: 0, output: 0 };
  return inputTokens * rate.input + outputTokens * rate.output;
}

// ----- Interface publique -----

const CALLERS: Record<
  string,
  (config: ProviderConfig, query: string) => Promise<LLMResponse>
> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  perplexity: callPerplexity,
  gemini: callGemini,
};

/**
 * Interroge un seul LLM avec une requête donnée.
 */
export async function queryLLM(
  providerName: string,
  query: string
): Promise<LLMResponse> {
  const config = PROVIDERS.find((p) => p.name === providerName);
  if (!config) throw new Error(`Provider inconnu: ${providerName}`);

  const caller = CALLERS[providerName];
  if (!caller) throw new Error(`Pas de caller pour: ${providerName}`);

  return caller(config, query);
}

/**
 * Interroge les 4 LLMs en parallèle pour une même requête.
 * Retourne les résultats disponibles (les erreurs sont loguées, pas bloquantes).
 */
/**
 * LW-004 fix: Log individual LLM failures instead of swallowing them.
 * Returns both successful responses and error details for monitoring.
 */
export interface QueryAllResult {
  responses: LLMResponse[];
  errors: { provider: string; error: string }[];
}

export async function queryAllLLMs(query: string): Promise<LLMResponse[]> {
  const results = await Promise.allSettled(
    PROVIDERS.filter((p) => p.apiKey).map((p) => queryLLM(p.name, query))
  );

  const responses: LLMResponse[] = [];
  const errors: { provider: string; error: string }[] = [];

  results.forEach((r, i) => {
    const providerName = PROVIDERS.filter((p) => p.apiKey)[i]?.name || `unknown-${i}`;
    if (r.status === "fulfilled") {
      responses.push(r.value);
    } else {
      const errMsg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push({ provider: providerName, error: errMsg });
      // LW-004: structured error logging instead of silent swallow
      console.error(`[LLM-ERROR] ${providerName} failed for query "${query.slice(0, 80)}...": ${errMsg}`);
    }
  });

  // LW-004: warn if a monitored LLM is completely missing (no API key)
  const configuredProviders = PROVIDERS.filter((p) => p.apiKey).map((p) => p.name);
  const missingProviders = PROVIDERS.filter((p) => !p.apiKey).map((p) => p.name);
  if (missingProviders.length > 0) {
    console.warn(`[LLM-WARN] Missing API keys for: ${missingProviders.join(", ")}`);
  }

  return responses;
}

export { PROVIDERS };

```


## `src/lib/judge.ts`

```typescript
// src/lib/judge.ts
// LLM-as-judge for Score GEO™ v2
// Single Claude Sonnet call per response, returns structured JSON

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export const JUDGE_MODEL = "claude-sonnet-4-5-20250929";

export interface JudgeVerdict {
  isBrandMentioned: boolean;
  brandMentionConfidence: number; // 0-1
  isRecommended: boolean;
  recommendationStrength: "explicit" | "implicit" | "none";
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1 to +1
  competitorMentions: string[]; // canonical names from the provided list
  factualClaims: Array<{
    claim: string;
    verdict: "correct" | "incorrect" | "unverifiable";
    expectedValue?: string;
  }>;
  citationUrls: string[];
  reasoningNotes: string; // brief justification for audit trail
}

interface JudgeInput {
  response: string;
  brandName: string;
  brandAliases: string[]; // ex: ["MCVA", "MCVA Consulting", "MCVA SA"]
  competitors: string[];
  knownFacts?: Record<string, string>; // ex: { "fondation": "1977", "collaborateurs": "20" }
  language: "fr" | "de" | "en";
}

const JUDGE_SYSTEM_PROMPT = `You are a structured analyst evaluating how an AI assistant talks about a specific brand. You output ONLY valid JSON matching the provided schema. No prose, no markdown, no code fences.

Your analysis must be strict and reproducible:
- "isBrandMentioned" is TRUE only if the brand is explicitly named (case-insensitive). Substring matches inside other words DO NOT count.
- "isRecommended" is TRUE only if the response clearly suggests the brand as a good choice. Generic mentions are NOT recommendations.
- "sentiment" reflects ONLY the tone toward the brand, not the overall response tone.
- "factualClaims" lists every verifiable claim about the brand, comparing against known facts when provided.
- Be conservative: when uncertain, choose neutral / unverifiable / false.`;

function buildJudgePrompt(input: JudgeInput): string {
  const factsSection =
    input.knownFacts && Object.keys(input.knownFacts).length > 0
      ? `\n\nKNOWN FACTS about ${input.brandName} (use to verify factual claims):\n${Object.entries(input.knownFacts)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}`
      : "";

  return `Brand to analyze: ${input.brandName}
Brand aliases (any of these counts as a mention): ${JSON.stringify(input.brandAliases)}
Known competitors (canonical names): ${JSON.stringify(input.competitors)}
Response language: ${input.language}${factsSection}

AI ASSISTANT RESPONSE TO ANALYZE:
"""
${input.response}
"""

Output a JSON object matching this exact schema:
{
  "isBrandMentioned": boolean,
  "brandMentionConfidence": number,
  "isRecommended": boolean,
  "recommendationStrength": "explicit" | "implicit" | "none",
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number,
  "competitorMentions": string[],
  "factualClaims": [{ "claim": string, "verdict": "correct" | "incorrect" | "unverifiable", "expectedValue": string }],
  "citationUrls": string[],
  "reasoningNotes": string
}`;
}

/**
 * Fallback brand detection using word-boundary tokenization.
 * Used only when judgeResponse() throws (API failure, timeout, etc.).
 * Strict: requires word boundaries, not substring matches.
 */
export function fallbackBrandDetection(
  response: string,
  brandAliases: string[]
): boolean {
  const tokens = response
    .toLowerCase()
    .split(/[\s\p{P}]+/u)
    .filter(Boolean);
  return brandAliases.some((alias) => {
    const aliasTokens = alias.toLowerCase().split(/\s+/);
    if (aliasTokens.length === 1) {
      return tokens.includes(aliasTokens[0]);
    }
    // Multi-word alias: search for consecutive token sequence
    for (let i = 0; i <= tokens.length - aliasTokens.length; i++) {
      if (aliasTokens.every((t, j) => tokens[i + j] === t)) return true;
    }
    return false;
  });
}

export async function judgeResponse(input: JudgeInput): Promise<JudgeVerdict> {
  try {
    const message = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 2000,
      temperature: 0, // deterministic
      system: JUDGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildJudgePrompt(input) }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Judge returned no text content");
    }

    // Parse JSON, handling potential ```json wrappers defensively
    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const verdict = JSON.parse(raw) as JudgeVerdict;
    return verdict;
  } catch (err) {
    console.error("[judge] Failed, using fallback:", err);
    return {
      isBrandMentioned: fallbackBrandDetection(
        input.response,
        input.brandAliases
      ),
      brandMentionConfidence: 0.5,
      isRecommended: false,
      recommendationStrength: "none",
      sentiment: "neutral",
      sentimentScore: 0,
      competitorMentions: [],
      factualClaims: [],
      citationUrls: input.response.match(/https?:\/\/[^\s)]+/g) || [],
      reasoningNotes: `Judge failed: ${err instanceof Error ? err.message : "unknown"}. Using fallback detection.`,
    };
  }
}

```


## `src/lib/scoring-engine.ts`

```typescript
// src/lib/scoring-engine.ts
// Moteur de scoring Score GEO™ v2 — Uses LLM-as-judge from src/lib/judge.ts
// 4 composantes : Présence (0-25) + Exactitude (0-25) + Sentiment (0-25) + Recommandation (0-25)

import type { LLMResponse } from "./llm-providers";
import { judgeResponse, type JudgeVerdict } from "./judge";

export interface ResponseScore {
  // Identifiants
  provider: string;
  model: string;
  query: string;
  response: string;

  // Judge-based scores
  isBrandMentioned: boolean;
  brandMentionConfidence: number;
  isRecommended: boolean;
  recommendationStrength: "explicit" | "implicit" | "none";
  isFactuallyAccurate: boolean | null;
  factualClaims: JudgeVerdict["factualClaims"];
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1.0 à 1.0
  citationSources: string[];
  competitorMentions: string[];
  judgeReasoning: string;

  // Méta
  tokensUsed: number;
  latencyMs: number;
  costUsd: number;
}

export interface RunScore {
  scoreGeo: number; // 0-100 = sum of 4 components (single source of truth)
  scorePresence: number; // 0-25
  scoreExactitude: number; // 0-25
  scoreSentiment: number; // 0-25
  scoreRecommendation: number; // 0-25
  totalResponses: number;
  llmsAvailable: number; // LW-003: how many LLMs actually responded
  llmsMonitored: number; // LW-003: how many LLMs were queried
  responseScores: ResponseScore[];
}

// ============================================================
// SCORING D'UNE RÉPONSE (async — calls LLM-as-judge)
// ============================================================

export async function scoreResponse(
  llmResponse: LLMResponse,
  brandName: string,
  brandAliases: string[],
  competitors: string[],
  knownFacts: Record<string, string> | undefined,
  language: "fr" | "de" | "en"
): Promise<ResponseScore> {
  const verdict = await judgeResponse({
    response: llmResponse.response,
    brandName,
    brandAliases,
    competitors,
    knownFacts,
    language,
  });

  // Compute factual accuracy from claims
  const verifiableClaims = verdict.factualClaims.filter(
    (c) => c.verdict !== "unverifiable"
  );
  let isFactuallyAccurate: boolean | null = null;
  if (verifiableClaims.length > 0) {
    const correctRatio =
      verifiableClaims.filter((c) => c.verdict === "correct").length /
      verifiableClaims.length;
    isFactuallyAccurate = correctRatio >= 0.75;
  }

  return {
    provider: llmResponse.provider,
    model: llmResponse.model,
    query: llmResponse.query,
    response: llmResponse.response,
    isBrandMentioned: verdict.isBrandMentioned,
    brandMentionConfidence: verdict.brandMentionConfidence,
    isRecommended: verdict.isRecommended,
    recommendationStrength: verdict.recommendationStrength,
    isFactuallyAccurate,
    factualClaims: verdict.factualClaims,
    sentiment: verdict.sentiment,
    sentimentScore: verdict.sentimentScore,
    citationSources: verdict.citationUrls,
    competitorMentions: verdict.competitorMentions,
    judgeReasoning: verdict.reasoningNotes,
    tokensUsed: llmResponse.tokensUsed,
    latencyMs: llmResponse.latencyMs,
    costUsd: llmResponse.costUsd,
  };
}

// ============================================================
// SCORING GLOBAL D'UN RUN (agrégation)
// ============================================================

/**
 * LW-001: Single source of truth — scoreGeo = sum(4 components).
 * LW-003: Track available vs monitored LLMs explicitly.
 */
export function computeRunScore(responseScores: ResponseScore[]): RunScore {
  const allLlms = new Set(responseScores.map((r) => r.provider));
  const MONITORED_LLMS = 4; // openai, anthropic, perplexity, gemini

  const total = responseScores.length;
  if (total === 0) {
    return {
      scoreGeo: 0,
      scorePresence: 0,
      scoreExactitude: 0,
      scoreSentiment: 0,
      scoreRecommendation: 0,
      totalResponses: 0,
      llmsAvailable: 0,
      llmsMonitored: MONITORED_LLMS,
      responseScores: [],
    };
  }

  // --- Présence (0-25): Mention Rate × 25 ---
  const mentionRate =
    responseScores.filter((r) => r.isBrandMentioned).length / total;
  const scorePresence = Math.round(mentionRate * 25 * 100) / 100;

  // --- Exactitude (0-25): based on verifiable claims ---
  const mentioned = responseScores.filter((r) => r.isBrandMentioned);
  const checked = mentioned.filter((r) => r.isFactuallyAccurate !== null);
  let scoreExactitude: number;
  if (checked.length === 0) {
    // Fallback: use brandMentionConfidence as proxy
    const avgConfidence =
      mentioned.length > 0
        ? mentioned.reduce((s, r) => s + r.brandMentionConfidence, 0) /
          mentioned.length
        : 0;
    scoreExactitude = Math.round(avgConfidence * 25 * 100) / 100;
  } else {
    const accuracyRate =
      checked.filter((r) => r.isFactuallyAccurate).length / checked.length;
    scoreExactitude = Math.round(accuracyRate * 25 * 100) / 100;
  }

  // --- Sentiment (0-25): average -1..+1 mapped to 0..25 ---
  const avgSentiment =
    responseScores.reduce((s, r) => s + r.sentimentScore, 0) / total;
  const scoreSentiment =
    Math.round(((avgSentiment + 1) / 2) * 25 * 100) / 100;

  // --- Recommandation (0-25): explicit counts more than implicit ---
  const recoScore =
    responseScores.reduce((s, r) => {
      if (r.recommendationStrength === "explicit") return s + 1;
      if (r.recommendationStrength === "implicit") return s + 0.5;
      return s;
    }, 0) / total;
  const scoreRecommendation = Math.round(recoScore * 25 * 100) / 100;

  // --- Score GEO™ global = SOMME des 4 composantes ---
  const scoreGeo =
    Math.round(
      (scorePresence + scoreExactitude + scoreSentiment + scoreRecommendation) *
        100
    ) / 100;

  return {
    scoreGeo,
    scorePresence,
    scoreExactitude,
    scoreSentiment,
    scoreRecommendation,
    totalResponses: total,
    llmsAvailable: allLlms.size,
    llmsMonitored: MONITORED_LLMS,
    responseScores,
  };
}

// ============================================================
// CLASSIFICATION Score GEO™
// ============================================================

export type GeoTier = "invisible" | "emergent" | "visible" | "leader";

export function getGeoTier(score: number): GeoTier {
  if (score <= 25) return "invisible";
  if (score <= 50) return "emergent";
  if (score <= 75) return "visible";
  return "leader";
}

export function getGeoTierLabel(tier: GeoTier): string {
  const labels: Record<GeoTier, string> = {
    invisible: "Invisible (0-25)",
    emergent: "Émergent (26-50)",
    visible: "Visible (51-75)",
    leader: "Leader (76-100)",
  };
  return labels[tier];
}

```


## `src/lib/monitor.ts`

```typescript
// src/lib/monitor.ts
// Orchestrateur GEO monitoring — adapté aux tables Supabase existantes
// Tables: llmwatch_clients, llmwatch_queries, llmwatch_scores, llmwatch_raw_results

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { queryAllLLMs, MODEL_SNAPSHOT_VERSION, PROVIDERS, type LLMResponse } from "./llm-providers";
import {
  scoreResponse,
  computeRunScore,
  type ResponseScore,
  type RunScore,
} from "./scoring-engine";
import { LLMWATCH_RUN_CONFIG, type QualityLevel } from "./constants";

// ============================================================
// SUPABASE CLIENT (server-side, service_role)
// ============================================================

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// TYPES (mapped to existing Supabase tables)
// ============================================================

interface Client {
  id: string;
  name: string;
  domain: string;
  brand_keywords: string[];
}

interface Query {
  id: string;
  client_id: string;
  text_fr: string;
  text_de: string | null;
  text_en: string | null;
  category: string;
}

interface MonitoringResult {
  scoreId: string;
  clientId: string;
  clientName: string;
  score: RunScore;
  status: "completed" | "failed";
  error?: string;
  duration: number;
  totalCost: number;
}

// ============================================================
// MONITORING D'UN CLIENT
// ============================================================

/**
 * Execute un cycle de monitoring complet pour un client.
 * 1. Recupere les queries actives (llmwatch_queries)
 * 2. Cree un score entry (llmwatch_scores)
 * 3. Interroge les 4 LLMs pour chaque query
 * 4. Score chaque reponse
 * 5. Calcule le Score GEO global
 * 6. Persiste tout en base
 */
export async function runMonitoring(
  clientId: string,
  level: QualityLevel = "standard"
): Promise<MonitoringResult> {
  const supabase = getSupabase();
  const startTime = Date.now();
  const runConfig = LLMWATCH_RUN_CONFIG[level];

  // 1. Recuperer le client
  const { data: client, error: clientError } = await supabase
    .from("llmwatch_clients")
    .select("id, name, domain, brand_keywords")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    throw new Error(`Client introuvable: ${clientId}`);
  }

  // 2. Recuperer les queries actives
  const { data: queries, error: queriesError } = await supabase
    .from("llmwatch_queries")
    .select("id, client_id, text_fr, text_de, text_en, category")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("sort_order")
    .limit(runConfig.maxQueries);

  if (queriesError || !queries?.length) {
    throw new Error(`Aucune query active pour le client ${client.name}`);
  }

  // 3. Reserve l'entree score (llmwatch_scores) pour cette semaine
  // Uses RPC with ON CONFLICT DO UPDATE to handle re-runs within same week
  const weekStart = getWeekStart();
  const { data: scoreEntry, error: scoreError } = await supabase
    .rpc("upsert_weekly_score", {
      p_client_id: clientId,
      p_week_start: weekStart,
      p_score: 0,
      p_score_by_llm: {},
      p_score_by_lang: {},
      p_citation_rate: 0,
      p_score_presence: 0,
      p_score_exactitude: 0,
      p_score_sentiment: 0,
      p_score_recommendation: 0,
      p_total_responses: queries.length * 4,
      p_total_cost_usd: 0,
      p_duration_ms: 0,
      p_model_snapshot_version: MODEL_SNAPSHOT_VERSION,
      p_models_used: {},
    });

  if (scoreError || !scoreEntry) {
    throw new Error(`Impossible de creer le score: ${scoreError?.message}`);
  }

  const scoreId = scoreEntry.id;

  try {
    // 4. Setup
    let totalCost = 0;

    // Fetch competitors from database
    const competitors = (
      await supabase
        .from("llmwatch_competitors")
        .select("name")
        .eq("client_id", clientId)
        .eq("active", true)
    ).data?.map((c) => c.name) || [];

    // Fetch known facts for factual accuracy (if llmwatch_facts table exists)
    const knownFacts = await getClientFacts(clientId, supabase);

    const brandAliases = client.brand_keywords || [client.name, client.domain];

    // 5. Run REPETITIONS times (1 for eco/standard, 3 for premium/ultra)
    const allRunScores: RunScore[] = [];

    const LANGUAGES = ["fr", "de", "en"] as const;

    for (let rep = 0; rep < runConfig.repetitions; rep++) {
      const repResponseScores: ResponseScore[] = [];

      for (const query of queries as Query[]) {
        for (const lang of LANGUAGES) {
          const queryText = query[`text_${lang}` as keyof Query] as string | null;
          if (!queryText) continue; // skip languages without text

          // Interroger les 4 LLMs en parallele
          const llmResponses = await queryAllLLMs(queryText);

          // Scorer chaque reponse (async — calls LLM-as-judge)
          for (const llmResponse of llmResponses) {
            const scored = await scoreResponse(
              llmResponse,
              client.name,
              brandAliases,
              competitors,
              knownFacts,
              lang
            );

            repResponseScores.push(scored);
            totalCost += llmResponse.costUsd + 0.012; // judge cost estimate

            // Persister la reponse dans llmwatch_raw_results
            await supabase.from("llmwatch_raw_results").insert({
              client_id: clientId,
              query_id: query.id,
              llm: scored.provider,
              lang,
              response_raw: scored.response,
              cited: scored.isBrandMentioned,
              snippet: scored.response.slice(0, 500),
              collected_at: new Date().toISOString(),
              is_recommended: scored.isRecommended,
              sentiment: scored.sentiment,
              sentiment_score: scored.sentimentScore,
              competitor_mentions: scored.competitorMentions,
              citation_sources: scored.citationSources,
              tokens_used: scored.tokensUsed,
              latency_ms: scored.latencyMs,
              cost_usd: scored.costUsd,
              model_version: scored.model,
            });
          }

          // Pause entre les queries pour respecter les rate limits
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      allRunScores.push(computeRunScore(repResponseScores));
    }

    // 6. Average across repetitions
    const meanScore = allRunScores.reduce((s, r) => s + r.scoreGeo, 0) / allRunScores.length;
    const variance = allRunScores.length > 1
      ? allRunScores.reduce((s, r) => s + Math.pow(r.scoreGeo - meanScore, 2), 0) / allRunScores.length
      : 0;
    const stddev = Math.sqrt(variance);

    // Use the LAST run as the canonical responseScores for per-LLM breakdown
    const finalRunScore = allRunScores[allRunScores.length - 1];
    const allResponseScores = finalRunScore.responseScores;

    // Override scoreGeo with the mean across repetitions
    finalRunScore.scoreGeo = Math.round(meanScore * 100) / 100;

    // Compute per-LLM breakdown
    const scoreByLlm: Record<string, number> = {};
    const llmGroups: Record<string, ResponseScore[]> = {};
    for (const rs of allResponseScores) {
      if (!llmGroups[rs.provider]) llmGroups[rs.provider] = [];
      llmGroups[rs.provider].push(rs);
    }
    for (const [llm, scores] of Object.entries(llmGroups)) {
      scoreByLlm[llm] = computeRunScore(scores).scoreGeo;
    }

    // Compute per-language breakdown from raw_results
    // Query recently stored results to get per-lang scores
    const scoreByLang: Record<string, number> = { fr: finalRunScore.scoreGeo };
    const { data: langResults } = await supabase
      .from("llmwatch_raw_results")
      .select("lang, cited, is_recommended, sentiment_score")
      .eq("client_id", clientId)
      .gte("collected_at", new Date(startTime).toISOString());
    if (langResults && langResults.length > 0) {
      const langGroups: Record<string, typeof langResults> = {};
      for (const r of langResults) {
        const l = r.lang || "fr";
        if (!langGroups[l]) langGroups[l] = [];
        langGroups[l].push(r);
      }
      for (const [lang, results] of Object.entries(langGroups)) {
        if (results.length === 0) continue;
        const mentionRate = results.filter((r) => r.cited).length / results.length;
        const recoRate = results.filter((r) => r.is_recommended).length / results.length;
        const avgSent = results.reduce((s, r) => s + (r.sentiment_score || 0), 0) / results.length;
        // Simplified per-lang score: same 4-component formula
        const langScore = Math.round(
          (mentionRate * 25 + 12.5 + ((avgSent + 1) / 2) * 25 + recoRate * 25) * 100
        ) / 100;
        scoreByLang[lang] = langScore;
      }
    }

    // Citation rate (from last run)
    const citationRate = allResponseScores.length > 0
      ? allResponseScores.filter((r) => r.isBrandMentioned).length / allResponseScores.length
      : 0;

    // 7. Mettre a jour le score entry
    const modelsUsed = Object.fromEntries(
      PROVIDERS.map((p) => [p.name, p.model])
    );

    await supabase
      .from("llmwatch_scores")
      .update({
        score: finalRunScore.scoreGeo,
        score_by_llm: scoreByLlm,
        score_by_lang: scoreByLang,
        citation_rate: Math.round(citationRate * 100) / 100,
        score_presence: finalRunScore.scorePresence,
        score_exactitude: finalRunScore.scoreExactitude,
        score_sentiment: finalRunScore.scoreSentiment,
        score_recommendation: finalRunScore.scoreRecommendation,
        total_responses: allResponseScores.length * runConfig.repetitions,
        total_cost_usd: Math.round(totalCost * 10000) / 10000,
        duration_ms: Date.now() - startTime,
        model_snapshot_version: MODEL_SNAPSHOT_VERSION,
        models_used: modelsUsed,
        run_level: level,
        run_count: runConfig.repetitions,
        score_stddev: runConfig.repetitions > 1 ? Math.round(stddev * 100) / 100 : null,
      })
      .eq("id", scoreId);

    // Update last_monitored_at on successful completion
    await supabase
      .from("llmwatch_clients")
      .update({ last_monitored_at: new Date().toISOString() })
      .eq("id", clientId);

    return {
      scoreId,
      clientId,
      clientName: client.name,
      score: finalRunScore,
      status: "completed",
      duration: Date.now() - startTime,
      totalCost,
    };
  } catch (error) {
    // Marquer le score en erreur (supprimer l'entree incomplete)
    await supabase.from("llmwatch_scores").delete().eq("id", scoreId);

    return {
      scoreId,
      clientId,
      clientName: client.name,
      score: computeRunScore([]),
      status: "failed",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      duration: Date.now() - startTime,
      totalCost: 0,
    };
  }
}

// ============================================================
// MONITORING DE TOUS LES CLIENTS ACTIFS
// ============================================================

export async function runAllMonitoring(): Promise<MonitoringResult[]> {
  const supabase = getSupabase();

  const { data: clients, error } = await supabase
    .from("llmwatch_clients")
    .select("id, name, monitoring_frequency, last_monitored_at")
    .eq("active", true);

  if (error || !clients?.length) {
    console.log("Aucun client actif a monitorer");
    return [];
  }

  const results: MonitoringResult[] = [];
  const now = new Date();

  for (const client of clients) {
    // Skip manual clients — they are only triggered via the UI
    if (client.monitoring_frequency === "manual") {
      console.log(`[GEO Monitor] ${client.name}: frequence manuelle, skip`);
      continue;
    }

    // Check if enough time has passed since last monitoring
    if (client.last_monitored_at && !isDueForMonitoring(client.monitoring_frequency, client.last_monitored_at, now)) {
      console.log(`[GEO Monitor] ${client.name}: pas encore du (freq: ${client.monitoring_frequency})`);
      continue;
    }

    console.log(`[GEO Monitor] Debut monitoring: ${client.name}`);
    try {
      const result = await runMonitoring(client.id);
      results.push(result);

      // Update last_monitored_at
      if (result.status === "completed") {
        await supabase
          .from("llmwatch_clients")
          .update({ last_monitored_at: now.toISOString() })
          .eq("id", client.id);
      }

      console.log(
        `[GEO Monitor] ${client.name}: Score GEO = ${result.score.scoreGeo}/100 (${result.status})`
      );
    } catch (err) {
      console.error(`[GEO Monitor] Erreur pour ${client.name}:`, err);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return results;
}

/** Check if a client is due for monitoring based on their frequency setting */
function isDueForMonitoring(
  frequency: string,
  lastMonitoredAt: string,
  now: Date
): boolean {
  const last = new Date(lastMonitoredAt);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (frequency) {
    case "weekly":
      return diffDays >= 6; // 6 days to allow some flexibility
    case "monthly":
      return diffDays >= 28;
    case "quarterly":
      return diffDays >= 85;
    default:
      return false;
  }
}

// ============================================================
// RECUPERATION DES DONNEES
// ============================================================

export async function getScoreHistory(clientId: string, limit: number = 20) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("llmwatch_scores")
    .select(
      "id, score, score_presence, score_exactitude, score_sentiment, score_recommendation, week_start, created_at, score_by_llm, score_by_lang, citation_rate, total_responses, total_cost_usd, duration_ms"
    )
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getLLMBreakdown(clientId: string, weekStart?: string) {
  const supabase = getSupabase();

  let query = supabase
    .from("llmwatch_raw_results")
    .select(
      "llm, cited, is_recommended, sentiment, sentiment_score, competitor_mentions"
    )
    .eq("client_id", clientId);

  if (weekStart) {
    // Filter to a specific week
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    query = query.gte("collected_at", start.toISOString()).lt("collected_at", end.toISOString());
  } else {
    // Latest 50 results
    query = query.order("collected_at", { ascending: false }).limit(50);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Agreger par LLM
  const breakdown: Record<
    string,
    {
      total: number;
      mentions: number;
      recommendations: number;
      avgSentiment: number;
      competitors: Record<string, number>;
    }
  > = {};

  for (const resp of data || []) {
    const p = resp.llm;
    if (!breakdown[p]) {
      breakdown[p] = {
        total: 0,
        mentions: 0,
        recommendations: 0,
        avgSentiment: 0,
        competitors: {},
      };
    }
    breakdown[p].total++;
    if (resp.cited) breakdown[p].mentions++;
    if (resp.is_recommended) breakdown[p].recommendations++;
    breakdown[p].avgSentiment += resp.sentiment_score || 0;

    for (const comp of resp.competitor_mentions || []) {
      breakdown[p].competitors[comp] =
        (breakdown[p].competitors[comp] || 0) + 1;
    }
  }

  for (const p of Object.keys(breakdown)) {
    if (breakdown[p].total > 0) {
      breakdown[p].avgSentiment /= breakdown[p].total;
    }
  }

  return breakdown;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Fetch known facts for a client from llmwatch_facts table.
 * Returns undefined if no facts exist (gracefully handles missing table).
 */
async function getClientFacts(
  clientId: string,
  supabase: SupabaseClient
): Promise<Record<string, string> | undefined> {
  try {
    const { data } = await supabase
      .from("llmwatch_facts")
      .select("fact_key, fact_value")
      .eq("client_id", clientId)
      .eq("active", true);
    if (!data || data.length === 0) return undefined;
    return Object.fromEntries(data.map((f) => [f.fact_key, f.fact_value]));
  } catch {
    // Table may not exist yet — graceful fallback
    return undefined;
  }
}

/** Get Monday of current week as YYYY-MM-DD */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

```

