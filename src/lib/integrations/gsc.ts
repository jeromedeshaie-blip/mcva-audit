/**
 * Google Search Console API fetcher (Phase 2B POLE-PERF v2.1)
 *
 * Uses Search Analytics API to fetch data suitable for Bloc B.
 * Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
 */

import type { BlocBData } from "@/lib/audit/parsers/types";

export interface GscFetchOptions {
  accessToken: string;
  siteUrl: string; // e.g. "https://mcva.ch/" or "sc-domain:mcva.ch"
  monthsBack?: number; // default 16
}

export async function fetchGscData(opts: GscFetchOptions): Promise<BlocBData> {
  const { accessToken, siteUrl, monthsBack = 16 } = opts;

  const endDate = new Date().toISOString().split("T")[0];
  const start = new Date();
  start.setMonth(start.getMonth() - monthsBack);
  const startDate = start.toISOString().split("T")[0];

  // Aggregated totals
  const totalsRes = await gscQuery(accessToken, siteUrl, {
    startDate, endDate,
    dimensions: [],
    rowLimit: 1,
  });
  const totalsRow = totalsRes.rows?.[0] || {};

  // Top 30 queries
  const queriesRes = await gscQuery(accessToken, siteUrl, {
    startDate, endDate,
    dimensions: ["query"],
    rowLimit: 30,
  });

  // Top 20 pages
  const pagesRes = await gscQuery(accessToken, siteUrl, {
    startDate, endDate,
    dimensions: ["page"],
    rowLimit: 20,
  });

  return {
    total_clicks: totalsRow.clicks ?? null,
    total_impressions: totalsRow.impressions ?? null,
    avg_ctr: totalsRow.ctr != null ? Math.round(totalsRow.ctr * 10000) / 100 : null, // convert to %
    avg_position: totalsRow.position != null ? Math.round(totalsRow.position * 10) / 10 : null,
    period_months: monthsBack,
    top_queries: (queriesRes.rows || []).map((r: any) => ({
      query: r.keys?.[0] || "",
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr != null ? Math.round(r.ctr * 10000) / 100 : null,
      position: r.position != null ? Math.round(r.position * 10) / 10 : 0,
    })),
    top_pages: (pagesRes.rows || []).map((r: any) => ({
      url: r.keys?.[0] || "",
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
    })),
  };
}

async function gscQuery(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>
): Promise<any> {
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC API error ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * List all sites the user has access to in Search Console.
 */
export async function listGscSites(accessToken: string): Promise<Array<{ siteUrl: string; permissionLevel: string }>> {
  const res = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`GSC list sites failed: ${res.status}`);
  const data = await res.json();
  return data.siteEntry || [];
}
