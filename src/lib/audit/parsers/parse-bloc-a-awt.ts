/**
 * Parseur Bloc A — Ahrefs Webmaster Tools (AWT) export
 *
 * Accepte :
 * - Format "paste libre" (ce que l'utilisateur copie-colle du dashboard AWT)
 * - CSV AWT standardisé (colonnes: Domain Rating, Backlinks, RD, Keywords...)
 *
 * POLE-PERFORMANCE v2.1 § 6.4 Bloc A.
 */

import type { BlocAData, ParseResult } from "./types";

const EMPTY: BlocAData = {
  domain_rating: null,
  backlinks_total: null,
  referring_domains: null,
  top_referring_domains: [],
  new_backlinks_30d: null,
  lost_backlinks_30d: null,
  positioned_keywords: null,
  top_keywords: [],
};

/**
 * Tente d'extraire une valeur numérique d'une ligne "label: valeur".
 * Ex: "Domain Rating: 45" → 45
 * Ex: "Backlinks total : 1'234" → 1234
 */
function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const clean = match[1].replace(/[\s'']/g, "").replace(",", ".");
      const num = parseFloat(clean);
      if (!isNaN(num)) return num;
    }
  }
  return null;
}

export function parseBlocAawt(input: string): ParseResult<BlocAData> {
  const data: BlocAData = { ...EMPTY, top_referring_domains: [], top_keywords: [] };
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input || input.trim().length === 0) {
    errors.push("Bloc A vide");
    return { data, errors, warnings };
  }

  const text = input.trim();

  // Domain Rating
  data.domain_rating = extractNumber(text, [
    /Domain\s+Rating\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i,
    /\bDR\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i,
  ]);

  // Backlinks total
  data.backlinks_total = extractNumber(text, [
    /Backlinks(?:\s+total)?\s*[:=]?\s*([\d\s''.,]+)/i,
    /Total\s+backlinks\s*[:=]?\s*([\d\s''.,]+)/i,
  ]);

  // Referring Domains
  data.referring_domains = extractNumber(text, [
    /Referring\s+[Dd]omains?\s*[:=]?\s*([\d\s''.,]+)/i,
    /\bRD\s*[:=]?\s*([\d\s''.,]+)/i,
    /Domaines?\s+r[ée]f[ée]rents?\s*[:=]?\s*([\d\s''.,]+)/i,
  ]);

  // New backlinks 30d
  data.new_backlinks_30d = extractNumber(text, [
    /Nouveaux\s+(?:backlinks|liens)\s+30\s*j(?:ours)?\s*[:=]?\s*([\d\s''.,]+)/i,
    /New\s+(?:backlinks|links)\s+(?:30\s*days?|30d)\s*[:=]?\s*([\d\s''.,]+)/i,
  ]);

  // Lost backlinks 30d
  data.lost_backlinks_30d = extractNumber(text, [
    /Perdus?\s+30\s*j(?:ours)?\s*[:=]?\s*([\d\s''.,]+)/i,
    /Lost\s+(?:30\s*days?|30d)\s*[:=]?\s*([\d\s''.,]+)/i,
  ]);

  // Positioned keywords
  data.positioned_keywords = extractNumber(text, [
    /Mots[\-\s]cl[eé]s?\s+positionn[eé]s?\s*[:=]?\s*([\d\s''.,]+)/i,
    /Positioned\s+keywords?\s*[:=]?\s*([\d\s''.,]+)/i,
    /Keywords?\s+top\s*100\s*[:=]?\s*([\d\s''.,]+)/i,
  ]);

  // Top RD — lignes "domain.tld | DR 45"
  const rdMatches = text.matchAll(/^([a-z0-9-]+(?:\.[a-z0-9-]+)+)\s*[|,;\t]\s*(?:DR\s*)?(\d+)/gim);
  for (const m of rdMatches) {
    if (data.top_referring_domains.length >= 20) break;
    data.top_referring_domains.push({ domain: m[1], dr: parseInt(m[2], 10) });
  }

  // Top keywords — tabular rows "keyword | position | volume | url"
  const kwMatches = text.matchAll(
    /^([^\t\n|]{3,80})\s*[|\t]\s*(\d+)\s*[|\t]\s*([\d\s''.,-]+)?\s*(?:[|\t]\s*(https?:\/\/[^\s|]+))?/gim
  );
  for (const m of kwMatches) {
    if (data.top_keywords.length >= 20) break;
    const kw = m[1].trim();
    const pos = parseInt(m[2], 10);
    const vol = m[3] ? extractNumber(m[3], [/([\d\s''.,]+)/]) : null;
    // Skip header rows
    if (/^(keyword|query|mot-cl[eé])/i.test(kw)) continue;
    // Skip if position > 100 (probably junk)
    if (pos > 100) continue;
    data.top_keywords.push({
      keyword: kw,
      position: pos,
      volume: vol,
      url: m[4] || null,
    });
  }

  // Warnings si champs critiques manquants
  if (data.domain_rating === null) warnings.push("Domain Rating non détecté");
  if (data.backlinks_total === null) warnings.push("Backlinks total non détecté");
  if (data.referring_domains === null) warnings.push("Referring Domains non détecté");

  return { data, errors, warnings };
}
