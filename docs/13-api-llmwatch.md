# 13 — API LLM Watch & Monitoring

**Module** : 13 — API LLM Watch & Monitoring
**Version** : 2.1 (tag `v2.1-release`)

Endpoints LLM Watch (dashboard data, monitoring triggers), Inngest webhook.

---

## `src/app/api/llmwatch/benchmark/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/benchmark?clientId=xxx
 * Retourne les scores concurrents pour comparaison
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  // Fetch competitors
  const { data: competitors } = await supabase
    .from("llmwatch_competitors")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true);

  if (!competitors?.length) {
    return NextResponse.json({ competitors: [], scores: [] });
  }

  // Fetch latest scores for each competitor
  const competitorIds = competitors.map((c) => c.id);
  const { data: scores } = await supabase
    .from("llmwatch_competitor_scores")
    .select("*")
    .in("competitor_id", competitorIds)
    .order("week_start", { ascending: false })
    .limit(competitorIds.length * 12); // 12 weeks per competitor max

  return NextResponse.json({
    competitors: competitors || [],
    scores: scores || [],
  });
}

```


## `src/app/api/llmwatch/citations/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/citations?clientId=xxx&limit=20
 * Retourne les dernières citations/résultats bruts d'un client
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
  const citedOnly = request.nextUrl.searchParams.get("cited") === "true";

  let query = supabase
    .from("llmwatch_raw_results")
    .select("*")
    .eq("client_id", clientId)
    .order("collected_at", { ascending: false })
    .limit(limit);

  if (citedOnly) {
    query = query.eq("cited", true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ citations: data || [] });
}

```


## `src/app/api/llmwatch/clients/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/clients — List all LLM Watch clients (admin)
 * GET /api/llmwatch/clients?id=xxx — Get one client with queries + competitors
 * POST /api/llmwatch/clients — Create a new client
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("id");

  if (!clientId) {
    const { data, error } = await supabase
      .from("llmwatch_clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ clients: data || [] });
  }

  // Detail with queries + competitors + latest score
  const [clientRes, queriesRes, competitorsRes, scoreRes] = await Promise.all([
    supabase.from("llmwatch_clients").select("*").eq("id", clientId).single(),
    supabase.from("llmwatch_queries").select("*").eq("client_id", clientId).order("created_at"),
    supabase.from("llmwatch_competitors").select("*").eq("client_id", clientId),
    supabase.from("llmwatch_scores").select("*").eq("client_id", clientId).order("week_start", { ascending: false }).limit(1),
  ]);

  if (!clientRes.data) return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });

  return NextResponse.json({
    client: clientRes.data,
    queries: queriesRes.data || [],
    competitors: competitorsRes.data || [],
    latestScore: scoreRes.data?.[0] || null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { name, sector, location, plan, contact_email, monitoring_frequency, queries, competitors } = body;

  if (!name || !contact_email) {
    return NextResponse.json({ error: "Nom et email requis" }, { status: 400 });
  }

  const validFrequencies = ["weekly", "monthly", "quarterly", "manual"];
  const frequency = validFrequencies.includes(monitoring_frequency) ? monitoring_frequency : "manual";

  const serviceClient = createServiceClient();

  // Create client
  const { data: client, error: clientError } = await serviceClient
    .from("llmwatch_clients")
    .insert({
      name,
      sector,
      location,
      plan: plan || "business",
      contact_email,
      monitoring_frequency: frequency,
    })
    .select()
    .single();

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });

  // Insert queries if provided
  if (queries?.length) {
    const queryRows = queries.map((q: any) => ({
      client_id: client.id,
      text_fr: q.text_fr,
      text_de: q.text_de || null,
      text_en: q.text_en || null,
    }));
    await serviceClient.from("llmwatch_queries").insert(queryRows);
  }

  // Insert competitors if provided
  if (competitors?.length) {
    const compRows = competitors.map((c: any) => ({
      client_id: client.id,
      name: c.name,
      keywords: c.keywords || [],
    }));
    await serviceClient.from("llmwatch_competitors").insert(compRows);
  }

  return NextResponse.json({ client });
}

