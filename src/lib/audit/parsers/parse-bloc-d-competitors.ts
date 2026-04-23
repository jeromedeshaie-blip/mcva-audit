/**
 * Parseur Bloc D — Concurrents (Moz + SimilarWeb + Seobility)
 *
 * Format attendu : JSON structuré (depuis le wizard UI) ou paste libre
 * avec blocs séparés par "---" ou "===" entre concurrents.
 *
 * POLE-PERFORMANCE v2.1 § 6.4 Bloc D.
 */

import type { BlocDData, BlocDCompetitor, ParseResult } from "./types";

function cleanNumber(s: string): number | null {
  const cleaned = s.replace(/[\s'']/g, "").replace("%", "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseOneCompetitor(block: string): BlocDCompetitor | null {
  const nameMatch = block.match(/Nom\s+concurrent\s*[:=]?\s*(.+)/i)
    || block.match(/Concurrent\s*[:=]?\s*(.+)/i);
  const domainMatch = block.match(/Domain\s*[:=]?\s*([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i)
    || block.match(/^([a-z0-9-]+(?:\.[a-z0-9-]+)+)/im);
  if (!nameMatch && !domainMatch) return null;

  const comp: BlocDCompetitor = {
    name: nameMatch ? nameMatch[1].trim().split(/\n/)[0].trim() : (domainMatch ? domainMatch[1] : "unknown"),
    domain: domainMatch ? domainMatch[1] : "",
    moz_da: null,
    moz_spam_score: null,
    similarweb_traffic_monthly: null,
    similarweb_top_countries: [],
    similarweb_top_keywords: [],
    seobility_backlinks_total: null,
    top_10_referring_domains: [],
  };

  const daMatch = block.match(/Moz\s*DA\s*[:=]?\s*([\d.]+)/i)
    || block.match(/Domain\s+Authority\s*[:=]?\s*([\d.]+)/i);
  if (daMatch) comp.moz_da = cleanNumber(daMatch[1]);

  const spamMatch = block.match(/Moz\s*Spam\s*Score\s*[:=]?\s*([\d.]+)/i)
    || block.match(/Spam\s+Score\s*[:=]?\s*([\d.]+)/i);
  if (spamMatch) comp.moz_spam_score = cleanNumber(spamMatch[1]);

  const trafficMatch = block.match(/SimilarWeb\s+trafic(?:\/mois)?\s*[:=]?\s*([\d\s''.,kKmM]+)/i)
    || block.match(/Trafic\s+mois\s*[:=]?\s*([\d\s''.,kKmM]+)/i);
  if (trafficMatch) {
    const raw = trafficMatch[1].toLowerCase();
    let multiplier = 1;
    if (raw.includes("k")) multiplier = 1000;
    else if (raw.includes("m")) multiplier = 1_000_000;
    const base = cleanNumber(raw.replace(/[km]/gi, ""));
    comp.similarweb_traffic_monthly = base !== null ? Math.round(base * multiplier) : null;
  }

  const countriesMatch = block.match(/(?:Top\s+\d+\s+)?pays\s*[:=]?\s*(.+)/i)
    || block.match(/Top\s+countries\s*[:=]?\s*(.+)/i);
  if (countriesMatch) {
    comp.similarweb_top_countries = countriesMatch[1].split(/[,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
  }

  const keywordsMatch = block.match(/(?:Top\s+\d+\s+)?keywords\s*[:=]?\s*(.+)/i);
  if (keywordsMatch) {
    comp.similarweb_top_keywords = keywordsMatch[1].split(/[,;]+/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
  }

  const backlinksMatch = block.match(/Seobility\s+backlinks?\s*(?:total)?\s*[:=]?\s*([\d\s''.,]+)/i)
    || block.match(/Backlinks?\s+total\s*[:=]?\s*([\d\s''.,]+)/i);
  if (backlinksMatch) comp.seobility_backlinks_total = cleanNumber(backlinksMatch[1]);

  return comp;
}

export function parseBlocDcompetitors(input: string | BlocDData): ParseResult<BlocDData> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // If a structured JSON is passed directly (from the wizard form), accept it.
  if (typeof input === "object" && input !== null) {
    return { data: input, errors, warnings };
  }

  if (!input || input.trim().length === 0) {
    errors.push("Bloc D vide");
    return { data: { competitors: [] }, errors, warnings };
  }

  const blocks = input.split(/(?:^---+$|^===+$)/m).map((b) => b.trim()).filter(Boolean);

  const competitors: BlocDCompetitor[] = [];
  for (const block of blocks) {
    const comp = parseOneCompetitor(block);
    if (comp && comp.domain) competitors.push(comp);
    if (competitors.length >= 10) break;
  }

  if (competitors.length === 0) warnings.push("Aucun concurrent parsé");

  return { data: { competitors }, errors, warnings };
}
