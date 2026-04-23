/**
 * Parseur Bloc E — Google Keyword Planner (marché CH)
 *
 * Accepte :
 * - Paste de lignes "keyword | volume | concurrence"
 * - CSV simple (4 colonnes)
 *
 * POLE-PERFORMANCE v2.1 § 6.4 Bloc E.
 */

import type { BlocEData, BlocEKeyword, ParseResult } from "./types";

function cleanNumber(s: string): number | null {
  const cleaned = s.replace(/[\s'']/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function normalizeCompetition(raw: string | undefined): "low" | "medium" | "high" | null {
  if (!raw) return null;
  const lc = raw.toLowerCase().trim();
  if (/faible|low/i.test(lc)) return "low";
  if (/moyen|medium/i.test(lc)) return "medium";
  if (/élev|high|fort/i.test(lc)) return "high";
  return null;
}

export function parseBlocEkeywords(input: string): ParseResult<BlocEData> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const keywords: BlocEKeyword[] = [];

  if (!input || input.trim().length === 0) {
    errors.push("Bloc E vide");
    return { data: { language: "fr", country: "CH", keywords }, errors, warnings };
  }

  const text = input.trim();

  // Detect language
  let language: string = "fr";
  if (/\blang(?:ue)?\s*[:=]?\s*DE/i.test(text)) language = "de";
  else if (/\blang(?:ue)?\s*[:=]?\s*IT/i.test(text)) language = "it";
  else if (/\blang(?:ue)?\s*[:=]?\s*EN/i.test(text)) language = "en";

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    if (keywords.length >= 30) break;
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^(mots?-cl[eé]s?|keywords?|cibles?|langue)/i.test(line)) continue;

    const parts = line.split(/\s*[|,\t]\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    const keyword = parts[0];
    const volumeStr = parts[1] || "";
    const competitionStr = parts[2];
    const cpcStr = parts[3];

    const volume = cleanNumber(volumeStr);
    if (volume === null || keyword.length < 2 || keyword.length > 100) continue;

    const kw: BlocEKeyword = {
      keyword,
      volume_monthly: Math.round(volume),
      competition: normalizeCompetition(competitionStr),
    };
    if (cpcStr) {
      const cpc = cleanNumber(cpcStr.replace(/CHF|chf|€|\$/gi, ""));
      if (cpc !== null) kw.cpc_estimate_chf = cpc;
    }
    keywords.push(kw);
  }

  if (keywords.length === 0) warnings.push("Aucun mot-clé parsé");

  return {
    data: { language, country: "CH", keywords },
    errors,
    warnings,
  };
}