```


## `src/app/api/llmwatch/facts/route.ts`

```typescript
// GET/POST/DELETE /api/llmwatch/facts
// CRUD for client knowledge base (verifiable facts for factual accuracy scoring)

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("llmwatch_facts")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("category");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ facts: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, factKey, factValue, category, sourceUrl } = body;
  if (!clientId || !factKey || !factValue) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("llmwatch_facts")
    .upsert(
      {
        client_id: clientId,
        fact_key: factKey,
        fact_value: factValue,
        category,
        source_url: sourceUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,fact_key" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ fact: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("llmwatch_facts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

```


## `src/app/api/llmwatch/pdf/route.ts`

```typescript
// GET /api/llmwatch/pdf?clientId=xxx&format=pdf|html
// Generates a Score GEO PDF report for a client

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { renderLlmWatchPdf, type LlmWatchPdfData } from "@/lib/pdf/templates/render-llmwatch";
import { htmlToPdf } from "@/lib/pdf/html-to-pdf";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  const format = request.nextUrl.searchParams.get("format") || "pdf";

  if (!clientId) {
    return NextResponse.json({ error: "clientId requis" }, { status: 400 });
  }

  const sc = createServiceClient();

  try {
    // Fetch all data in parallel
    const [clientRes, scoresRes, rawResultsRes, competitorsRes] = await Promise.all([
      sc.from("llmwatch_clients").select("*").eq("id", clientId).single(),
      sc.from("llmwatch_scores")
        .select("*")
        .eq("client_id", clientId)
        .order("week_start", { ascending: false })
        .limit(12),
      sc.from("llmwatch_raw_results")
        .select("*, llmwatch_queries!inner(text_fr)")
        .eq("client_id", clientId)
        .order("collected_at", { ascending: false })
        .limit(200),
      sc.from("llmwatch_competitors")
        .select("id, name")
        .eq("client_id", clientId)
        .eq("active", true),
    ]);

    if (!clientRes.data) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    const client = clientRes.data;
    const scores = scoresRes.data || [];
    const rawResults = rawResultsRes.data || [];
    const competitors = competitorsRes.data || [];

    const latestScore = scores[0];
    if (!latestScore) {
      return NextResponse.json(
        { error: "Aucun score disponible. Lancez une analyse d'abord." },
        { status: 400 }
      );
    }

    // LW-001: refuse to generate report if no responses were analyzed
    if (Number(latestScore.total_responses || 0) === 0) {
      return NextResponse.json(
        { error: "Donnees insuffisantes : 0 reponses analysees. Relancez l'analyse." },
        { status: 400 }
      );
    }

    // Parse score_by_llm
    const scoreByLlm = latestScore.score_by_llm
      ? typeof latestScore.score_by_llm === "string"
        ? JSON.parse(latestScore.score_by_llm)
        : latestScore.score_by_llm
      : {};

    const scoreByLang = latestScore.score_by_lang
      ? typeof latestScore.score_by_lang === "string"
        ? JSON.parse(latestScore.score_by_lang)
        : latestScore.score_by_lang
      : null;

    // Group raw results by query text for the latest run
    const latestRunDate = rawResults[0]?.collected_at;
    const cutoff = latestRunDate
      ? new Date(new Date(latestRunDate).getTime() - 30 * 60 * 1000).toISOString()
      : "";

    const latestResults = rawResults.filter((r: any) => r.collected_at >= cutoff);

    // LW-006 fix: deduplicate — keep only latest result per (query, llm) pair
    const queryMap = new Map<string, Map<string, any>>();
    for (const r of latestResults) {
      const qText = (r as any).llmwatch_queries?.text_fr || "Requete inconnue";
      if (!queryMap.has(qText)) queryMap.set(qText, new Map());
      const llmMap = queryMap.get(qText)!;
      // Keep the latest (first in desc order) per LLM
      if (!llmMap.has(r.llm)) {
        llmMap.set(r.llm, r);
      }
    }

    const queryResults = Array.from(queryMap.entries()).map(([queryText, llmMap]) => ({
      queryText,
      results: Array.from(llmMap.values()).map((r: any) => ({
        llm: r.llm,
        cited: r.cited || false,
        isRecommended: r.is_recommended || false,
        sentiment: r.sentiment || "neutral",
        snippet: r.snippet || "",
      })),
    }));

    // Fetch competitor scores (latest)
    const competitorScores: { name: string; score: number }[] = [];
    if (competitors.length > 0) {
      const { data: compScores } = await sc
        .from("llmwatch_competitor_scores")
        .select("competitor_id, score")
        .in("competitor_id", competitors.map((c: any) => c.id))
        .order("week_start", { ascending: false });

      const seen = new Set<string>();
      for (const cs of compScores || []) {
        if (!seen.has(cs.competitor_id)) {
          seen.add(cs.competitor_id);
          const comp = competitors.find((c: any) => c.id === cs.competitor_id);
          if (comp) {
            competitorScores.push({ name: comp.name, score: Number(cs.score) });
          }
        }
      }
    }

    // Build PDF data
    const pdfData: LlmWatchPdfData = {
      client: {
        name: client.name,
        sector: client.sector || "",
        location: client.location || "",
        domain: client.domain || "",
      },
      score: {
        scoreGeo: Number(latestScore.score),
        scorePresence: Number(latestScore.score_presence || 0),
        scoreExactitude: Number(latestScore.score_exactitude || 0),
        scoreSentiment: Number(latestScore.score_sentiment || 0),
        scoreRecommendation: Number(latestScore.score_recommendation || 0),
        citationRate: Number(latestScore.citation_rate || 0),
        totalResponses: Number(latestScore.total_responses || 0),
        weekStart: latestScore.week_start,
      },
      scoreByLlm,
      scoreByLang,
      history: scores.reverse().map((s: any) => ({
        weekStart: s.week_start,
        score: Number(s.score),
      })),
      queryResults,
      competitors: competitorScores,
      generatedAt: new Date().toISOString(),
    };

    // Render HTML
    const html = renderLlmWatchPdf(pdfData);

    // Return HTML (printable) or PDF
    if (format === "html") {
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Generate PDF
    try {
      const pdfBuffer = await htmlToPdf(html);
      const filename = `ScoreGEO_${client.name.replace(/[^a-zA-Z0-9]/g, "_")}_${latestScore.week_start}.pdf`;

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (pdfErr) {
      // Fallback: return printable HTML
      console.error("[llmwatch/pdf] Puppeteer failed, returning HTML:", pdfErr);
      const fallbackHtml = html.replace(
        "</body>",
        `<script>window.onload = function() { window.print(); }</script></body>`
      );
      return new NextResponse(fallbackHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch (error) {
    console.error("[llmwatch/pdf] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}

```


## `src/app/api/llmwatch/queries/route.ts`

```typescript
// LW-008: API for managing client queries
// GET /api/llmwatch/queries?clientId=xxx — list queries
// POST /api/llmwatch/queries — bulk import queries for a client
// DELETE /api/llmwatch/queries — deactivate a query

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const sc = createServiceClient();
  const { data, error } = await sc
    .from("llmwatch_queries")
    .select("id, text_fr, category, active, sort_order, created_at")
    .eq("client_id", clientId)
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ queries: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { clientId, queries, replaceExisting = false } = body;

  if (!clientId || !queries?.length) {
    return NextResponse.json({ error: "clientId et queries requis" }, { status: 400 });
  }

  const sc = createServiceClient();

  // If replaceExisting, deactivate all current queries
  if (replaceExisting) {
    await sc
      .from("llmwatch_queries")
      .update({ active: false })
      .eq("client_id", clientId);
  }

  // Insert new queries
  const rows = queries.map((q: any, i: number) => ({
    client_id: clientId,
    text_fr: typeof q === "string" ? q.trim() : q.text_fr?.trim(),
    category: typeof q === "string" ? null : q.category || null,
    active: true,
    sort_order: i + 1,
  })).filter((r: any) => r.text_fr);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucune requete valide" }, { status: 400 });
  }

  const { data, error } = await sc
    .from("llmwatch_queries")
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    imported: data?.length || 0,
    replaced: replaceExisting,
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { queryId } = body;

  if (!queryId) return NextResponse.json({ error: "queryId requis" }, { status: 400 });

  const sc = createServiceClient();
  const { error } = await sc
    .from("llmwatch_queries")
    .update({ active: false })
    .eq("id", queryId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

```


## `src/app/api/llmwatch/recommendations/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/recommendations?clientId=xxx
 * Retourne les recommandations AI de la dernière semaine
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("llmwatch_recommendations")
    .select("*")
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .order("priority", { ascending: true })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recommendations: data || [] });
}

```


## `src/app/api/llmwatch/reports/generate/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/llmwatch/reports/generate
 * Déclenche la génération d'un rapport PDF mensuel
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { clientId, period } = await request.json();

  if (!clientId || !period) {
    return NextResponse.json({ error: "clientId et period requis" }, { status: 400 });
  }

  // Déclenche le job Railway via webhook
  const railwayUrl = process.env.RAILWAY_JOBS_URL;
  if (railwayUrl) {
    try {
      await fetch(`${railwayUrl}/generate-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RAILWAY_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({ clientId, period }),
      });
    } catch (error) {
      console.error("[LLM Watch] Report generation trigger failed:", error);
      return NextResponse.json({ error: "Erreur lors du lancement" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: "Génération du rapport lancée" });
}

```


## `src/app/api/llmwatch/results/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/results?clientId=xxx&weekStart=2026-03-23
 * Retourne tous les résultats bruts d'une semaine avec les infos query
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const weekStart = request.nextUrl.searchParams.get("weekStart");

  let query = supabase
    .from("llmwatch_raw_results")
    .select("id, client_id, query_id, llm, lang, cited, rank, snippet, collected_at")
    .eq("client_id", clientId)
    .order("collected_at", { ascending: false });

  if (weekStart) {
    // Filter results from this week onwards (7 days)
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 7);
    query = query
      .gte("collected_at", weekStart)
      .lt("collected_at", endDate.toISOString().split("T")[0]);
  } else {
    query = query.limit(100);
  }

  const { data: results, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch queries for labels
  const { data: queries } = await supabase
    .from("llmwatch_queries")
    .select("id, text_fr, text_de, text_en")
    .eq("client_id", clientId);

  return NextResponse.json({
    results: results || [],
    queries: queries || [],
  });
}

```


## `src/app/api/llmwatch/scores/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/scores?clientId=xxx&limit=12
 * Retourne l'historique des scores hebdomadaires d'un client
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "12");

  const { data: scores, error } = await supabase
    .from("llmwatch_scores")
    .select("*")
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ scores: scores || [] });
}

```


## `src/app/api/llmwatch/webhooks/scheduler/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/llmwatch/webhooks/scheduler
 * Appelé par le cron Railway après la collecte hebdomadaire.
 * Déclenche le recalcul des scores et la détection d'alertes.
 */
export async function POST(request: NextRequest) {
  // Validate webhook secret
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.RAILWAY_WEBHOOK_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { clientId, action } = body;

  if (!clientId) {
    return NextResponse.json({ error: "clientId requis" }, { status: 400 });
  }

  // Pour l'instant, log seulement — le scoring et les alertes sont gérés côté Python
  console.log(`[LLM Watch] Webhook received: action=${action}, clientId=${clientId}`);

  return NextResponse.json({ success: true, action, clientId });
}

```


## `src/app/api/monitoring/cron/route.ts`

```typescript
// src/app/api/monitoring/cron/route.ts
// Endpoint appele par le Vercel Cron Job (1x/semaine, lundi 7h)

import { NextResponse } from "next/server";
import { runAllMonitoring } from "@/lib/monitor";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verifier le secret CRON pour eviter les appels non autorises
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  console.log("[CRON] Demarrage du monitoring hebdomadaire Score GEO");

  try {
    const results = await runAllMonitoring();

    const summary = results.map((r) => ({
      client: r.clientName,
      scoreGeo: r.score.scoreGeo,
      status: r.status,
      duration: `${Math.round(r.duration / 1000)}s`,
      cost: `$${r.totalCost.toFixed(4)}`,
    }));

    console.log("[CRON] Monitoring termine:", JSON.stringify(summary));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: summary,
    });
  } catch (error) {
    console.error("[CRON] Erreur monitoring:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

```


## `src/app/api/monitoring/finalize-score/route.ts`

```typescript
// POST /api/monitoring/finalize-score
// Calcule le Score GEO global a partir de tous les raw_results recents du client.
// Cree l'entree llmwatch_scores et met a jour last_monitored_at.

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { computeRunScore, type ResponseScore } from "@/lib/scoring-engine";
import { MODEL_SNAPSHOT_VERSION, PROVIDERS } from "@/lib/llm-providers";

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  try {
    const body = await request.json();
    const { clientId, startedAt } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId requis" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Recuperer tous les raw_results depuis le debut du run
    const since = startedAt || new Date(Date.now() - 10 * 60 * 1000).toISOString(); // fallback: 10min ago

    const { data: rawResults, error: rawError } = await serviceClient
      .from("llmwatch_raw_results")
      .select("*")
      .eq("client_id", clientId)
      .gte("collected_at", since)
      .order("collected_at", { ascending: true });

    if (rawError || !rawResults?.length) {
      return NextResponse.json(
        { error: "[finalize-v4-rpc] Aucun resultat a agreger", detail: rawError?.message, since },
        { status: 400 }
      );
    }

    // Convertir en ResponseScore pour le scoring engine
    const responseScores: ResponseScore[] = rawResults.map((r: any) => ({
      provider: r.llm,
      model: r.model_version || r.llm,
      query: "",
      response: r.response_raw || "",
      isBrandMentioned: r.cited || false,
      brandMentionConfidence: r.cited ? 0.9 : 0.1,
      isRecommended: r.is_recommended || false,
      recommendationStrength: r.is_recommended ? "implicit" as const : "none" as const,
      isFactuallyAccurate: null,
      factualClaims: [],
      sentiment: r.sentiment || "neutral",
      sentimentScore: r.sentiment_score || 0,
      citationSources: r.citation_sources || [],
      competitorMentions: r.competitor_mentions || [],
      judgeReasoning: "",
      tokensUsed: r.tokens_used || 0,
      latencyMs: r.latency_ms || 0,
      costUsd: r.cost_usd || 0,
    }));

    // Calculer le Score GEO global
    const runScore = computeRunScore(responseScores);

    // LW-003: Per-LLM breakdown — only LLMs that actually responded
    // LLMs with 0 responses are marked "unavailable", not scored as 0
    const scoreByLlm: Record<string, number | null> = {};
    const llmGroups: Record<string, ResponseScore[]> = {};
    for (const rs of responseScores) {
      if (!llmGroups[rs.provider]) llmGroups[rs.provider] = [];
      llmGroups[rs.provider].push(rs);
    }
    // Mark all monitored LLMs
    const ALL_LLMS = ["openai", "anthropic", "perplexity", "gemini"];
    for (const llm of ALL_LLMS) {
      if (llmGroups[llm] && llmGroups[llm].length > 0) {
        scoreByLlm[llm] = computeRunScore(llmGroups[llm]).scoreGeo;
      } else {
        scoreByLlm[llm] = null; // unavailable
      }
    }
    // Include any extra LLMs that responded
    for (const [llm, scores] of Object.entries(llmGroups)) {
      if (!scoreByLlm.hasOwnProperty(llm)) {
        scoreByLlm[llm] = computeRunScore(scores).scoreGeo;
      }
    }

    // LW-002: Citation rate — always a ratio [0, 1], clamped for safety
    const rawCitationRate = responseScores.length > 0
      ? responseScores.filter((r) => r.isBrandMentioned).length / responseScores.length
      : 0;
    const citationRate = Math.max(0, Math.min(1, rawCitationRate));

    // Total cost
    const totalCost = responseScores.reduce((sum, r) => sum + r.costUsd, 0);

    // Get week start (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff)).toISOString().split("T")[0];

    // Build models_used map from PROVIDERS config
    const modelsUsed = Object.fromEntries(
      PROVIDERS.map((p) => [p.name, p.model])
    );

    // Upsert score entry (same client + same week → update)
    const scoreFields = {
      score: runScore.scoreGeo,
      score_by_llm: scoreByLlm,
      score_by_lang: { fr: runScore.scoreGeo },
      citation_rate: Math.round(citationRate * 100) / 100,
      score_presence: runScore.scorePresence,
      score_exactitude: runScore.scoreExactitude,
      score_sentiment: runScore.scoreSentiment,
      score_recommendation: runScore.scoreRecommendation,
      total_responses: responseScores.length,
      total_cost_usd: Math.round(totalCost * 10000) / 10000,
      duration_ms: startedAt ? Date.now() - new Date(startedAt).getTime() : 0,
      model_snapshot_version: MODEL_SNAPSHOT_VERSION,
      models_used: modelsUsed,
    };

    // Use PostgreSQL function for atomic upsert (ON CONFLICT DO UPDATE)
    const { data: scoreEntry, error: scoreError } = await serviceClient
      .rpc("upsert_weekly_score", {
        p_client_id: clientId,
        p_week_start: weekStart,
        p_score: scoreFields.score,
        p_score_by_llm: scoreFields.score_by_llm,
        p_score_by_lang: scoreFields.score_by_lang,
        p_citation_rate: scoreFields.citation_rate,
        p_score_presence: scoreFields.score_presence,
        p_score_exactitude: scoreFields.score_exactitude,
        p_score_sentiment: scoreFields.score_sentiment,
        p_score_recommendation: scoreFields.score_recommendation,
        p_total_responses: scoreFields.total_responses,
        p_total_cost_usd: scoreFields.total_cost_usd,
        p_duration_ms: scoreFields.duration_ms,
        p_model_snapshot_version: scoreFields.model_snapshot_version,
        p_models_used: scoreFields.models_used,
      });

    if (scoreError) {
      return NextResponse.json(
        { error: "[finalize-v4-rpc] Score error", detail: scoreError.message },
        { status: 500 }
      );
    }

    // Update last_monitored_at
    await serviceClient
      .from("llmwatch_clients")
      .update({ last_monitored_at: new Date().toISOString() })
      .eq("id", clientId);

    return NextResponse.json({
      success: true,
      scoreId: scoreEntry.id,
      scoreGeo: runScore.scoreGeo,
      breakdown: {
        presence: runScore.scorePresence,
        exactitude: runScore.scoreExactitude,
        sentiment: runScore.scoreSentiment,
        recommendation: runScore.scoreRecommendation,
      },
      scoreByLlm,
      citationRate: Math.round(citationRate * 100),
      totalResponses: responseScores.length,
      totalCost: `$${totalCost.toFixed(4)}`,
    });
  } catch (error) {
    console.error("[finalize-score] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

```


## `src/app/api/monitoring/queries/route.ts`

```typescript
// GET /api/monitoring/queries?clientId=xxx
// Retourne la liste des queries actives d'un client + infos client pour le scoring

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Auth check with user client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();

  // Fetch client info, active queries, competitors, and facts in parallel
  const [clientRes, queriesRes, competitorsRes, factsRes] = await Promise.all([
    serviceClient
      .from("llmwatch_clients")
      .select("id, name, domain, brand_keywords")
      .eq("id", clientId)
      .single(),
    serviceClient
      .from("llmwatch_queries")
      .select("id, text_fr, category")
      .eq("client_id", clientId)
      .eq("active", true)
      .order("sort_order"),
    serviceClient
      .from("llmwatch_competitors")
      .select("name")
      .eq("client_id", clientId)
      .eq("active", true),
    serviceClient
      .from("llmwatch_facts")
      .select("fact_key, fact_value")
      .eq("client_id", clientId)
      .eq("active", true),
  ]);

  if (!clientRes.data) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const competitors = (competitorsRes.data || []).map((c: any) => c.name);
  const knownFacts: Record<string, string> = {};
  for (const f of factsRes.data || []) {
    knownFacts[f.fact_key] = f.fact_value;
  }

  return NextResponse.json({
    client: {
      id: clientRes.data.id,
      name: clientRes.data.name,
      domain: clientRes.data.domain,
      brand_keywords: clientRes.data.brand_keywords,
    },
    competitors,
    knownFacts,
    queries: (queriesRes.data || []).map((q: any) => ({
      id: q.id,
      text_fr: q.text_fr,
      category: q.category,
    })),
    total: queriesRes.data?.length || 0,
  });
}

```


## `src/app/api/monitoring/run-single/route.ts`

```typescript
// POST /api/monitoring/run-single
// Interroge les 4 LLMs en parallele pour UNE seule query, score et persiste.
// Chaque appel tient en <15s (4 LLMs en parallele, pas sequentiel).

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { queryAllLLMs } from "@/lib/llm-providers";
import { scoreResponse, type ResponseScore } from "@/lib/scoring-engine";

export const maxDuration = 60; // 4 LLMs parallel + 3-4 judge calls parallel

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId, queryId, queryText,
      brandName, brandKeywords, competitors = [],
      knownFacts, language = "fr",
    } = body;

    if (!clientId || !queryId || !queryText || !brandKeywords) {
      return NextResponse.json(
        { error: "clientId, queryId, queryText et brandKeywords requis" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Interroger les 4 LLMs en parallele
    const llmResponses = await queryAllLLMs(queryText);

    if (llmResponses.length === 0) {
      return NextResponse.json(
        { error: "Aucun LLM n'a repondu" },
        { status: 502 }
      );
    }

    // Score all LLM responses in parallel (each calls LLM-as-judge independently)
    const serviceClient = createServiceClient();
    const resolvedBrandName = brandName || brandKeywords[0] || "";
    const resolvedLang = language as "fr" | "de" | "en";

    const results = await Promise.allSettled(
      llmResponses.map((llmResponse) =>
        scoreResponse(llmResponse, resolvedBrandName, brandKeywords, competitors, knownFacts, resolvedLang)
      )
    );

    const scored: ResponseScore[] = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        scored.push(r.value);
      } else {
        const provider = llmResponses[i].provider;
        console.error(`[run-single] scoreResponse failed for ${provider}:`, r.reason);
      }
    }

    let totalCost = 0;

    // Persist all scored results to DB (sequential inserts are fine — fast)
    for (const rs of scored) {
      totalCost += rs.costUsd + 0.012; // judge cost

      await serviceClient.from("llmwatch_raw_results").insert({
        client_id: clientId,
        query_id: queryId,
        llm: rs.provider,
        lang: "fr",
        response_raw: rs.response,
        cited: rs.isBrandMentioned,
        snippet: rs.response.slice(0, 500),
        collected_at: new Date().toISOString(),
        is_recommended: rs.isRecommended,
        sentiment: rs.sentiment,
        sentiment_score: rs.sentimentScore,
        competitor_mentions: rs.competitorMentions,
        citation_sources: rs.citationSources,
        tokens_used: rs.tokensUsed,
        latency_ms: rs.latencyMs,
        cost_usd: rs.costUsd,
        model_version: rs.model,
      });
    }

    const duration = Date.now() - startTime;
    const cited = scored.filter((r) => r.isBrandMentioned).length;

    return NextResponse.json({
      success: true,
      queryId,
      llmsResponded: scored.map((s) => s.provider),
      llmsCount: scored.length,
      cited,
      totalCost: Math.round(totalCost * 10000) / 10000,
      duration: `${Math.round(duration / 1000)}s`,
    });
  } catch (error) {
    console.error("[run-single] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

```


## `src/app/api/monitoring/run/route.ts`

```typescript
// src/app/api/monitoring/run/route.ts
// Endpoint pour declencher un monitoring manuellement

import { NextResponse } from "next/server";
import { runMonitoring } from "@/lib/monitor";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId requis" },
        { status: 400 }
      );
    }

    const result = await runMonitoring(clientId);

    return NextResponse.json({
      success: result.status === "completed",
      scoreId: result.scoreId,
      scoreGeo: result.score.scoreGeo,
      breakdown: {
        presence: result.score.scorePresence,
        exactitude: result.score.scoreExactitude,
        sentiment: result.score.scoreSentiment,
        recommendation: result.score.scoreRecommendation,
      },
      totalResponses: result.score.totalResponses,
      duration: `${Math.round(result.duration / 1000)}s`,
      cost: `$${result.totalCost.toFixed(4)}`,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}

```


## `src/app/api/inngest/route.ts`

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

// Allow longer execution per step — needed for LLM calls.
// Vercel Hobby: 10s (default), Pro: up to 300s.
// Each Inngest step is a separate invocation, so 60s covers any single LLM call.
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});

```

