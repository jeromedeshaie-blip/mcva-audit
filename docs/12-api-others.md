# 12 — API Routes (Ultra wizard, integrations, legacy)

**Module** : 12 — API Routes (Ultra wizard, integrations, legacy)
**Version** : 2.1 (tag `v2.1-release`)

Endpoints audit-ultra/blocks (wizard v2.1), integrations Google OAuth, audit legacy, siteaudit, debug.

---

## `src/app/api/audit-ultra/blocks/route.ts`

```typescript
/**
 * API — audit-ultra/blocks
 * GET  : list blocks for an audit + canRunUltra status
 * POST : upload/update a block (A-F)
 * DELETE : remove a block
 *
 * POLE-PERFORMANCE v2.1 § 6.4.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canRunUltra, type ExternalBlockLetter, EXTERNAL_BLOCKS } from "@/lib/scoring/constants";
import { parseBlocAawt } from "@/lib/audit/parsers/parse-bloc-a-awt";
import { parseBlocBgsc } from "@/lib/audit/parsers/parse-bloc-b-gsc";
import { parseBlocCga4 } from "@/lib/audit/parsers/parse-bloc-c-ga4";
import { parseBlocDcompetitors } from "@/lib/audit/parsers/parse-bloc-d-competitors";
import { parseBlocEkeywords } from "@/lib/audit/parsers/parse-bloc-e-keywords";
import { buildBlocFFromLlmWatch } from "@/lib/audit/parsers/fetch-bloc-f-llmwatch";

export const maxDuration = 30;

// --------------------------------------------------------------------
// GET — list blocks for an audit
// --------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const auditId = request.nextUrl.searchParams.get("auditId");
  if (!auditId) return NextResponse.json({ error: "auditId requis" }, { status: 400 });

  const service = createServiceClient();
  const { data: blocks, error } = await service
    .from("audit_external_blocks")
    .select("*")
    .eq("audit_id", auditId)
    .order("bloc_letter");

  if (error) {
    return NextResponse.json({ error: "DB error", detail: error.message }, { status: 500 });
  }

  const availableLetters = (blocks || []).map((b: any) => b.bloc_letter as ExternalBlockLetter);
  const readiness = canRunUltra(availableLetters);

  return NextResponse.json({
    blocks: blocks || [],
    readiness,
    available_blocks: availableLetters,
  });
}

// --------------------------------------------------------------------
// POST — upload/update a block
// --------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { auditId, blocLetter, rawInput, sourceLabel, structuredData, llmwatchClientId } = body;

  if (!auditId || !blocLetter) {
    return NextResponse.json({ error: "auditId et blocLetter requis" }, { status: 400 });
  }
  if (!["A", "B", "C", "D", "E", "F"].includes(blocLetter)) {
    return NextResponse.json({ error: "blocLetter invalide (A-F)" }, { status: 400 });
  }

  const letter = blocLetter as ExternalBlockLetter;
  const blocInfo = EXTERNAL_BLOCKS[letter];
  const service = createServiceClient();

  // Parse according to bloc type
  let parsed: any = null;
  let errors: string[] = [];
  let warnings: string[] = [];

  try {
    switch (letter) {
      case "A": {
        const r = parseBlocAawt(rawInput || "");
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "B": {
        const r = parseBlocBgsc(rawInput || "");
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "C": {
        const r = parseBlocCga4(rawInput || "");
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "D": {
        // Accepte structuredData direct (JSON du form) OU rawInput (paste)
        const input = structuredData || rawInput || "";
        const r = parseBlocDcompetitors(input);
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "E": {
        const r = parseBlocEkeywords(rawInput || "");
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "F": {
        // Fetch latest LLM Watch score for the specified client
        if (!llmwatchClientId) {
          return NextResponse.json({ error: "llmwatchClientId requis pour Bloc F" }, { status: 400 });
        }
        const { data: scoreRow, error: scoreErr } = await service
          .from("llmwatch_scores")
          .select("*")
          .eq("client_id", llmwatchClientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scoreErr || !scoreRow) {
          return NextResponse.json(
            { error: "Aucun score LLM Watch trouvé", detail: scoreErr?.message },
            { status: 404 }
          );
        }

        const { data: sampleRaw } = await service
          .from("llmwatch_raw_results")
          .select("query_id, llm, response_raw, cited")
          .eq("client_id", llmwatchClientId)
          .order("collected_at", { ascending: false })
          .limit(10);

        const sampleQueries = (sampleRaw || []).map((r: any) => ({
          query: r.query_id,
          llm: r.llm,
          cited: r.cited || false,
          snippet: r.response_raw ? String(r.response_raw).slice(0, 200) : undefined,
        }));

        const dashboardUrl = `https://mcva-audit.vercel.app/llmwatch/dashboard/${llmwatchClientId}`;
        const r = buildBlocFFromLlmWatch(scoreRow, sampleQueries, [], dashboardUrl);
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Parse failed", detail: e.message }, { status: 500 });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; "), warnings }, { status: 400 });
  }

  // Upsert bloc (delete existing then insert)
  await service
    .from("audit_external_blocks")
    .delete()
    .eq("audit_id", auditId)
    .eq("bloc_letter", letter);

  const { data: inserted, error: insertErr } = await service
    .from("audit_external_blocks")
    .insert({
      audit_id: auditId,
      bloc_letter: letter,
      bloc_name: blocInfo.name,
      data_json: parsed,
      source_label: sourceLabel || `${blocInfo.short} import ${new Date().toISOString().split("T")[0]}`,
      raw_input: letter === "F" ? null : (rawInput || null),
      parse_errors: warnings,
      imported_by: user.id,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "DB insert failed", detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, block: inserted, warnings });
}

