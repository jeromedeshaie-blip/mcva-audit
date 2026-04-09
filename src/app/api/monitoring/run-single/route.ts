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
