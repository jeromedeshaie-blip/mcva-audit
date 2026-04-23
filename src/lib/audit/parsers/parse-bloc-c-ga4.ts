/**
 * Parseur Bloc C — Google Analytics 4 (canal Organic Search, 12 derniers mois)
 *
 * POLE-PERFORMANCE v2.1 § 6.4 Bloc C.
 */

import type { BlocCData, ParseResult } from "./types";

function cleanNumber(s: string): number | null {
  const cleaned = s.replace(/[\s'']/g, "").replace("%", "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function parseBlocCga4(input: string): ParseResult<BlocCData> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: BlocCData = {
    sessions_organic: null,
    users_organic: null,
    engagement_rate: null,
    avg_session_duration_sec: null,
    conversions_organic: null,
    period_months: null,
  };

  if (!input || input.trim().length === 0) {
    errors.push("Bloc C vide");
    return { data, errors, warnings };
  }

  const text = input.trim();

  const sessionsMatch = text.match(/Sessions?\s+organic\s*[:=]?\s*([\d\s''.,]+)/i)
    || text.match(/Sessions?\s*[:=]?\s*([\d\s''.,]+)/i);
  if (sessionsMatch) data.sessions_organic = cleanNumber(sessionsMatch[1]);

  const usersMatch = text.match(/Utilisateurs?\s+organic\s*[:=]?\s*([\d\s''.,]+)/i)
    || text.match(/Users?\s+organic\s*[:=]?\s*([\d\s''.,]+)/i)
    || text.match(/Utilisateurs?\s*[:=]?\s*([\d\s''.,]+)/i);
  if (usersMatch) data.users_organic = cleanNumber(usersMatch[1]);

  const engagementMatch = text.match(/Taux\s+d'?engagement\s*[:=]?\s*([\d.,]+)\s*%?/i)
    || text.match(/Engagement\s+rate\s*[:=]?\s*([\d.,]+)\s*%?/i);
  if (engagementMatch) data.engagement_rate = cleanNumber(engagementMatch[1]);

  const durMatch = text.match(/Dur[ée]e\s+moyenne\s+(?:de\s+)?session\s*[:=]?\s*([\d.,]+)\s*(?:sec|s|min|m)?/i)
    || text.match(/Avg\.?\s+session\s+duration\s*[:=]?\s*([\d.,]+)/i);
  if (durMatch) {
    const n = cleanNumber(durMatch[1]);
    // If the label mentions "min", convert to seconds
    if (n !== null && /min|m/i.test(durMatch[0]) && !/sec|s\b/i.test(durMatch[0])) {
      data.avg_session_duration_sec = Math.round(n * 60);
    } else {
      data.avg_session_duration_sec = n;
    }
  }

  const convMatch = text.match(/Conversions?\s+organic\s*[:=]?\s*([\d\s''.,]+)/i)
    || text.match(/Conversions?\s*[:=]?\s*([\d\s''.,]+)/i);
  if (convMatch) data.conversions_organic = cleanNumber(convMatch[1]);

  const periodMatch = text.match(/(\d+)\s*(?:derniers?\s+)?mois/i)
    || text.match(/last\s+(\d+)\s+months/i);
  data.period_months = periodMatch ? parseInt(periodMatch[1], 10) : 12;

  if (data.sessions_organic === null) warnings.push("Sessions organic non détecté");
  if (data.users_organic === null) warnings.push("Utilisateurs organic non détecté");

  return { data, errors, warnings };
}
