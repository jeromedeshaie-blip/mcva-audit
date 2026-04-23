# 05 — Audit Ultra & Wizard

**Module** : 05 — Audit Ultra & Wizard
**Version** : 2.1 (tag `v2.1-release`)

Wizard 6 blocs A-F (Phase 2C), parseurs dédiés, fetch-step retry, load-blocs depuis DB.

---

## `src/lib/audit/fetch-step.ts`

```typescript
/**
 * Shared fetchStep utility used by audit UI pages (nouveau-audit, audit-complet).
 * Handles:
 * - Network errors with configurable retry count
 * - Vercel 504/502 timeouts (with retry)
 * - JSON parsing errors
 * - Server errors (non-JSON responses)
 *
 * POLE-PERFORMANCE v2.1 § 14 règle 6 — autonomie, retry auto avant de casser.
 */

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BROWSER_TIMEOUT_MS = 310_000; // >300s server max, leaves margin
const RETRY_DELAY_MS = 2000;

export interface FetchStepOptions {
  /** Number of retry attempts on network/timeout errors. Default: 2 (→ 3 attempts total). */
  retries?: number;
  /** Browser-side abort timeout. Default: 310s. */
  timeoutMs?: number;
  /** Label used in error messages. */
  label: string;
}

export async function fetchStep<T = any>(
  url: string,
  body: unknown,
  options: FetchStepOptions
): Promise<T> {
  const { retries = DEFAULT_MAX_RETRIES, timeoutMs = DEFAULT_BROWSER_TIMEOUT_MS, label } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;

    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (networkErr) {
      if (attempt < retries) {
        console.warn(`[audit] Network error on ${label}, retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw new Error(`Erreur reseau a l'etape "${label}". Verifiez votre connexion et reessayez.`);
    }

    // Handle Vercel timeout / non-JSON errors
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if ((res.status === 504 || res.status === 502) && attempt < retries) {
        console.warn(`[audit] Timeout on ${label}, retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      if (res.status === 504 || res.status === 502) {
        throw new Error(`Timeout serveur a l'etape "${label}". Veuillez reessayer.`);
      }
      throw new Error(`Erreur serveur (${res.status}) a l'etape "${label}".`);
    }

    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || `Erreur ${res.status}`);
      throw new Error(`${msg} (etape "${label}")`);
    }
    return data as T;
  }

  throw new Error(`Echec apres ${retries + 1} tentatives a l'etape "${label}".`);
}

```


## `src/lib/audit/load-blocs.ts`

```typescript
/**
 * Load external blocks (A-F) from audit_external_blocks for a given audit.
 * Returns a BlocsBundle ready for enrichment in the scoring pipeline.
 *
 * POLE-PERFORMANCE v2.1 § 6.4.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlocsBundle } from "@/lib/scoring/external-mapping";

export async function loadAuditBlocs(
  supabase: SupabaseClient,
  auditId: string
): Promise<BlocsBundle> {
  const { data, error } = await supabase
    .from("audit_external_blocks")
    .select("bloc_letter, data_json, source_label")
    .eq("audit_id", auditId);

  if (error || !data) return {};

  const bundle: BlocsBundle = { sourceLabels: {} };

  for (const row of data as any[]) {
    const letter = row.bloc_letter as "A" | "B" | "C" | "D" | "E" | "F";
    (bundle as any)[letter] = row.data_json;
    if (row.source_label) {
      bundle.sourceLabels![letter] = row.source_label;
    }
  }

  return bundle;
}

```


## `src/lib/audit/parsers/types.ts`

```typescript
/**
 * Types communs pour les 6 blocs A-F (POLE-PERF v2.1 § 6.4).
 */

// Bloc A — Ahrefs Webmaster Tools
export interface BlocAData {
  domain_rating: number | null;
  backlinks_total: number | null;
  referring_domains: number | null;
  top_referring_domains: Array<{ domain: string; dr: number }>;
  new_backlinks_30d: number | null;
  lost_backlinks_30d: number | null;
  positioned_keywords: number | null;
  top_keywords: Array<{
    keyword: string;
    position: number;
    volume: number | null;
    url: string | null;
  }>;
}

// Bloc B — Google Search Console
export interface BlocBData {
  total_clicks: number | null;
  total_impressions: number | null;
  avg_ctr: number | null;
  avg_position: number | null;
  period_months: number | null; // default 16
  top_queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number | null;
    position: number;
  }>;
  top_pages: Array<{
    url: string;
    clicks: number;
    impressions: number;
  }>;
  brand_vs_nonbrand?: {
    brand_clicks: number;
    nonbrand_clicks: number;
  };
}

// Bloc C — Google Analytics 4
export interface BlocCData {
  sessions_organic: number | null;
  users_organic: number | null;
  engagement_rate: number | null;
  avg_session_duration_sec: number | null;
  conversions_organic: number | null;
  period_months: number | null; // default 12
}

// Bloc D — Concurrents (Moz + SimilarWeb + Seobility)
export interface BlocDCompetitor {
  name: string;
  domain: string;
  moz_da: number | null;
  moz_spam_score: number | null;
  similarweb_traffic_monthly: number | null;
  similarweb_top_countries: string[];
  similarweb_top_keywords: string[];
  seobility_backlinks_total: number | null;
  top_10_referring_domains: string[];
}

export interface BlocDData {
  competitors: BlocDCompetitor[];
}

// Bloc E — Google Keyword Planner CH
export interface BlocEKeyword {
  keyword: string;
  volume_monthly: number;
  competition: "low" | "medium" | "high" | null;
  cpc_estimate_chf?: number | null;
}

export interface BlocEData {
  language: "fr" | "de" | "it" | "en" | string;
  country: "CH" | string;
  keywords: BlocEKeyword[];
}

// Bloc F — LLM Watch (structure alignée avec llmwatch_scores)
export interface BlocFData {
  dashboard_url: string | null;
  score_geo: number;
  score_presence: number;
  score_exactitude: number;
  score_sentiment: number;
  score_recommendation: number;
  score_by_llm: Record<string, number>;
  mention_rate_by_llm?: Record<string, number>;
  sample_queries: Array<{
    query: string;
    llm: string;
    cited: boolean;
    snippet?: string;
  }>;
  competitors_sov?: Array<{
    competitor: string;
    mention_rate: number;
    sov: number;
    avg_position?: number;
  }>;
  model_snapshot_version: string | null;
  run_count: number | null;
  score_stddev: number | null;
  run_level: string | null;
}

export type BlocData = BlocAData | BlocBData | BlocCData | BlocDData | BlocEData | BlocFData;

export interface ParseResult<T> {
  data: T;
  errors: string[];
  warnings: string[];
}

```


## `src/lib/audit/parsers/parse-bloc-a-awt.ts`

```typescript
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

```


## `src/lib/audit/parsers/parse-bloc-b-gsc.ts`

```typescript
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

```


## `src/lib/audit/parsers/parse-bloc-c-ga4.ts`

```typescript
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

```


## `src/lib/audit/parsers/parse-bloc-d-competitors.ts`

```typescript
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

```


## `src/lib/audit/parsers/parse-bloc-e-keywords.ts`

```typescript
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

```


## `src/lib/audit/parsers/fetch-bloc-f-llmwatch.ts`

```typescript
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

```

