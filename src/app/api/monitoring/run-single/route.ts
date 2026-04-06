// POST /api/monitoring/run-single
// Interroge les 4 LLMs en parallele pour UNE seule query, score et persiste.
// Chaque appel tient en <15s (4 LLMs en parallele, pas sequentiel).

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { queryAllLLMs } from "@/lib/llm-providers";
import { scoreResponse, type ResponseScore } from "@/lib/scoring-engine";

export const maxDuration = 30; // largement suffisant pour 4 LLMs en parallele

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, queryId, queryText, brandKeywords, competitors = [] } = body;

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

    // Scorer chaque reponse
    const scored: ResponseScore[] = [];
    let totalCost = 0;

    const serviceClient = createServiceClient();

    for (const llmResponse of llmResponses) {
      const rs = scoreResponse(llmResponse, brandKeywords, competitors);
      scored.push(rs);
      totalCost += llmResponse.costUsd;

      // Persister dans llmwatch_raw_results
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
        cite_credibility: rs.citeCredibility,
        cite_information: rs.citeInformation,
        cite_transparency: rs.citeTransparency,
        cite_expertise: rs.citeExpertise,
        tokens_used: rs.tokensUsed,
        latency_ms: rs.latencyMs,
        cost_usd: rs.costUsd,
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
