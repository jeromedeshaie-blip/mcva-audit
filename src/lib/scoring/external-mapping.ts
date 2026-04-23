/**
 * External blocks → scoring enrichment (POLE-PERFORMANCE v2.1 § 6.5)
 *
 * Quand les blocs A-F sont fournis, ils remplacent ou complètent l'estimation HTML
 * pour certains critères. Chaque critère enrichi expose sa source dans `score_source`.
 */

import type {
  BlocAData, BlocBData, BlocCData, BlocDData, BlocEData, BlocFData,
} from "@/lib/audit/parsers/types";
import type { DataSource } from "./constants";

export interface EnrichedCriterion {
  item_code: string;
  score: number;
  source: DataSource;
  source_label: string | null;
  raw_value?: number | null;
}

export interface BlocsBundle {
  A?: BlocAData;
  B?: BlocBData;
  C?: BlocCData;
  D?: BlocDData;
  E?: BlocEData;
  F?: BlocFData;
  sourceLabels?: Partial<Record<"A" | "B" | "C" | "D" | "E" | "F", string>>;
}

// -------------------------------------------------------------------
// Bloc A — AWT → CITE Influence + CORE-EEAT Reputation
// -------------------------------------------------------------------
// Thresholds sont pragmatiques pour PME Suisse; documentés dans POLE-PERF § 4 CITE I.

function scoreDomainRating(dr: number): number {
  if (dr >= 50) return 95;
  if (dr >= 30) return 75;
  if (dr >= 15) return 55;
  if (dr >= 5) return 35;
  return 15;
}

function scoreBacklinks(count: number): number {
  if (count >= 5000) return 95;
  if (count >= 1000) return 75;
  if (count >= 200) return 55;
  if (count >= 50) return 35;
  return 15;
}

function scoreReferringDomains(rd: number): number {
  if (rd >= 200) return 95;
  if (rd >= 80) return 75;
  if (rd >= 30) return 55;
  if (rd >= 10) return 35;
  return 15;
}

function scoreAuthorityBacklinks(topRD: Array<{ dr: number }>): number {
  // Compte les RD avec DR >= 50 (autorité forte)
  const strong = topRD.filter((d) => d.dr >= 50).length;
  if (strong >= 5) return 95;
  if (strong >= 2) return 75;
  if (strong >= 1) return 55;
  return 25;
}

export function enrichFromBlocA(a: BlocAData, sourceLabel: string): EnrichedCriterion[] {
  const out: EnrichedCriterion[] = [];
  const src: DataSource = "external_verified";

  if (a.domain_rating != null) {
    out.push({
      item_code: "CI-I01",
      score: scoreDomainRating(a.domain_rating),
      source: src,
      source_label: sourceLabel,
      raw_value: a.domain_rating,
    });
  }
  if (a.backlinks_total != null) {
    out.push({
      item_code: "CI-I02",
      score: scoreBacklinks(a.backlinks_total),
      source: src,
      source_label: sourceLabel,
      raw_value: a.backlinks_total,
    });
    // R03 — volume de backlinks (CORE-EEAT)
    out.push({
      item_code: "R03",
      score: scoreBacklinks(a.backlinks_total),
      source: src,
      source_label: sourceLabel,
      raw_value: a.backlinks_total,
    });
  }
  if (a.referring_domains != null) {
    out.push({
      item_code: "CI-I03",
      score: scoreReferringDomains(a.referring_domains),
      source: src,
      source_label: sourceLabel,
      raw_value: a.referring_domains,
    });
    // R04 — diversité RD
    out.push({
      item_code: "R04",
      score: scoreReferringDomains(a.referring_domains),
      source: src,
      source_label: sourceLabel,
      raw_value: a.referring_domains,
    });
  }
  if (a.top_referring_domains && a.top_referring_domains.length > 0) {
    out.push({
      item_code: "CI-I04",
      score: scoreAuthorityBacklinks(a.top_referring_domains),
      source: src,
      source_label: sourceLabel,
      raw_value: a.top_referring_domains.filter((d) => d.dr >= 50).length,
    });
  }

  return out;
}

// -------------------------------------------------------------------
// Bloc B — GSC → Optimization + Engagement
// -------------------------------------------------------------------

function scoreAvgPosition(pos: number): number {
  if (pos <= 5) return 95;
  if (pos <= 10) return 80;
  if (pos <= 20) return 60;
  if (pos <= 40) return 40;
  return 20;
}

function scoreCtr(ctr: number): number {
  // ctr exprimé en % (ex 5.2 = 5.2%)
  if (ctr >= 5) return 90;
  if (ctr >= 3) return 70;
  if (ctr >= 1.5) return 50;
  if (ctr >= 0.5) return 30;
  return 15;
}

function scoreKeywordDiversity(topQueriesCount: number): number {
  // Nb de top requêtes = proxy pour diversité de positionnement
  if (topQueriesCount >= 20) return 90;
  if (topQueriesCount >= 10) return 65;
  if (topQueriesCount >= 3) return 45;
  return 20;
}

export function enrichFromBlocB(b: BlocBData, sourceLabel: string): EnrichedCriterion[] {
  const out: EnrichedCriterion[] = [];
  const src: DataSource = "external_verified";

  if (b.avg_position != null) {
    // O01 — positions (valeur pondérée dans CORE-EEAT Optimization)
    out.push({
      item_code: "O01",
      score: scoreAvgPosition(b.avg_position),
      source: src,
      source_label: sourceLabel,
      raw_value: b.avg_position,
    });
  }
  if (b.avg_ctr != null) {
    out.push({
      item_code: "O02",
      score: scoreCtr(b.avg_ctr),
      source: src,
      source_label: sourceLabel,
      raw_value: b.avg_ctr,
    });
  }
  if (b.top_queries.length > 0) {
    out.push({
      item_code: "O03",
      score: scoreKeywordDiversity(b.top_queries.length),
      source: src,
      source_label: sourceLabel,
      raw_value: b.top_queries.length,
    });
  }
  // E05 — engagement via CTR moyen (proxy)
  if (b.avg_ctr != null) {
    out.push({
      item_code: "E05",
      score: scoreCtr(b.avg_ctr),
      source: src,
      source_label: sourceLabel,
      raw_value: b.avg_ctr,
    });
  }

  return out;
}

