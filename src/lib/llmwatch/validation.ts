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
