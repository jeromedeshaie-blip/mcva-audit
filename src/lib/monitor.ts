// src/lib/monitor.ts
// Orchestrateur GEO monitoring — adapté aux tables Supabase existantes
// Tables: llmwatch_clients, llmwatch_queries, llmwatch_scores, llmwatch_raw_results

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { queryAllLLMs, type LLMResponse } from "./llm-providers";
import {
  scoreResponse,
  computeRunScore,
  type ResponseScore,
  type RunScore,
} from "./scoring-engine";

// ============================================================
// SUPABASE CLIENT (server-side, service_role)
// ============================================================

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// TYPES (mapped to existing Supabase tables)
// ============================================================

interface Client {
  id: string;
  name: string;
  domain: string;
  brand_keywords: string[];
}

interface Query {
  id: string;
  client_id: string;
  text_fr: string;
  category: string;
}

interface MonitoringResult {
  scoreId: string;
  clientId: string;
  clientName: string;
  score: RunScore;
  status: "completed" | "failed";
  error?: string;
  duration: number;
  totalCost: number;
}

// ============================================================
// MONITORING D'UN CLIENT
// ============================================================

/**
 * Execute un cycle de monitoring complet pour un client.
 * 1. Recupere les queries actives (llmwatch_queries)
 * 2. Cree un score entry (llmwatch_scores)
 * 3. Interroge les 4 LLMs pour chaque query
 * 4. Score chaque reponse
 * 5. Calcule le Score GEO global
 * 6. Persiste tout en base
 */
export async function runMonitoring(
  clientId: string
): Promise<MonitoringResult> {
  const supabase = getSupabase();
  const startTime = Date.now();

  // 1. Recuperer le client
  const { data: client, error: clientError } = await supabase
    .from("llmwatch_clients")
    .select("id, name, domain, brand_keywords")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    throw new Error(`Client introuvable: ${clientId}`);
  }

  // 2. Recuperer les queries actives
  const { data: queries, error: queriesError } = await supabase
    .from("llmwatch_queries")
    .select("id, client_id, text_fr, category")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("sort_order");

  if (queriesError || !queries?.length) {
    throw new Error(`Aucune query active pour le client ${client.name}`);
  }

  // 3. Creer l'entree score (llmwatch_scores) pour cette semaine
  const weekStart = getWeekStart();
  const { data: scoreEntry, error: scoreError } = await supabase
    .from("llmwatch_scores")
    .insert({
      client_id: clientId,
      week_start: weekStart,
      score: 0, // sera mis a jour
      citation_rate: 0,
      total_responses: queries.length * 4,
    })
    .select()
    .single();

  if (scoreError || !scoreEntry) {
    throw new Error(`Impossible de creer le score: ${scoreError?.message}`);
  }

  const scoreId = scoreEntry.id;

  try {
    // 4. Interroger les LLMs pour chaque query
    const allResponseScores: ResponseScore[] = [];
    let totalCost = 0;

    // Fetch competitors from client's sector peers (if available)
    const competitors: string[] = [];

    for (const query of queries as Query[]) {
      // Interroger les 4 LLMs en parallele
      const llmResponses = await queryAllLLMs(query.text_fr);

      // Scorer chaque reponse
      for (const llmResponse of llmResponses) {
        const scored = scoreResponse(
          llmResponse,
          client.brand_keywords || [client.name, client.domain],
          competitors
        );

        allResponseScores.push(scored);
        totalCost += llmResponse.costUsd;

        // Persister la reponse dans llmwatch_raw_results
        await supabase.from("llmwatch_raw_results").insert({
          client_id: clientId,
          query_id: query.id,
          llm: scored.provider,
          lang: "fr",
          response_raw: scored.response,
          cited: scored.isBrandMentioned,
          snippet: scored.response.slice(0, 500),
          collected_at: new Date().toISOString(),
          is_recommended: scored.isRecommended,
          sentiment: scored.sentiment,
          sentiment_score: scored.sentimentScore,
          competitor_mentions: scored.competitorMentions,
          citation_sources: scored.citationSources,
          cite_credibility: scored.citeCredibility,
          cite_information: scored.citeInformation,
          cite_transparency: scored.citeTransparency,
          cite_expertise: scored.citeExpertise,
          tokens_used: scored.tokensUsed,
          latency_ms: scored.latencyMs,
          cost_usd: scored.costUsd,
        });
      }

      // Pause entre les queries pour respecter les rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 5. Calculer le Score GEO global
    const runScore = computeRunScore(allResponseScores);

    // Compute per-LLM breakdown
    const scoreByLlm: Record<string, number> = {};
    const llmGroups: Record<string, ResponseScore[]> = {};
    for (const rs of allResponseScores) {
      if (!llmGroups[rs.provider]) llmGroups[rs.provider] = [];
      llmGroups[rs.provider].push(rs);
    }
    for (const [llm, scores] of Object.entries(llmGroups)) {
      scoreByLlm[llm] = computeRunScore(scores).scoreGeo;
    }

    // Citation rate
    const citationRate = allResponseScores.length > 0
      ? allResponseScores.filter((r) => r.isBrandMentioned).length / allResponseScores.length
      : 0;

    // 6. Mettre a jour le score entry
    await supabase
      .from("llmwatch_scores")
      .update({
        score: runScore.scoreGeo,
        score_by_llm: scoreByLlm,
        score_by_lang: { fr: runScore.scoreGeo }, // single lang for now
        citation_rate: Math.round(citationRate * 100) / 100,
        score_presence: runScore.scorePresence,
        score_exactitude: runScore.scoreExactitude,
        score_sentiment: runScore.scoreSentiment,
        score_recommendation: runScore.scoreRecommendation,
        total_responses: allResponseScores.length,
        total_cost_usd: Math.round(totalCost * 10000) / 10000,
        duration_ms: Date.now() - startTime,
      })
      .eq("id", scoreId);

    // Update last_monitored_at on successful completion
    await supabase
      .from("llmwatch_clients")
      .update({ last_monitored_at: new Date().toISOString() })
      .eq("id", clientId);

    return {
      scoreId,
      clientId,
      clientName: client.name,
      score: runScore,
      status: "completed",
      duration: Date.now() - startTime,
      totalCost,
    };
  } catch (error) {
    // Marquer le score en erreur (supprimer l'entree incomplete)
    await supabase.from("llmwatch_scores").delete().eq("id", scoreId);

    return {
      scoreId,
      clientId,
      clientName: client.name,
      score: computeRunScore([]),
      status: "failed",
      error: error instanceof Error ? error.message : "Erreur inconnue",
      duration: Date.now() - startTime,
      totalCost: 0,
    };
  }
}

