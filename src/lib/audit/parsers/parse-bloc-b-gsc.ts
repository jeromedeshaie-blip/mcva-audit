/**
 * Parseur Bloc B — Google Search Console
 *
 * Accepte :
 * - Paste des KPI globaux (Clics total, Impressions, CTR moyen, Position moyenne)
 * - Paste du tableau top requêtes (query | clicks | impressions | ctr | position)
 * - Paste du tableau top pages (URL | clicks | impressions)
 *
 * POLE-PERFORMANCE v2.1 § 6.4 Bloc B.
 */

import type { BlocBData, ParseResult } from "./types";

const EMPTY: BlocBData = {
  total_clicks: null,
  total_impressions: null,
  avg_ctr: null,
  avg_position: null,
  period_months: null,
  top_queries: [],
  top_pages: [],
};

function cleanNumber(s: string): number | null {
  const cleaned = s.replace(/[\s'']/g, "").replace("%", "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function parseBlocBgsc(input: string): ParseResult<BlocBData> {
  const data: BlocBData = { ...EMPTY, top_queries: [], top_pages: [] };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || input.trim().length === 0) {
    errors.push("Bloc B vide");
    return { data, errors, warnings };
  }

  const text = input.trim();

  // KPIs globaux
  const clicksMatch = text.match(/Clics?\s+total?\s*[:=]?\s*([\d\s''.,]+)/i)
    || text.match(/Total\s+clicks?\s*[:=]?\s*([\d\s''.,]+)/i);
  if (clicksMatch) data.total_clicks = cleanNumber(clicksMatch[1]);

  const imprMatch = text.match(/Impressions?\s+total?\s*[:=]?\s*([\d\s''.,]+)/i)
    || text.match(/Total\s+impressions?\s*[:=]?\s*([\d\s''.,]+)/i);
  if (imprMatch) data.total_impressions = cleanNumber(imprMatch[1]);

  const ctrMatch = text.match(/CTR\s+moyen?\s*[:=]?\s*([\d.,]+)\s*%?/i)
    || text.match(/Avg\.?\s+CTR\s*[:=]?\s*([\d.,]+)\s*%?/i);
  if (ctrMatch) data.avg_ctr = cleanNumber(ctrMatch[1]);

  const posMatch = text.match(/Position\s+moyenne?\s*[:=]?\s*([\d.,]+)/i)
    || text.match(/Avg\.?\s+position\s*[:=]?\s*([\d.,]+)/i);
  if (posMatch) data.avg_position = cleanNumber(posMatch[1]);

  const periodMatch = text.match(/(\d+)\s*(?:derniers?\s+)?mois/i)
    || text.match(/last\s+(\d+)\s+months/i);
  data.period_months = periodMatch ? parseInt(periodMatch[1], 10) : 16;

  // Top queries — lignes "requête | clicks | impressions | ctr | position"
  // Accepte séparateurs: pipe, tab, multiple espaces
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (data.top_queries.length >= 30) break;
    // Ignorer lignes KPI déjà parsées
    if (/^\s*(Clics?|Impressions?|CTR|Position|Total)/i.test(line)) continue;

    // Format tab-separated or pipe-separated
    const parts = line.split(/\s*[|\t]\s+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) continue;

    const query = parts[0];
    if (query.length < 3 || query.length > 150) continue;
    // Skip if query contains special "header" words
    if (/^(query|requ[eê]te|keyword|url|page)$/i.test(query)) continue;

    const clicks = cleanNumber(parts[1] || "");
    const impressions = cleanNumber(parts[2] || "");
    if (clicks === null || impressions === null) continue;

    const ctr = parts[3] ? cleanNumber(parts[3]) : null;
    const position = parts[4] ? cleanNumber(parts[4]) : null;

    // Detect if it's a URL row instead of query row
    if (query.startsWith("http") || query.startsWith("/")) {
      if (data.top_pages.length < 20) {
        data.top_pages.push({ url: query, clicks, impressions });
      }
    } else if (position !== null) {
      data.top_queries.push({ query, clicks, impressions, ctr, position });
    }
  }

  // Warnings
  if (data.total_clicks === null) warnings.push("Clics total non détecté");
  if (data.total_impressions === null) warnings.push("Impressions total non détecté");
  if (data.top_queries.length === 0) warnings.push("Aucune requête top parsée");

  return { data, errors, warnings };
}