// --------------------------------------------------------------------
// DELETE — remove a block
// --------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const auditId = request.nextUrl.searchParams.get("auditId");
  const blocLetter = request.nextUrl.searchParams.get("blocLetter");
  if (!auditId || !blocLetter) {
    return NextResponse.json({ error: "auditId et blocLetter requis" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("audit_external_blocks")
    .delete()
    .eq("audit_id", auditId)
    .eq("bloc_letter", blocLetter);

  if (error) {
    return NextResponse.json({ error: "DB delete failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

```


## `src/app/api/integrations/google/authorize/route.ts`

```typescript
/**
 * GET /api/integrations/google/authorize?provider=google_gsc
 * Redirects the user to Google's OAuth consent screen.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl, type GoogleProvider } from "@/lib/integrations/google-oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const provider = request.nextUrl.searchParams.get("provider") as GoogleProvider | null;
  if (!provider || !["google_gsc", "google_ga4"].includes(provider)) {
    return NextResponse.json({ error: "provider requis (google_gsc | google_ga4)" }, { status: 400 });
  }

  // State embeds user + provider for callback security (CSRF + routing)
  const state = Buffer.from(JSON.stringify({ uid: user.id, provider, ts: Date.now() })).toString("base64url");

  try {
    const url = buildAuthorizeUrl(provider, state);
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ error: "OAuth config missing", detail: e.message }, { status: 500 });
  }
}

```


## `src/app/api/integrations/google/callback/route.ts`

```typescript
/**
 * GET /api/integrations/google/callback?code=...&state=...
 * Exchanges the code for tokens and stores them in external_data_connections.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, fetchGoogleUserEmail, type GoogleProvider } from "@/lib/integrations/google-oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url));
  }
  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/settings/integrations?error=missing_params", request.url));
  }

  let provider: GoogleProvider;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    if (state.uid !== user.id) throw new Error("user mismatch");
    provider = state.provider;
  } catch {
    return NextResponse.redirect(new URL("/settings/integrations?error=invalid_state", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await fetchGoogleUserEmail(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const service = createServiceClient();

    // Upsert — replace existing connection for same user+provider
    await service
      .from("external_data_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    await service.from("external_data_connections").insert({
      user_id: user.id,
      provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      scope: tokens.scope || null,
      account_email: email,
    });

    return NextResponse.redirect(new URL(`/settings/integrations?connected=${provider}`, request.url));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(e.message)}`, request.url));
  }
}

```


## `src/app/api/integrations/google/disconnect/route.ts`

```typescript
/**
 * POST /api/integrations/google/disconnect
 * Body: { provider: "google_gsc" | "google_ga4" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { provider } = body;
  if (!provider || !["google_gsc", "google_ga4"].includes(provider)) {
    return NextResponse.json({ error: "provider invalide" }, { status: 400 });
  }

  const service = createServiceClient();
  await service.from("external_data_connections").delete().eq("user_id", user.id).eq("provider", provider);
  await service.from("external_data_cache").delete().eq("user_id", user.id).eq("provider", provider);

  return NextResponse.json({ success: true });
}

```


## `src/app/api/integrations/google/fetch-ga4/route.ts`

```typescript
/**
 * POST /api/integrations/google/fetch-ga4
 * Body: { propertyId: "123456789", monthsBack?: 12 }
 * Returns: BlocCData (format Bloc C)
 *
 * Caches 24h via external_data_cache.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchGa4Data, listGa4Properties } from "@/lib/integrations/ga4";
import { refreshAccessToken } from "@/lib/integrations/google-oauth";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { propertyId, monthsBack = 12 } = body;
  if (!propertyId) return NextResponse.json({ error: "propertyId requis" }, { status: 400 });

  const service = createServiceClient();
  const cacheKey = `${propertyId}|${monthsBack}`;

  const { data: cached } = await service
    .from("external_data_cache")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google_ga4")
    .eq("domain", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ data: cached.data_json, cached: true, fetched_at: cached.fetched_at });
  }

  const { data: conn } = await service
    .from("external_data_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google_ga4")
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: "Non connecté à GA4" }, { status: 404 });

  let accessToken = conn.access_token;
  if (conn.expires_at && new Date(conn.expires_at) < new Date()) {
    if (!conn.refresh_token) {
      return NextResponse.json({ error: "Token expiré, reconnectez-vous" }, { status: 401 });
    }
    try {
      const refreshed = await refreshAccessToken(conn.refresh_token);
      accessToken = refreshed.access_token;
      await service
        .from("external_data_connections")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("id", conn.id);
    } catch (e: any) {
      return NextResponse.json({ error: "Refresh échoué", detail: e.message }, { status: 401 });
    }
  }

  try {
    const data = await fetchGa4Data({ accessToken, propertyId, monthsBack });

    await service
      .from("external_data_cache")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google_ga4")
      .eq("domain", cacheKey);
    await service.from("external_data_cache").insert({
      user_id: user.id,
      provider: "google_ga4",
      domain: cacheKey,
      data_json: data,
    });

    return NextResponse.json({ data, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: "GA4 fetch failed", detail: e.message }, { status: 500 });
  }
}

// GET: list properties
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const service = createServiceClient();
  const { data: conn } = await service
    .from("external_data_connections")
    .select("access_token, expires_at, refresh_token, id")
    .eq("user_id", user.id)
    .eq("provider", "google_ga4")
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: "Non connecté à GA4" }, { status: 404 });

  let accessToken = conn.access_token;
  if (conn.expires_at && new Date(conn.expires_at) < new Date() && conn.refresh_token) {
    const refreshed = await refreshAccessToken(conn.refresh_token);
    accessToken = refreshed.access_token;
    await service
      .from("external_data_connections")
      .update({ access_token: accessToken, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
      .eq("id", conn.id);
  }

  try {
    const properties = await listGa4Properties(accessToken);
    return NextResponse.json({ properties });
  } catch (e: any) {
    return NextResponse.json({ error: "List properties failed", detail: e.message }, { status: 500 });
  }
}

```


## `src/app/api/integrations/google/fetch-gsc/route.ts`

```typescript
/**
 * POST /api/integrations/google/fetch-gsc
 * Body: { siteUrl: "https://..." | "sc-domain:example.com", monthsBack?: 16 }
 * Returns: BlocBData (format Bloc B)
 *
 * Caches results 24h via external_data_cache.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchGscData, listGscSites } from "@/lib/integrations/gsc";
import { refreshAccessToken } from "@/lib/integrations/google-oauth";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { siteUrl, monthsBack = 16 } = body;
  if (!siteUrl) return NextResponse.json({ error: "siteUrl requis" }, { status: 400 });

  const service = createServiceClient();

  // Check cache first
  const cacheKey = `${siteUrl}|${monthsBack}`;
  const { data: cached } = await service
    .from("external_data_cache")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google_gsc")
    .eq("domain", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ data: cached.data_json, cached: true, fetched_at: cached.fetched_at });
  }

  // Load tokens
  const { data: conn } = await service
    .from("external_data_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google_gsc")
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: "Non connecté à GSC" }, { status: 404 });

  let accessToken = conn.access_token;

  // Refresh if expired
  if (conn.expires_at && new Date(conn.expires_at) < new Date()) {
    if (!conn.refresh_token) {
      return NextResponse.json({ error: "Token expiré, reconnectez-vous" }, { status: 401 });
    }
    try {
      const refreshed = await refreshAccessToken(conn.refresh_token);
      accessToken = refreshed.access_token;
      await service
        .from("external_data_connections")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("id", conn.id);
    } catch (e: any) {
      return NextResponse.json({ error: "Refresh token échoué", detail: e.message }, { status: 401 });
    }
  }

  try {
    const data = await fetchGscData({ accessToken, siteUrl, monthsBack });

    // Cache
    await service
      .from("external_data_cache")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google_gsc")
      .eq("domain", cacheKey);
    await service.from("external_data_cache").insert({
      user_id: user.id,
      provider: "google_gsc",
      domain: cacheKey,
      data_json: data,
    });

    return NextResponse.json({ data, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: "GSC fetch failed", detail: e.message }, { status: 500 });
  }
}

// GET: list sites
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const service = createServiceClient();
  const { data: conn } = await service
    .from("external_data_connections")
    .select("access_token, expires_at, refresh_token, id")
    .eq("user_id", user.id)
    .eq("provider", "google_gsc")
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: "Non connecté à GSC" }, { status: 404 });

  let accessToken = conn.access_token;
  if (conn.expires_at && new Date(conn.expires_at) < new Date() && conn.refresh_token) {
    const refreshed = await refreshAccessToken(conn.refresh_token);
    accessToken = refreshed.access_token;
    await service
      .from("external_data_connections")
      .update({ access_token: accessToken, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
      .eq("id", conn.id);
  }

  try {
    const sites = await listGscSites(accessToken);
    return NextResponse.json({ sites });
  } catch (e: any) {
    return NextResponse.json({ error: "List sites failed", detail: e.message }, { status: 500 });
  }
}

```


## `src/app/api/audit/pdf/route.tsx`

```tsx
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { htmlToPdf } from "@/lib/pdf/html-to-pdf";
import { renderAuditPdf } from "@/lib/pdf/templates/render";
import { renderPreAuditPdf } from "@/lib/pdf/templates/render-pre-audit";
import { renderUltraAuditPdf } from "@/lib/pdf/templates/render-ultra";

export const maxDuration = 60;

/**
 * GET /api/audit/pdf?id=xxx — Generate and download PDF report
 * Uses Puppeteer + @sparticuz/chromium for HTML→PDF conversion.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const auditId = request.nextUrl.searchParams.get("id");
    if (!auditId) {
      return NextResponse.json({ error: "ID audit requis" }, { status: 400 });
    }

    // Fetch audit data in parallel (including v2.1 external blocks A-F)
    const [auditRes, scoresRes, itemsRes, actionsRes, uploadsRes, blocksRes] = await Promise.all([
      supabase.from("audits").select("*").eq("id", auditId).single(),
      supabase.from("audit_scores").select("*").eq("audit_id", auditId).single(),
      supabase
        .from("audit_items")
        .select("*")
        .eq("audit_id", auditId)
        .order("item_code"),
      supabase
        .from("audit_actions")
        .select("*")
        .eq("audit_id", auditId)
        .order("priority"),
      supabase
        .from("audit_uploads")
        .select("source, parsed_data, status")
        .eq("audit_id", auditId)
        .eq("status", "parsed"),
      supabase
        .from("audit_external_blocks")
        .select("bloc_letter, source_label")
        .eq("audit_id", auditId),
    ]);

    if (!auditRes.data || !scoresRes.data) {
      return NextResponse.json({ error: "Audit non trouvé" }, { status: 404 });
    }

    // Look up benchmark ranking for this domain (full audits only)
    let benchmarkRanking = undefined;
    if (auditRes.data.audit_type === "full" || auditRes.data.audit_type === "ultra") {
      const domain = auditRes.data.domain;
      const { data: benchmarkDomain } = await supabase
        .from("benchmark_domains")
        .select("benchmark_id, domain, rank_seo, rank_geo, score_seo, score_geo")
        .eq("domain", domain)
        .not("rank_seo", "is", null)
        .limit(1);

      if (benchmarkDomain && benchmarkDomain.length > 0) {
        const bmId = benchmarkDomain[0].benchmark_id;
        const [bmRes, bmDomainsRes] = await Promise.all([
          supabase.from("benchmarks").select("*").eq("id", bmId).single(),
          supabase
            .from("benchmark_domains")
            .select("*")
            .eq("benchmark_id", bmId)
            .order("rank_seo", { ascending: true, nullsFirst: false }),
        ]);

        if (bmRes.data && bmDomainsRes.data) {
          benchmarkRanking = {
            benchmarkName: bmRes.data.name,
            geographicScope: bmRes.data.geographic_scope,
            subCategory: bmRes.data.sub_category,
            domains: bmDomainsRes.data,
            clientDomain: domain,
          };
        }
      }
    }

    // Select template based on audit_type
    const auditType = auditRes.data.audit_type;
    const audit = auditRes.data;
    const scores = scoresRes.data;
    const items = itemsRes.data || [];
    const actions = actionsRes.data || [];

    let html: string;
    if (auditType === "pre_audit" || auditType === "express") {
      html = renderPreAuditPdf({
        audit,
        scores,
        items,
        actions,
        theme: audit.theme || (audit.themes?.[0]) || "seo",
      });
    } else if (auditType === "ultra") {
      // Extract parsed Semrush/Qwairy data from uploads
      const uploads = uploadsRes.data || [];
      const semrushUpload = uploads.find((u: any) => u.source === "semrush");
      const qwairyUpload = uploads.find((u: any) => u.source === "qwairy");

      const semrushData = semrushUpload?.parsed_data
        ? {
            rank_ch: semrushUpload.parsed_data.rank_ch,
            mots_cles: semrushUpload.parsed_data.keywords?.length ?? semrushUpload.parsed_data.mots_cles,
            trafic: semrushUpload.parsed_data.trafic ?? semrushUpload.parsed_data.traffic,
            authority_score: semrushUpload.parsed_data.authority_score,
            backlinks: semrushUpload.parsed_data.backlinks,
            top_keywords: semrushUpload.parsed_data.keywords?.slice(0, 10),
            competitors: semrushUpload.parsed_data.competitors,
          }
        : undefined;

      const qwairyData = qwairyUpload?.parsed_data
        ? {
            mention_rate: qwairyUpload.parsed_data.mention_rate,
            source_rate: qwairyUpload.parsed_data.source_rate,
            sov: qwairyUpload.parsed_data.sov ?? qwairyUpload.parsed_data.share_of_voice,
            sentiment: qwairyUpload.parsed_data.sentiment,
            prompts: qwairyUpload.parsed_data.prompts,
            responses: qwairyUpload.parsed_data.responses,
            llms: qwairyUpload.parsed_data.llms,
            llm_distribution: qwairyUpload.parsed_data.llm_distribution ?? qwairyUpload.parsed_data.per_llm,
            sov_competitors: qwairyUpload.parsed_data.sov_competitors ?? qwairyUpload.parsed_data.competitors,
            sentiment_benchmark: qwairyUpload.parsed_data.sentiment_benchmark,
            sentiment_insight: qwairyUpload.parsed_data.sentiment_insight,
          }
        : undefined;

      // POLE-PERF v2.1 § 6.5 — external blocks A-F source labels
      const sourcesUsed = (blocksRes.data || [])
        .map((b: any) => b.source_label)
        .filter(Boolean) as string[];

      // POLE-PERF v2.1 § 5 — Score GEO™ 4 composantes depuis geo_data
      const geoData: any = scores.geo_data || {};
      const scoreGeoBreakdown = geoData.score_source === "llm_watch"
        ? {
            presence: Number(geoData.score_presence) || 0,
            exactitude: Number(geoData.score_exactitude) || 0,
            sentiment: Number(geoData.score_sentiment) || 0,
            recommendation: Number(geoData.score_recommendation) || 0,
            model_snapshot_version: geoData.model_snapshot_version || null,
            run_count: geoData.run_count ?? null,
            score_stddev: geoData.score_stddev ?? null,
            run_level: geoData.run_level || null,
            source: "llm_watch" as const,
          }
        : undefined;

      html = renderUltraAuditPdf({
        audit,
        scores,
        items,
        actions,
        benchmarkRanking,
        themeScores: {
          seo: scores.score_seo ?? 0,
          geo: scores.score_geo ?? 0,
          perf: scores.score_perf,          // null = non évalué
          a11y: scores.score_a11y,
          rgesn: scores.score_rgesn,
          tech: scores.score_tech,
          contenu: scores.score_contenu,
        },
        clientContext: {
          clientName: audit.brand_name || audit.domain,
          sector: audit.sector || undefined,
        },
        semrushData,
        qwairyData,
        sourcesUsed,
        scoreGeoBreakdown,
      });
    } else {
      html = renderAuditPdf({
        audit,
        scores,
        items,
        actions,
        benchmarkRanking,
      });
    }

    const format = request.nextUrl.searchParams.get("format");

    // Mode HTML: return printable HTML page (browser print → PDF)
    if (format === "html") {
      const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Audit PDF</title>
<style>@media print { @page { margin: 0; } body { margin: 0; } }</style>
<script>window.onload=function(){window.print();}</script>
</head><body>${html}</body></html>`;
      return new NextResponse(printHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Mode PDF: convert HTML → PDF via Puppeteer
    try {
      const pdfBuffer = await htmlToPdf(html);
      const filename = `audit-${auditRes.data.audit_type}-${auditRes.data.domain}-${new Date().toISOString().split("T")[0]}.pdf`;
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (pdfErr) {
      console.error("[pdf] Puppeteer failed, returning HTML fallback:", pdfErr);
      // Fallback: return printable HTML
      const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Audit PDF</title>
<style>body{margin:0}@media print{body{margin:0}}</style>
<script>window.onload=function(){window.print();}</script>
</head><body>${html}</body></html>`;
      return new NextResponse(printHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch (error) {
    console.error("[pdf] Generation failed:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du PDF",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

```


## `src/app/api/audit/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

/** Max URL length to accept */
const MAX_URL_LENGTH = 2048;
const MAX_SECTOR_LENGTH = 100;

/**
 * POST /api/audit — Launch an audit (express or full)
 *
 * Body: { url: string, sector?: string, type: "express" | "full", parent_audit_id?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Parse body safely
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { url, sector, type = "express", parent_audit_id, quality = "standard" } = body as {
    url: string;
    sector?: string;
    type?: "express" | "full";
    parent_audit_id?: string;
    quality?: "eco" | "standard" | "premium";
  };

  // Input validation
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL requise" }, { status: 400 });
  }

  if (url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "URL trop longue" }, { status: 400 });
  }

  if (sector && (typeof sector !== "string" || sector.length > MAX_SECTOR_LENGTH)) {
    return NextResponse.json({ error: "Secteur invalide" }, { status: 400 });
  }

  if (type && !["express", "full"].includes(type)) {
    return NextResponse.json({ error: "Type d'audit invalide" }, { status: 400 });
  }

  if (quality && !["eco", "standard", "premium", "ultra"].includes(quality)) {
    return NextResponse.json({ error: "Niveau de qualité invalide" }, { status: 400 });
  }

  // Extract domain from URL
  let domain: string;
  try {
    const parsed = new URL(
      url.startsWith("https://") || url.startsWith("http://") ? url : `https://${url}`
    );
    domain = parsed.hostname.replace(/^www\./, "");
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  // Validate parent_audit_id ownership if provided
  if (parent_audit_id) {
    const { data: parentAudit } = await supabase
      .from("audits")
      .select("id, created_by")
      .eq("id", parent_audit_id)
      .single();

    if (!parentAudit) {
      return NextResponse.json({ error: "Audit parent introuvable" }, { status: 404 });
    }

    if (parentAudit.created_by !== user.id) {
      return NextResponse.json({ error: "Audit parent non autorisé" }, { status: 403 });
    }
  }

  // Create audit record
  const normalizedUrl = url.startsWith("https://") || url.startsWith("http://") ? url : `https://${url}`;

  const { data: audit, error } = await supabase
    .from("audits")
    .insert({
      url: normalizedUrl,
      domain,
      sector: sector || null,
      audit_type: type,
      status: "pending",
      parent_audit_id: parent_audit_id || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Erreur lors de la création de l'audit", detail: error.message },
      { status: 500 }
    );
  }

  // Trigger Inngest function
  const eventName =
    type === "full" ? "audit/full.requested" : "audit/express.requested";

  try {
    await inngest.send({
      name: eventName,
      data: {
        auditId: audit.id,
        url: audit.url,
        domain: audit.domain,
        sector: audit.sector,
        quality: quality || "standard",
      },
    });
  } catch (inngestError) {
    // Inngest send failed — mark audit as error so it doesn't stay "pending" forever
    console.error(`[audit:${audit.id}] Inngest send failed:`, inngestError);
    await supabase
      .from("audits")
      .update({ status: "error" })
      .eq("id", audit.id);

    return NextResponse.json(
      { error: "Erreur lors du lancement de l'audit", detail: "Service d'orchestration indisponible" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    audit_id: audit.id,
    status: "pending",
    type,
    message: `Audit ${type} lancé. Suivez la progression en temps réel.`,
  });
}

/**
 * GET /api/audit?id=xxx — Get audit results
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const auditId = request.nextUrl.searchParams.get("id");

  if (!auditId) {
    // List recent audits with their scores
    const { data: audits, error: auditsError } = await supabase
      .from("audits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (auditsError) {
      console.error("[api/audit] Failed to list audits:", auditsError.message);
      return NextResponse.json({ error: "Erreur lors de la récupération des audits" }, { status: 500 });
    }

    if (!audits || audits.length === 0) {
      return NextResponse.json({ audits: [] });
    }

    // Fetch scores for completed audits
    const auditIds = audits.filter((a) => a.status === "completed").map((a) => a.id);
    const { data: allScores } = auditIds.length > 0
      ? await supabase.from("audit_scores").select("*").in("audit_id", auditIds)
      : { data: [] };

    const scoresMap = new Map((allScores || []).map((s) => [s.audit_id, s]));

    return NextResponse.json({
      audits: audits.map((audit) => ({
        audit,
        scores: scoresMap.get(audit.id) || null,
      })),
    });
  }

  // Get specific audit with scores and items
  const [auditRes, scoresRes, itemsRes, actionsRes] = await Promise.all([
    supabase.from("audits").select("*").eq("id", auditId).single(),
    supabase.from("audit_scores").select("*").eq("audit_id", auditId).single(),
    supabase
      .from("audit_items")
      .select("*")
      .eq("audit_id", auditId)
      .order("item_code"),
    supabase
      .from("audit_actions")
      .select("*")
      .eq("audit_id", auditId)
      .order("priority"),
  ]);

  return NextResponse.json({
    audit: auditRes.data,
    scores: scoresRes.data,
    items: itemsRes.data,
    actions: actionsRes.data,
  });
}

```


## `src/app/api/audit/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { parseSemrushCsv } from "@/lib/parsers/semrush-parser";
import { parseQwairyCsv } from "@/lib/parsers/qwairy-parser";

export const maxDuration = 30;

const VALID_SOURCES = ["semrush", "qwairy"] as const;
type UploadSource = (typeof VALID_SOURCES)[number];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/audit/upload
 * Upload a Semrush or Qwairy CSV file for an audit.
 *
 * Multipart form data:
 *   - auditId: string (required)
 *   - source: "semrush" | "qwairy" (required)
 *   - file: CSV file (required)
 */
export async function POST(request: NextRequest) {
  // --- Auth check ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // --- Parse multipart form data ---
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide — multipart/form-data attendu" },
      { status: 400 }
    );
  }

  const auditId = formData.get("auditId") as string | null;
  const source = formData.get("source") as string | null;
  const file = formData.get("file") as File | null;

  // --- Validate inputs ---
  if (!auditId) {
    return NextResponse.json({ error: "auditId requis" }, { status: 400 });
  }
  if (!source || !VALID_SOURCES.includes(source as UploadSource)) {
    return NextResponse.json(
      { error: `source invalide — attendu: ${VALID_SOURCES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!file) {
    return NextResponse.json({ error: "Fichier CSV requis" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)` },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  // --- Verify audit exists and belongs to user ---
  const { data: audit, error: auditErr } = await serviceClient
    .from("audits")
    .select("id, created_by")
    .eq("id", auditId)
    .single();

  if (auditErr || !audit) {
    return NextResponse.json({ error: "Audit introuvable" }, { status: 404 });
  }
  if (audit.created_by !== user.id) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  // --- Read file content ---
  let csvContent: string;
  try {
    const buffer = await file.arrayBuffer();
    // Try UTF-8 first, fallback to latin-1 for European exports
    csvContent = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    try {
      const buffer = await file.arrayBuffer();
      csvContent = new TextDecoder("iso-8859-1").decode(buffer);
    } catch {
      return NextResponse.json(
        { error: "Impossible de lire le fichier — encodage non supporté" },
        { status: 400 }
      );
    }
  }

  // --- Parse CSV ---
  let parsedData: Record<string, unknown>;
  let status: "parsed" | "error" = "parsed";
  let errorMessage: string | null = null;

  try {
    if (source === "semrush") {
      parsedData = parseSemrushCsv(csvContent) as unknown as Record<string, unknown>;
    } else {
      parsedData = parseQwairyCsv(csvContent) as unknown as Record<string, unknown>;
    }
  } catch (e: any) {
    status = "error";
    errorMessage = e.message || "Erreur de parsing CSV";
    parsedData = {};
  }

  // --- Store in audit_uploads table ---
  const { data: upload, error: insertErr } = await serviceClient
    .from("audit_uploads")
    .insert({
      audit_id: auditId,
      source,
      file_name: file.name,
      file_type: file.type || "text/csv",
      file_size: file.size,
      parsed_data: parsedData,
      status,
      error_message: errorMessage,
      uploaded_by: user.id,
    })
    .select("id, source, status, error_message")
    .single();

  if (insertErr || !upload) {
    return NextResponse.json(
      { error: "Erreur sauvegarde upload", detail: insertErr?.message },
      { status: 500 }
    );
  }

  // --- Build summary for response ---
  const summary = buildSummary(source as UploadSource, parsedData);

  return NextResponse.json({
    uploadId: upload.id,
    source: upload.source,
    status: upload.status,
    errorMessage: upload.error_message,
    parsedData: summary,
  });
}

/**
 * Build a lightweight summary of parsed data for the API response.
 * Avoids returning the full parsed payload (which may be large).
 */
function buildSummary(
  source: UploadSource,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (source === "semrush") {
    return {
      organic_traffic: data.organic_traffic ?? null,
      organic_keywords: data.organic_keywords ?? null,
      authority_score: data.authority_score ?? null,
      backlinks_total: data.backlinks_total ?? null,
      referring_domains: data.referring_domains ?? null,
      rank_ch: data.rank_ch ?? null,
      top_keywords_count: Array.isArray(data.top_keywords) ? data.top_keywords.length : 0,
      competitors_count: Array.isArray(data.competitors) ? data.competitors.length : 0,
      audit_issues_count: Array.isArray(data.audit_issues) ? data.audit_issues.length : 0,
    };
  }

  // qwairy
  return {
    mention_rate: data.mention_rate ?? 0,
    source_rate: data.source_rate ?? 0,
    share_of_voice: data.share_of_voice ?? 0,
    sentiment_score: data.sentiment_score ?? 0,
    llm_count: Array.isArray(data.llm_results) ? data.llm_results.length : 0,
    total_prompts: data.total_prompts ?? 0,
    total_responses: data.total_responses ?? 0,
    competitor_sov_count: Array.isArray(data.competitor_sov) ? data.competitor_sov.length : 0,
    topics_count: Array.isArray(data.topics) ? data.topics.length : 0,
  };
}

```


## `src/app/api/siteaudit/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { crawlUrl, checkRobotsTxt } from "@/lib/siteaudit/crawler";
import { runSeoChecks } from "@/lib/siteaudit/seo-checker";
import { getPageSpeedScore } from "@/lib/siteaudit/performance";
import { analyzeReadability } from "@/lib/siteaudit/readability";
import {
  computeGlobalScore,
  accessibilityViolationsToScore,
  readabilityToScore,
} from "@/lib/siteaudit/scoring";
import { generateRecommendations } from "@/lib/siteaudit/recommendations";
import { createClient } from "@/lib/supabase/server";
import type { AccessibilityViolation } from "@/lib/siteaudit/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { url, clientId, keywords = [] } = await req.json();

  if (!url)
    return NextResponse.json({ error: "URL requise" }, { status: 400 });

  const startTime = Date.now();

  try {
    // 1. Crawl HTML + robots.txt
    const [crawl, robotsData] = await Promise.all([
      crawlUrl(url),
      checkRobotsTxt(url),
    ]);

    // 2. SEO + Schema
    const {
      checks: seoChecks,
      score: seoScore,
      schemaData,
    } = runSeoChecks(crawl, robotsData);

    // 3. Performance PageSpeed + Readability
    const [perfData, readabilityData] = await Promise.all([
      getPageSpeedScore(url),
      Promise.resolve(analyzeReadability(crawl.bodyText, keywords)),
    ]);

    // 4. Accessibilité basique (MVP sans Puppeteer)
    const accessibilityViolations = runBasicAccessibilityChecks(crawl);
    const accessibilityScore =
      accessibilityViolationsToScore(accessibilityViolations);

    // 5. Score lisibilité
    const readabilityScore = readabilityToScore(
      readabilityData.flesch_score,
      readabilityData.word_count
    );

    // 6. Score global
    const scores = {
      seo: seoScore,
      performance: perfData.score,
      accessibility: accessibilityScore,
      readability: readabilityScore,
    };
    const globalScore = computeGlobalScore(scores);

    // 7. Recommandations
    const recommendations = generateRecommendations(
      seoChecks,
      perfData.mobile,
      accessibilityViolations,
      scores
    );

    const result = {
      url,
      audited_at: new Date().toISOString(),
      score_global: globalScore,
      score_seo: seoScore,
      score_performance: perfData.score,
      score_accessibility: accessibilityScore,
      score_readability: readabilityScore,
      seo_checks: seoChecks,
      performance_data: perfData.mobile,
      accessibility_data: accessibilityViolations,
      readability_data: readabilityData,
      schema_data: schemaData,
      recommendations,
      pages_crawled: 1,
      crawl_duration_ms: Date.now() - startTime,
    };

    // 8. Sauvegarde Supabase
    await supabase.from("siteaudit_results").insert({
      client_id: clientId || null,
      ...result,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Audit échoué : ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      },
      { status: 500 }
    );
  }
}

function runBasicAccessibilityChecks(crawl: any): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = [];

  const imagesWithoutAlt = crawl.images.filter(
    (img: any) => !img.alt || img.alt.trim() === ""
  );
  if (imagesWithoutAlt.length > 0) {
    violations.push({
      id: "image-alt",
      impact: "serious",
      description: `${imagesWithoutAlt.length} image(s) sans attribut alt`,
      nodes_count: imagesWithoutAlt.length,
      wcag_criteria: "WCAG 2.1 AA 1.1.1",
    });
  }

  return violations;
}

```


## `src/app/api/siteaudit/scores/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/siteaudit/scores?url=xxx or ?clientId=xxx
 * Retourne l'historique des audits
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = request.nextUrl.searchParams.get("url");
  const clientId = request.nextUrl.searchParams.get("clientId");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

  let query = supabase
    .from("siteaudit_results")
    .select(
      "id, url, audited_at, score_global, score_seo, score_performance, score_accessibility, score_readability, pages_crawled, crawl_duration_ms, error"
    )
    .order("audited_at", { ascending: false })
    .limit(limit);

  if (clientId) {
    query = query.eq("client_id", clientId);
  } else if (url) {
    query = query.eq("url", url);
  } else {
    return NextResponse.json(
      { error: "url ou clientId requis" },
      { status: 400 }
    );
  }

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ audits: data || [] });
}

```


## `src/app/api/benchmark/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

const MAX_DOMAINS = 50;

/**
 * POST /api/benchmark — Create a benchmark and launch batch eco audits
 *
 * Body: { name, sub_category, geographic_scope, domains: string[] }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { name, sub_category, geographic_scope = "suisse", domains } = body as {
    name: string;
    sub_category: string;
    geographic_scope?: string;
    domains: string[];
  };

  // Validation
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nom du benchmark requis" }, { status: 400 });
  }

  if (!sub_category || typeof sub_category !== "string") {
    return NextResponse.json({ error: "Sous-catégorie requise" }, { status: 400 });
  }

  if (!Array.isArray(domains) || domains.length < 2) {
    return NextResponse.json({ error: "Au moins 2 domaines requis" }, { status: 400 });
  }

  if (domains.length > MAX_DOMAINS) {
    return NextResponse.json({ error: `Maximum ${MAX_DOMAINS} domaines` }, { status: 400 });
  }

  // Normalize domains
  const normalizedDomains = domains
    .map((d) => {
      if (typeof d !== "string") return null;
      const trimmed = d.trim();
      if (!trimmed) return null;

      // Extract domain from URL or raw domain
      try {
        const urlStr = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
        const parsed = new URL(urlStr);
        return {
          domain: parsed.hostname.replace(/^www\./, ""),
          url: `https://${parsed.hostname.replace(/^www\./, "")}`,
        };
      } catch {
        return null;
      }
    })
    .filter((d): d is { domain: string; url: string } => d !== null);

  // Deduplicate
  const seen = new Set<string>();
  const uniqueDomains = normalizedDomains.filter((d) => {
    if (seen.has(d.domain)) return false;
    seen.add(d.domain);
    return true;
  });

  if (uniqueDomains.length < 2) {
    return NextResponse.json({ error: "Au moins 2 domaines valides requis" }, { status: 400 });
  }

  // Create benchmark
  const { data: benchmark, error: benchmarkError } = await supabase
    .from("benchmarks")
    .insert({
      name: name.trim(),
      sub_category: sub_category.trim().toLowerCase(),
      geographic_scope,
      status: "draft",
      domains_count: uniqueDomains.length,
      completed_count: 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (benchmarkError) {
    return NextResponse.json(
      { error: "Erreur lors de la création du benchmark", detail: benchmarkError.message },
      { status: 500 }
    );
  }

  // Insert domains
  const { error: domainsError } = await supabase.from("benchmark_domains").insert(
    uniqueDomains.map((d) => ({
      benchmark_id: benchmark.id,
      domain: d.domain,
      url: d.url,
    }))
  );

  if (domainsError) {
    return NextResponse.json(
      { error: "Erreur lors de l'ajout des domaines", detail: domainsError.message },
      { status: 500 }
    );
  }

  // Trigger Inngest batch
  try {
    await inngest.send({
      name: "benchmark/batch.requested",
      data: { benchmarkId: benchmark.id },
    });
  } catch (inngestError) {
    console.error(`[benchmark:${benchmark.id}] Inngest send failed:`, inngestError);
    await supabase
      .from("benchmarks")
      .update({ status: "error" })
      .eq("id", benchmark.id);

    return NextResponse.json(
      { error: "Erreur lors du lancement du benchmark", detail: "Service d'orchestration indisponible" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    benchmark_id: benchmark.id,
    domains_count: uniqueDomains.length,
    status: "draft",
    estimated_cost: `~$${(uniqueDomains.length * 0.03).toFixed(2)}`,
    message: `Benchmark lancé : ${uniqueDomains.length} domaines en audit éco.`,
  });
}

/**
 * GET /api/benchmark — List benchmarks or get one by id
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const benchmarkId = request.nextUrl.searchParams.get("id");

  if (!benchmarkId) {
    // List all benchmarks
    const { data: benchmarks, error } = await supabase
      .from("benchmarks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 });
    }

    return NextResponse.json({ benchmarks: benchmarks || [] });
  }

  // Get specific benchmark with domains
  const [benchmarkRes, domainsRes] = await Promise.all([
    supabase.from("benchmarks").select("*").eq("id", benchmarkId).single(),
    supabase
      .from("benchmark_domains")
      .select("*")
      .eq("benchmark_id", benchmarkId)
      .order("rank_seo", { ascending: true, nullsFirst: false }),
  ]);

  if (!benchmarkRes.data) {
    return NextResponse.json({ error: "Benchmark non trouvé" }, { status: 404 });
  }

  return NextResponse.json({
    benchmark: benchmarkRes.data,
    domains: domainsRes.data || [],
  });
}

```


## `src/app/api/rankings/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SECTOR_GROUPS } from "@/lib/constants";

/**
 * GET /api/rankings?sector=tech-saas — Get sub-sector rankings
 * GET /api/rankings?sector=tech&group=1 — Get aggregated group rankings (all sub-sectors)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sector = request.nextUrl.searchParams.get("sector");
  if (!sector) {
    return NextResponse.json({ error: "Secteur requis" }, { status: 400 });
  }

  const isGroup = request.nextUrl.searchParams.get("group") === "1";

  if (isGroup) {
    // Find the group and get all its sub-sector values
    const group = SECTOR_GROUPS.find((g) => g.value === sector);
    if (!group) {
      return NextResponse.json({ rankings: [] });
    }
    const subSectorValues = group.subSectors.map((s) => s.value);

    // Query all sub-sectors of this group
    const { data: rankings } = await supabase
      .from("sector_rankings")
      .select("*")
      .in("sector", subSectorValues)
      .order("rank_seo", { ascending: true })
      .limit(50);

    return NextResponse.json({ rankings: rankings || [] });
  }

  // Standard sub-sector query
  const { data: rankings } = await supabase
    .from("sector_rankings")
    .select("*")
    .eq("sector", sector)
    .order("rank_seo", { ascending: true })
    .limit(50);

  return NextResponse.json({ rankings: rankings || [] });
}

```


## `src/app/api/scores/[clientId]/route.ts`

```typescript
// src/app/api/scores/[clientId]/route.ts
// Endpoint pour recuperer l'historique des scores d'un client

import { NextResponse } from "next/server";
import { getScoreHistory, getLLMBreakdown } from "@/lib/monitor";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const includeBreakdown = url.searchParams.get("breakdown") === "true";

    const history = await getScoreHistory(clientId, limit);

    let latestBreakdown = null;
    if (includeBreakdown && history.length > 0) {
      latestBreakdown = await getLLMBreakdown(clientId, history[0].week_start);
    }

    return NextResponse.json({
      clientId,
      history,
      latestBreakdown,
      count: history.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

```


## `src/app/api/public/audit/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

const MAX_URL_LENGTH = 2048;

// Simple in-memory rate limit (resets on cold start — good enough for MVP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max audits per email per day

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/public/audit — Launch a free eco express audit (no auth required)
 *
 * Body: { url: string, email: string, company?: string, sector?: string }
 * Auth: x-api-key header must match MCVA_PUBLIC_API_KEY env var
 *
 * Returns: { audit_id, status, message }
 */
export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.MCVA_PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { url, email, company, sector } = body as {
    url: string;
    email: string;
    company?: string;
    sector?: string;
  };

  // Validate email
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Rate limit
  if (!checkRateLimit(email.toLowerCase().trim())) {
    return NextResponse.json(
      { error: "Limite atteinte : maximum 5 audits par jour par email" },
      { status: 429 }
    );
  }

  // Validate URL
  if (!url || typeof url !== "string" || url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    const urlStr = url.startsWith("http") ? url : `https://${url}`;
    parsedUrl = new URL(urlStr);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  const normalizedUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`.replace(/\/$/, "");
  const domain = parsedUrl.hostname.replace(/^www\./, "");
  const sectorValue = typeof sector === "string" && sector.trim() ? sector.trim().slice(0, 100) : "autre";

  const supabase = createServiceClient();

  // Create audit (using service role — no user auth)
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      url: normalizedUrl,
      domain,
      sector: sectorValue,
      audit_type: "express",
      status: "pending",
      parent_audit_id: null,
      created_by: null, // public audit — no user
    })
    .select()
    .single();

  if (auditError) {
    // If created_by NOT NULL constraint fails, we need to handle it
    // Try with a system user approach
    console.error("[public-audit] Insert error:", auditError.message);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'audit", detail: auditError.message },
      { status: 500 }
    );
  }

  // Save lead
  await supabase.from("leads").insert({
    email: email.toLowerCase().trim(),
    company: typeof company === "string" ? company.trim() : null,
    domain,
    url: normalizedUrl,
    sector: sectorValue,
    audit_id: audit.id,
  }).then(({ error: leadErr }: { error: any }) => {
    if (leadErr) console.error("[public-audit] Lead insert error:", leadErr.message);
  });

  // Trigger eco express audit via Inngest
  try {
    await inngest.send({
      name: "audit/express.requested",
      data: {
        auditId: audit.id,
        url: normalizedUrl,
        domain,
        sector: sectorValue,
        quality: "eco",
      },
    });
  } catch (err) {
    console.error("[public-audit] Inngest error:", err);
    return NextResponse.json(
      { error: "Erreur lors du lancement de l'audit" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    audit_id: audit.id,
    status: "pending",
    message: "Audit express lancé. Résultats disponibles dans ~2 minutes.",
  });
}

/**
 * GET /api/public/audit?id=xxx — Get partial audit results (scores only, no item details)
 *
 * Auth: x-api-key header
 *
 * Returns: { status, scores?, dimensions?, geo? }
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.MCVA_PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }

  const auditId = request.nextUrl.searchParams.get("id");
  if (!auditId) {
    return NextResponse.json({ error: "Paramètre id requis" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch audit status
  const { data: audit } = await supabase
    .from("audits")
    .select("id, url, domain, sector, audit_type, status, created_at, completed_at")
    .eq("id", auditId)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Audit non trouvé" }, { status: 404 });
  }

  // If not completed, return status only
  if (audit.status !== "completed") {
    return NextResponse.json({
      audit_id: audit.id,
      status: audit.status,
      domain: audit.domain,
    });
  }

  // Fetch scores
  const { data: scores } = await supabase
    .from("audit_scores")
    .select("*")
    .eq("audit_id", auditId)
    .single();

  // Fetch items — but only return dimension-level aggregates, not item details
  const { data: items } = await supabase
    .from("audit_items")
    .select("dimension, score, status, framework")
    .eq("audit_id", auditId);

  // Compute dimension averages
  const dimensionScores: Record<string, { total: number; count: number; passed: number; failed: number }> = {};
  for (const item of items || []) {
    const dim = item.dimension;
    if (!dimensionScores[dim]) {
      dimensionScores[dim] = { total: 0, count: 0, passed: 0, failed: 0 };
    }
    dimensionScores[dim].total += item.score ?? 0;
    dimensionScores[dim].count += 1;
    if (item.status === "pass") dimensionScores[dim].passed += 1;
    else dimensionScores[dim].failed += 1;
  }

  const dimensions = Object.entries(dimensionScores).map(([dim, data]) => ({
    dimension: dim,
    average_score: data.count > 0 ? Math.round(data.total / data.count) : 0,
    items_count: data.count,
    passed: data.passed,
    failed: data.failed,
  }));

  // Top 3 strengths and weaknesses (by dimension, no item detail)
  const sorted = [...dimensions].sort((a, b) => b.average_score - a.average_score);
  const strengths = sorted.slice(0, 3).map((d) => d.dimension);
  const weaknesses = sorted.slice(-3).reverse().map((d) => d.dimension);

  return NextResponse.json({
    audit_id: audit.id,
    status: "completed",
    domain: audit.domain,
    url: audit.url,
    sector: audit.sector,
    completed_at: audit.completed_at,

    // Scores globaux (visibles)
    scores: {
      score_seo: scores?.score_seo ?? null,
      score_geo: scores?.score_geo ?? null,
    },

    // Dimensions (visibles — radar chart data)
    dimensions,

    // Insights partiels (teasers)
    insights: {
      strengths, // ex: ["Contextual Clarity", "Originality", ...]
      weaknesses, // ex: ["Trust Signals", "Authority", ...]
      total_items: items?.length ?? 0,
      passed_items: items?.filter((i: any) => i.status === "pass").length ?? 0,
    },

    // Ce qui est verrouillé
    locked: [
      "detail_items", // 30 critères détaillés
      "action_plan", // plan d'action
      "benchmark", // positionnement sectoriel
      "pdf_report", // rapport PDF complet
    ],
  });
}

```


## `src/app/api/debug-audit/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { createGeoProvider } from "@/lib/providers/geo/geo-provider";
import { scoreOneDimension, scoreOneCiteDimension, getCoreEeatDimensions, getCiteDimensions, aggregateScores, calculateSeoScore } from "@/lib/scoring/scorer";
import { QUALITY_CONFIG } from "@/lib/constants";
import type { QualityLevel } from "@/types/audit";
import * as cheerio from "cheerio";

export const maxDuration = 60;

/**
 * POST /api/debug-audit — Diagnostic endpoint that runs audit steps one by one
 * WITHOUT Inngest, logging timing and errors for each step.
 *
 * Body: { url: string, sector?: string, quality?: string, step?: string }
 * step: "all" | "scrape" | "seo" | "geo" | "score-C" | "score-cite-C" | ...
 *
 * Returns detailed timing and error info for each step.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { url, sector = "général", quality: rawQuality = "standard", step = "all" } = body as {
    url: string;
    sector?: string;
    quality?: string;
    step?: string;
  };

  if (!url) {
    return NextResponse.json({ error: "URL requise" }, { status: 400 });
  }

  const quality = (rawQuality || "standard") as QualityLevel;
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = (() => {
    try {
      return new URL(fullUrl).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  const results: Record<string, { ok: boolean; durationMs: number; data?: unknown; error?: string }> = {};

  async function timedStep<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
    const start = Date.now();
    try {
      const result = await fn();
      results[name] = { ok: true, durationMs: Date.now() - start, data: typeof result === "string" ? `${(result as string).length} chars` : result };
      return result;
    } catch (e: any) {
      results[name] = { ok: false, durationMs: Date.now() - start, error: e.message || String(e) };
      return null;
    }
  }

  // Step 1: Scrape HTML
  let html: string | null = null;
  if (step === "all" || step === "scrape") {
    html = await timedStep("scrape-html", async () => {
      const response = await fetch(fullUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (text.length < 100) throw new Error(`HTML too short: ${text.length} chars`);
      return text;
    });
  }

  if (step === "scrape") {
    return NextResponse.json({ results, html_length: html?.length ?? 0 });
  }

  // Step 2: SEO data
  if (step === "all" || step === "seo") {
    await timedStep("seo-data", async () => {
      const provider = await createSeoProvider();
      return provider.getDomainOverview(domain);
    });
  }

  // Step 3: GEO data
  if (step === "all" || step === "geo") {
    if (!html) {
      // Quick scrape if not done yet
      try {
        const r = await fetch(fullUrl, { headers: { "User-Agent": "MCVAAuditBot/1.0" }, signal: AbortSignal.timeout(10000) });
        html = await r.text();
      } catch { /* ignore */ }
    }
    const brandName = html ? extractBrandName(html, domain) : domain;

    await timedStep("geo-data", async () => {
      const provider = await createGeoProvider();
      return provider.getAIVisibility(brandName, sector, domain, quality);
    });
  }

  // Step 4: Score ONE CORE-EEAT dimension (to test LLM scoring)
  if (step === "all" || step.startsWith("score-") && !step.startsWith("score-cite")) {
    const targetDim = step.startsWith("score-") ? step.replace("score-", "") : "C";
    if (html) {
      await timedStep(`score-core-eeat-${targetDim}`, async () => {
        return scoreOneDimension(html!, url, targetDim, "full", quality);
      });
    } else {
      results[`score-core-eeat-${targetDim}`] = { ok: false, durationMs: 0, error: "No HTML available" };
    }
  }

  // Step 5: Score ONE CITE dimension
  if (step === "all" || step.startsWith("score-cite")) {
    const targetDim = step.startsWith("score-cite-") ? step.replace("score-cite-", "") : "C";
    if (html) {
      await timedStep(`score-cite-${targetDim}`, async () => {
        return scoreOneCiteDimension(html!, url, targetDim, "full", quality);
      });
    } else {
      results[`score-cite-${targetDim}`] = { ok: false, durationMs: 0, error: "No HTML available" };
    }
  }

  // Step 6: Env check
  results["env-check"] = {
    ok: true,
    durationMs: 0,
    data: {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY ? `set (${process.env.ANTHROPIC_API_KEY?.slice(0, 8)}...)` : "MISSING",
      INNGEST_EVENT_KEY: !!process.env.INNGEST_EVENT_KEY ? "set" : "MISSING",
      INNGEST_SIGNING_KEY: !!process.env.INNGEST_SIGNING_KEY ? "set" : "MISSING",
      SEO_PROVIDER: process.env.SEO_PROVIDER || "not set (defaults to free)",
      GEO_PROVIDER: process.env.GEO_PROVIDER || "not set (defaults to direct_ai)",
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL ? "true" : "false",
      VERCEL_ENV: process.env.VERCEL_ENV || "not set",
    },
  };

  // Summary
  const totalMs = Object.values(results).reduce((sum, r) => sum + r.durationMs, 0);
  const failedSteps = Object.entries(results).filter(([, r]) => !r.ok).map(([k]) => k);

  return NextResponse.json({
    summary: {
      totalMs,
      stepsRun: Object.keys(results).length,
      stepsFailed: failedSteps.length,
      failedSteps,
    },
    results,
  });
}

