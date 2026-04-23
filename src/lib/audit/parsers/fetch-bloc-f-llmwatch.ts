/**
 * Bloc F — LLM Watch (fetch natif depuis la DB)
 *
 * Contrairement aux autres blocs, F se fetch directement depuis llmwatch_scores
 * pour le client lié à cet audit. Pas de paste manuel.
 *
 * POLE-PERFORMANCE v2.1 § 6.4 Bloc F.
 */

import type { BlocFData, ParseResult } from "./types";
import { validateLlmWatchScore } from "@/lib/llmwatch/validation";

interface LlmWatchRow {
  id?: string;
  client_id?: string;
  week_start?: string | null;
  score?: number | null;
  score_by_llm?: Record<string, number> | null;
  score_by_lang?: Record<string, number> | null;
  citation_rate?: number | null;
  score_presence?: number | null;
  score_exactitude?: number | null;
  score_sentiment?: number | null;
  score_recommendation?: number | null;
  total_responses?: number | null;
  model_snapshot_version?: string | null;
  models_used?: Record<string, string> | null;
  run_count?: number | null;
  score_stddev?: number | null;
  run_level?: string | null;
}

export function buildBlocFFromLlmWatch(
  score: LlmWatchRow,
  sampleQueries: Array<{ query: string; llm: string; cited: boolean; snippet?: string }> = [],
  competitorsSov: Array<{ competitor: string; mention_rate: number; sov: number; avg_position?: number }> = [],
  dashboardUrl: string | null = null
): ParseResult<BlocFData> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate the score artifact first (section 13 POLE-PERF)
  // Loose cast: LlmWatchRow fields are all optional, validator uses Partial shape.
  const validation = validateLlmWatchScore(score as any);
  if (!validation.valid) {
    errors.push("Score LLM Watch invalide — artefact rejeté");
    for (const issue of validation.issues) {
      if (issue.severity === "error") errors.push(`${issue.field}: ${issue.message}`);
      else warnings.push(`${issue.field}: ${issue.message}`);
    }
  }

  const data: BlocFData = {
    dashboard_url: dashboardUrl,
    score_geo: Math.max(0, Math.min(100, Number(score.score) || 0)),
    score_presence: Math.max(0, Math.min(25, Number(score.score_presence) || 0)),
    score_exactitude: Math.max(0, Math.min(25, Number(score.score_exactitude) || 0)),
    score_sentiment: Math.max(0, Math.min(25, Number(score.score_sentiment) || 0)),
    score_recommendation: Math.max(0, Math.min(25, Number(score.score_recommendation) || 0)),
    score_by_llm: score.score_by_llm || {},
    sample_queries: sampleQueries.slice(0, 10),
    competitors_sov: competitorsSov.slice(0, 10),
    model_snapshot_version: score.model_snapshot_version || null,
    run_count: score.run_count ?? null,
    score_stddev: score.score_stddev ?? null,
    run_level: score.run_level || null,
  };

  return { data, errors, warnings };
}