// -------------------------------------------------------------------
// Bloc C — GA4 → Engagement
// -------------------------------------------------------------------

function scoreEngagementRate(rate: number): number {
  // GA4 engagement rate en %
  if (rate >= 70) return 95;
  if (rate >= 55) return 75;
  if (rate >= 40) return 55;
  if (rate >= 25) return 35;
  return 15;
}

function scoreSessionDuration(sec: number): number {
  if (sec >= 180) return 90;
  if (sec >= 90) return 70;
  if (sec >= 45) return 50;
  if (sec >= 20) return 30;
  return 15;
}

function scoreConversions(count: number): number {
  if (count >= 500) return 95;
  if (count >= 100) return 75;
  if (count >= 20) return 55;
  if (count >= 5) return 35;
  return 15;
}

export function enrichFromBlocC(c: BlocCData, sourceLabel: string): EnrichedCriterion[] {
  const out: EnrichedCriterion[] = [];
  const src: DataSource = "external_verified";

  if (c.engagement_rate != null) {
    out.push({
      item_code: "E01",
      score: scoreEngagementRate(c.engagement_rate),
      source: src,
      source_label: sourceLabel,
      raw_value: c.engagement_rate,
    });
  }
  if (c.avg_session_duration_sec != null) {
    out.push({
      item_code: "E02",
      score: scoreSessionDuration(c.avg_session_duration_sec),
      source: src,
      source_label: sourceLabel,
      raw_value: c.avg_session_duration_sec,
    });
  }
  if (c.conversions_organic != null) {
    out.push({
      item_code: "E04",
      score: scoreConversions(c.conversions_organic),
      source: src,
      source_label: sourceLabel,
      raw_value: c.conversions_organic,
    });
  }

  return out;
}

// -------------------------------------------------------------------
// Bloc F — LLM Watch override complet du Score GEO™
// -------------------------------------------------------------------

export interface ScoreGeoOverride {
  score_geo: number;
  score_presence: number;
  score_exactitude: number;
  score_sentiment: number;
  score_recommendation: number;
  score_by_llm: Record<string, number>;
  source: DataSource;
  source_label: string;
  metadata: {
    model_snapshot_version: string | null;
    run_count: number | null;
    score_stddev: number | null;
    run_level: string | null;
  };
}

export function buildScoreGeoOverride(
  f: BlocFData,
  sourceLabel: string
): ScoreGeoOverride {
  return {
    score_geo: f.score_geo,
    score_presence: f.score_presence,
    score_exactitude: f.score_exactitude,
    score_sentiment: f.score_sentiment,
    score_recommendation: f.score_recommendation,
    score_by_llm: f.score_by_llm,
    source: "external_verified",
    source_label: sourceLabel,
    metadata: {
      model_snapshot_version: f.model_snapshot_version,
      run_count: f.run_count,
      score_stddev: f.score_stddev,
      run_level: f.run_level,
    },
  };
}

// -------------------------------------------------------------------
// Orchestration — applique tous les enrichissements disponibles
// -------------------------------------------------------------------

export interface ScoringEnrichment {
  /** Criteria scores keyed by item_code (override HTML-only scores). */
  criteria: Record<string, EnrichedCriterion>;
  /** Score GEO™ override si bloc F présent. */
  scoreGeoOverride: ScoreGeoOverride | null;
  /** Source labels pour le rapport final. */
  sourceLabels: string[];
}

export function buildEnrichment(bundle: BlocsBundle): ScoringEnrichment {
  const criteria: Record<string, EnrichedCriterion> = {};
  const sourceLabels: string[] = [];
  let scoreGeoOverride: ScoreGeoOverride | null = null;

  if (bundle.A) {
    const label = bundle.sourceLabels?.A || "AWT export";
    sourceLabels.push(label);
    for (const e of enrichFromBlocA(bundle.A, label)) criteria[e.item_code] = e;
  }
  if (bundle.B) {
    const label = bundle.sourceLabels?.B || "GSC export";
    sourceLabels.push(label);
    for (const e of enrichFromBlocB(bundle.B, label)) criteria[e.item_code] = e;
  }
  if (bundle.C) {
    const label = bundle.sourceLabels?.C || "GA4 export";
    sourceLabels.push(label);
    for (const e of enrichFromBlocC(bundle.C, label)) criteria[e.item_code] = e;
  }
  if (bundle.F) {
    const label = bundle.sourceLabels?.F || "LLM Watch run";
    sourceLabels.push(label);
    scoreGeoOverride = buildScoreGeoOverride(bundle.F, label);
  }

  return { criteria, scoreGeoOverride, sourceLabels };
}

/**
 * Construit la mention de sources pour inclusion dans le rapport final.
 * Ex: "Sources : AWT export 2026-04-23, GSC export 2026-04-23, LLM Watch run 2026-04-22"
 * (§ 6.5 POLE-PERF — toujours mentionner).
 */
export function formatSourcesCitation(labels: string[]): string {
  if (labels.length === 0) return "Sources : estimation HTML uniquement (mode dégradé)";
  return `Sources : ${labels.join(", ")}`;
}
