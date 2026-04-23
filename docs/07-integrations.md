# 07 — Intégrations Google (OAuth GSC + GA4)

**Module** : 07 — Intégrations Google (OAuth GSC + GA4)
**Version** : 2.1 (tag `v2.1-release`)

Phase 2B v2.1 — OAuth Google pour automatiser blocs B (Search Console) et C (Analytics 4).

---

## `src/lib/integrations/google-oauth.ts`

```typescript
/**
 * Google OAuth helpers for GSC + GA4.
 *
 * Requires env vars:
 *   - GOOGLE_OAUTH_CLIENT_ID
 *   - GOOGLE_OAUTH_CLIENT_SECRET
 *   - NEXT_PUBLIC_SITE_URL (e.g. https://mcva-audit.vercel.app)
 *
 * POLE-PERFORMANCE v2.1 Phase 2B.
 */

export const GOOGLE_SCOPES = {
  gsc: "https://www.googleapis.com/auth/webmasters.readonly",
  ga4: "https://www.googleapis.com/auth/analytics.readonly",
  email: "https://www.googleapis.com/auth/userinfo.email",
} as const;

export type GoogleProvider = "google_gsc" | "google_ga4";

export function buildAuthorizeUrl(provider: GoogleProvider, state: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || "https://mcva-audit.vercel.app";
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not set");

  const scopes = [
    provider === "google_gsc" ? GOOGLE_SCOPES.gsc : GOOGLE_SCOPES.ga4,
    GOOGLE_SCOPES.email,
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${redirectBase}/api/integrations/google/callback`,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || "https://mcva-audit.vercel.app";
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not set");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${redirectBase}/api/integrations/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not set");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}

```


## `src/lib/integrations/gsc.ts`

```typescript
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

```


## `src/lib/integrations/ga4.ts`

```typescript
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

```

