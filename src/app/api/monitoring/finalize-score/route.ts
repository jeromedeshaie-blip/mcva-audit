// POST /api/monitoring/finalize-score
// Calcule le Score GEO global a partir de tous les raw_results recents du client.
// Cree l'entree llmwatch_scores et met a jour last_monitored_at.

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { computeRunScore, type ResponseScore } from "@/lib/scoring-engine";

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
        { error: "Aucun resultat a agreger", detail: rawError?.message },
        { status: 400 }
      );
    }

    // Convertir en ResponseScore pour le scoring engine
    const responseScores: ResponseScore[] = rawResults.map((r: any) => ({
      provider: r.llm,
      model: r.llm,
      query: "",
      response: r.response_raw || "",
      isBrandMentioned: r.cited || false,
      isRecommended: r.is_recommended || false,
      isFactuallyAccurate: null,
      sentiment: r.sentiment || "neutral",
      sentimentScore: r.sentiment_score || 0,
      citationSources: r.citation_sources || [],
      competitorMentions: r.competitor_mentions || [],
      citeCredibility: r.cite_credibility || 0,
      citeInformation: r.cite_information || 0,
      citeTransparency: r.cite_transparency || 0,
      citeExpertise: r.cite_expertise || 0,
      tokensUsed: r.tokens_used || 0,
      latencyMs: r.latency_ms || 0,
      costUsd: r.cost_usd || 0,
    }));

    // Calculer le Score GEO global
    const runScore = computeRunScore(responseScores);

    // Per-LLM breakdown
    const scoreByLlm: Record<string, number> = {};
    const llmGroups: Record<string, ResponseScore[]> = {};
    for (const rs of responseScores) {
      if (!llmGroups[rs.provider]) llmGroups[rs.provider] = [];
      llmGroups[rs.provider].push(rs);
    }
    for (const [llm, scores] of Object.entries(llmGroups)) {
      scoreByLlm[llm] = computeRunScore(scores).scoreGeo;
    }

    // Citation rate
    const citationRate = responseScores.length > 0
      ? responseScores.filter((r) => r.isBrandMentioned).length / responseScores.length
      : 0;

    // Total cost
    const totalCost = responseScores.reduce((sum, r) => sum + r.costUsd, 0);

    // Get week start (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff)).toISOString().split("T")[0];

    // Upsert score entry (same client + same week → update)
    const scorePayload = {
      client_id: clientId,
      week_start: weekStart,
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
    };

    const { data: scoreEntry, error: scoreError } = await serviceClient
      .from("llmwatch_scores")
      .upsert(scorePayload, { onConflict: "client_id,week_start" })
      .select()
      .single();

    if (scoreError) {
      return NextResponse.json(
        { error: "Impossible de creer le score", detail: scoreError.message },
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
