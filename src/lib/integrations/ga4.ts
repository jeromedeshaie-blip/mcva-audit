/**
 * Google Analytics 4 Data API fetcher (Phase 2B POLE-PERF v2.1)
 *
 * Uses GA4 Data API v1 to fetch data suitable for Bloc C.
 * Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

import type { BlocCData } from "@/lib/audit/parsers/types";

export interface Ga4FetchOptions {
  accessToken: string;
  propertyId: string; // e.g. "123456789"
  monthsBack?: number; // default 12
}

export async function fetchGa4Data(opts: Ga4FetchOptions): Promise<BlocCData> {
  const { accessToken, propertyId, monthsBack = 12 } = opts;

  const endDate = new Date().toISOString().split("T")[0];
  const start = new Date();
  start.setMonth(start.getMonth() - monthsBack);
  const startDate = start.toISOString().split("T")[0];

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "engagementRate" },
      { name: "averageSessionDuration" },
      { name: "conversions" },
    ],
    dimensionFilter: {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { matchType: "EXACT", value: "Organic Search" },
      },
    },
  };

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GA4 API error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();

  const row = data.rows?.[0];
  const metricValues = row?.metricValues || [];
  const [sessions, users, engagement, avgDur, conversions] = metricValues.map((m: any) => Number(m.value) || 0);

  return {
    sessions_organic: Math.round(sessions) || null,
    users_organic: Math.round(users) || null,
    engagement_rate: engagement ? Math.round(engagement * 10000) / 100 : null, // ratio → %
    avg_session_duration_sec: avgDur ? Math.round(avgDur) : null,
    conversions_organic: Math.round(conversions) || null,
    period_months: monthsBack,
  };
}

/**
 * List GA4 properties accessible to the user.
 */
export async function listGa4Properties(accessToken: string): Promise<Array<{ propertyId: string; displayName: string }>> {
  const res = await fetch("https://analyticsadmin.googleapis.com/v1beta/accounts", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const accounts = data.accounts || [];
  const properties: Array<{ propertyId: string; displayName: string }> = [];

  for (const acc of accounts) {
    const pRes = await fetch(
      `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${acc.name}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!pRes.ok) continue;
    const pData = await pRes.json();
    for (const prop of pData.properties || []) {
      properties.push({
        propertyId: prop.name.replace("properties/", ""),
        displayName: prop.displayName || "",
      });
    }
  }

  return properties;
}