function extractBrandName(html: string, domain: string): string {
  const $ = cheerio.load(html);
  const siteName = $('meta[property="og:site_name"]').attr("content");
  if (siteName) return siteName;

  let orgName: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (orgName) return;
    try {
      const json = JSON.parse($(el).html() || "");
      if (json?.["@type"] === "Organization" && json.name) {
        orgName = json.name;
        return;
      }
      if (Array.isArray(json?.["@graph"])) {
        const org = json["@graph"].find((item: any) => item?.["@type"] === "Organization" && item.name);
        if (org) orgName = org.name;
      }
    } catch { /* ignore */ }
  });
  if (orgName) return orgName;

  const title = $("title").text();
  if (title) {
    const parts = title.split(/[|\-–—]/);
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return parts[0].trim();
  }

  return domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
}

```


## `src/app/api/debug-scoring/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { QUALITY_CONFIG } from "@/lib/constants";

export const maxDuration = 60;

/**
 * GET /api/debug-scoring — Test a single Claude scoring call
 * Visit in browser: /api/debug-scoring?url=fdmfidu.ch
 *
 * Tests the EXACT same flow as the scoring pipeline to find the error.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") || "fdmfidu.ch";
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const log: string[] = [];
  const start = Date.now();
  const elapsed = () => `${Date.now() - start}ms`;

  // Step 1: Check env
  log.push(`[${elapsed()}] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? `set (${process.env.ANTHROPIC_API_KEY.slice(0, 12)}...)` : "MISSING"}`);
  log.push(`[${elapsed()}] NODE_ENV: ${process.env.NODE_ENV}`);
  log.push(`[${elapsed()}] Scoring model: ${QUALITY_CONFIG.standard.scoringModel}`);

  // Step 2: Scrape HTML (minimal)
  let html = "";
  try {
    const res = await fetch(fullUrl, {
      headers: { "User-Agent": "MCVAAuditBot/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
    log.push(`[${elapsed()}] HTML scraped: ${html.length} chars (status ${res.status})`);
  } catch (e: any) {
    log.push(`[${elapsed()}] Scrape FAILED: ${e.message}`);
    return NextResponse.json({ ok: false, log });
  }

  // Step 3: Truncate HTML like scorer does
  const truncatedHtml = html.slice(0, QUALITY_CONFIG.standard.htmlMaxChars);
  log.push(`[${elapsed()}] Truncated HTML: ${truncatedHtml.length} chars`);

  // Step 4: Build the EXACT same prompt as scoreDimension
  const prompt = `Tu es un auditeur SEO/GEO expert. Analyse cette page web et évalue chaque critère ci-dessous.

URL: ${fullUrl}

HTML de la page (tronqué si nécessaire):
\`\`\`html
${truncatedHtml}
\`\`\`

Critères à évaluer (dimension C):
- C01: Titre de page clair et descriptif — Le title tag reflète précisément le contenu et l'intention de la page.
- C02: Structure de contenu IA-compatible — Le contenu est structuré de manière à être facilement extrait et cité par les moteurs IA.

Pour CHAQUE critère, réponds en JSON avec un tableau d'objets:
[
  {
    "code": "C01",
    "status": "pass" | "partial" | "fail",
    "score": 0-100,
    "notes": "Explication concise en français (1-2 phrases)"
  }
]

Règles de scoring:
- "pass" = 75-100 : le critère est pleinement satisfait
- "partial" = 25-74 : le critère est partiellement satisfait
- "fail" = 0-24 : le critère n'est pas satisfait
- Sois factuel et précis. Base ton évaluation uniquement sur ce qui est observable dans le HTML.

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ni après.`;

  log.push(`[${elapsed()}] Prompt built: ${prompt.length} chars (~${Math.round(prompt.length / 4)} tokens)`);

  // Step 5: Call Claude API — THE CRITICAL TEST
  try {
    log.push(`[${elapsed()}] Creating Anthropic client...`);
    const anthropic = new Anthropic();

    log.push(`[${elapsed()}] Calling claude API (model: ${QUALITY_CONFIG.standard.scoringModel})...`);
    const message = await anthropic.messages.create({
      model: QUALITY_CONFIG.standard.scoringModel,
      max_tokens: 2000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content[0];
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    log.push(`[${elapsed()}] Claude responded: ${text.length} chars`);
    log.push(`[${elapsed()}] Response preview: ${text.slice(0, 500)}`);
    log.push(`[${elapsed()}] Usage: input=${message.usage?.input_tokens}, output=${message.usage?.output_tokens}`);
    log.push(`[${elapsed()}] Stop reason: ${message.stop_reason}`);

    // Try parsing
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        log.push(`[${elapsed()}] Parsed ${parsed.length} items successfully`);
        return NextResponse.json({
          ok: true,
          items: parsed,
          log,
          response_length: text.length,
          usage: message.usage,
        });
      } else {
        log.push(`[${elapsed()}] No JSON array found in response`);
      }
    } catch (parseErr: any) {
      log.push(`[${elapsed()}] JSON parse failed: ${parseErr.message}`);
    }

    return NextResponse.json({
      ok: true,
      raw_response: text.slice(0, 1000),
      log,
    });
  } catch (e: any) {
    log.push(`[${elapsed()}] CLAUDE API FAILED: ${e.message}`);
    log.push(`[${elapsed()}] Error type: ${e.constructor?.name}`);
    log.push(`[${elapsed()}] Error status: ${e.status || "N/A"}`);
    log.push(`[${elapsed()}] Error headers: ${JSON.stringify(e.headers || {})}`);

    // Check for specific error types
    if (e.message?.includes("rate")) {
      log.push(`[${elapsed()}] >>> RATE LIMIT detected`);
    }
    if (e.message?.includes("timeout")) {
      log.push(`[${elapsed()}] >>> TIMEOUT detected`);
    }
    if (e.message?.includes("key")) {
      log.push(`[${elapsed()}] >>> API KEY issue detected`);
    }
    if (e.message?.includes("model")) {
      log.push(`[${elapsed()}] >>> MODEL issue detected`);
    }

    return NextResponse.json({
      ok: false,
      error: e.message,
      error_type: e.constructor?.name,
      log,
    });
  }
}

```