// ============================================================
// MONITORING DE TOUS LES CLIENTS ACTIFS
// ============================================================

export async function runAllMonitoring(): Promise<MonitoringResult[]> {
  const supabase = getSupabase();

  const { data: clients, error } = await supabase
    .from("llmwatch_clients")
    .select("id, name, monitoring_frequency, last_monitored_at")
    .eq("active", true);

  if (error || !clients?.length) {
    console.log("Aucun client actif a monitorer");
    return [];
  }

  const results: MonitoringResult[] = [];
  const now = new Date();

  for (const client of clients) {
    // Skip manual clients — they are only triggered via the UI
    if (client.monitoring_frequency === "manual") {
      console.log(`[GEO Monitor] ${client.name}: frequence manuelle, skip`);
      continue;
    }

    // Check if enough time has passed since last monitoring
    if (client.last_monitored_at && !isDueForMonitoring(client.monitoring_frequency, client.last_monitored_at, now)) {
      console.log(`[GEO Monitor] ${client.name}: pas encore du (freq: ${client.monitoring_frequency})`);
      continue;
    }

    console.log(`[GEO Monitor] Debut monitoring: ${client.name}`);
    try {
      const result = await runMonitoring(client.id);
      results.push(result);

      // Update last_monitored_at
      if (result.status === "completed") {
        await supabase
          .from("llmwatch_clients")
          .update({ last_monitored_at: now.toISOString() })
          .eq("id", client.id);
      }

      console.log(
        `[GEO Monitor] ${client.name}: Score GEO = ${result.score.scoreGeo}/100 (${result.status})`
      );
    } catch (err) {
      console.error(`[GEO Monitor] Erreur pour ${client.name}:`, err);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return results;
}

/** Check if a client is due for monitoring based on their frequency setting */
function isDueForMonitoring(
  frequency: string,
  lastMonitoredAt: string,
  now: Date
): boolean {
  const last = new Date(lastMonitoredAt);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (frequency) {
    case "weekly":
      return diffDays >= 6; // 6 days to allow some flexibility
    case "monthly":
      return diffDays >= 28;
    case "quarterly":
      return diffDays >= 85;
    default:
      return false;
  }
}

// ============================================================
// RECUPERATION DES DONNEES
// ============================================================

export async function getScoreHistory(clientId: string, limit: number = 20) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("llmwatch_scores")
    .select(
      "id, score, score_presence, score_exactitude, score_sentiment, score_recommendation, week_start, created_at, score_by_llm, score_by_lang, citation_rate, total_responses, total_cost_usd, duration_ms"
    )
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getLLMBreakdown(clientId: string, weekStart?: string) {
  const supabase = getSupabase();

  let query = supabase
    .from("llmwatch_raw_results")
    .select(
      "llm, cited, is_recommended, sentiment, sentiment_score, competitor_mentions"
    )
    .eq("client_id", clientId);

  if (weekStart) {
    // Filter to a specific week
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    query = query.gte("collected_at", start.toISOString()).lt("collected_at", end.toISOString());
  } else {
    // Latest 50 results
    query = query.order("collected_at", { ascending: false }).limit(50);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Agreger par LLM
  const breakdown: Record<
    string,
    {
      total: number;
      mentions: number;
      recommendations: number;
      avgSentiment: number;
      competitors: Record<string, number>;
    }
  > = {};

  for (const resp of data || []) {
    const p = resp.llm;
    if (!breakdown[p]) {
      breakdown[p] = {
        total: 0,
        mentions: 0,
        recommendations: 0,
        avgSentiment: 0,
        competitors: {},
      };
    }
    breakdown[p].total++;
    if (resp.cited) breakdown[p].mentions++;
    if (resp.is_recommended) breakdown[p].recommendations++;
    breakdown[p].avgSentiment += resp.sentiment_score || 0;

    for (const comp of resp.competitor_mentions || []) {
      breakdown[p].competitors[comp] =
        (breakdown[p].competitors[comp] || 0) + 1;
    }
  }

  for (const p of Object.keys(breakdown)) {
    if (breakdown[p].total > 0) {
      breakdown[p].avgSentiment /= breakdown[p].total;
    }
  }

  return breakdown;
}

// ============================================================
// HELPERS
// ============================================================

/** Get Monday of current week as YYYY-MM-DD */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}
