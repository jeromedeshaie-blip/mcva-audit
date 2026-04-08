// src/lib/monitor.ts
// Orchestrateur GEO monitoring — adapté aux tables Supabase existantes
// Tables: llmwatch_clients, llmwatch_queries, llmwatch_scores, llmwatch_raw_results

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { queryAllLLMs, MODEL_SNAPSHOT_VERSION, PROVIDERS, type LLMResponse } from "./llm-providers";
import {
  scoreResponse,
  computeRunScore,
  type ResponseScore,
  type RunScore,
} from "./scoring-engine";
import { LLMWATCH_RUN_CONFIG, type QualityLevel } from "./constants";

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
  text_de: string | null;
  text_en: string | null;
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
  clientId: string,
  level: QualityLevel = "standard"
): Promise<MonitoringResult> {
  const supabase = getSupabase();
  const startTime = Date.now();
  const runConfig = LLMWATCH_RUN_CONFIG[level];

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
    .select("id, client_id, text_fr, text_de, text_en, category")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("sort_order")
    .limit(runConfig.maxQueries);

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
    // 4. Setup
    let totalCost = 0;

    // Fetch competitors from database
    const competitors = (
      await supabase
        .from("llmwatch_competitors")
        .select("name")
        .eq("client_id", clientId)
        .eq("active", true)
    ).data?.map((c) => c.name) || [];

    // Fetch known facts for factual accuracy (if llmwatch_facts table exists)
    const knownFacts = await getClientFacts(clientId, supabase);

    const brandAliases = client.brand_keywords || [client.name, client.domain];

    // 5. Run REPETITIONS times (1 for eco/standard, 3 for premium/ultra)
    const allRunScores: RunScore[] = [];

    const LANGUAGES = ["fr", "de", "en"] as const;

    for (let rep = 0; rep < runConfig.repetitions; rep++) {
      const repResponseScores: ResponseScore[] = [];

      for (const query of queries as Query[]) {
        for (const lang of LANGUAGES) {
          const queryText = query[`text_${lang}` as keyof Query] as string | null;
          if (!queryText) continue; // skip languages without text

          // Interroger les 4 LLMs en parallele
          const llmResponses = await queryAllLLMs(queryText);

          // Scorer chaque reponse (async — calls LLM-as-judge)
          for (const llmResponse of llmResponses) {
            const scored = await scoreResponse(
              llmResponse,
              client.name,
              brandAliases,
              competitors,
              knownFacts,
              lang
            );

            repResponseScores.push(scored);
            totalCost += llmResponse.costUsd + 0.012; // judge cost estimate

            // Persister la reponse dans llmwatch_raw_results
            await supabase.from("llmwatch_raw_results").insert({
              client_id: clientId,
              query_id: query.id,
              llm: scored.provider,
              lang,
              response_raw: scored.response,
              cited: scored.isBrandMentioned,
              snippet: scored.response.slice(0, 500),
              collected_at: new Date().toISOString(),
              is_recommended: scored.isRecommended,
              sentiment: scored.sentiment,
              sentiment_score: scored.sentimentScore,
              competitor_mentions: scored.competitorMentions,
              citation_sources: scored.citationSources,
              tokens_used: scored.tokensUsed,
              latency_ms: scored.latencyMs,
              cost_usd: scored.costUsd,
              model_version: scored.model,
            });
          }

          // Pause entre les queries pour respecter les rate limits
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      allRunScores.push(computeRunScore(repResponseScores));
    }

    // 6. Average across repetitions
    const meanScore = allRunScores.reduce((s, r) => s + r.scoreGeo, 0) / allRunScores.length;
    const variance = allRunScores.length > 1
      ? allRunScores.reduce((s, r) => s + Math.pow(r.scoreGeo - meanScore, 2), 0) / allRunScores.length
      : 0;
    const stddev = Math.sqrt(variance);

    // Use the LAST run as the canonical responseScores for per-LLM breakdown
    const finalRunScore = allRunScores[allRunScores.length - 1];
    const allResponseScores = finalRunScore.responseScores;

    // Override scoreGeo with the mean across repetitions
    finalRunScore.scoreGeo = Math.round(meanScore * 100) / 100;

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

    // Compute per-language breakdown from raw_results
    // Query recently stored results to get per-lang scores
    const scoreByLang: Record<string, number> = { fr: finalRunScore.scoreGeo };
    const { data: langResults } = await supabase
      .from("llmwatch_raw_results")
      .select("lang, cited, is_recommended, sentiment_score")
      .eq("client_id", clientId)
      .gte("collected_at", new Date(startTime).toISOString());
    if (langResults && langResults.length > 0) {
      const langGroups: Record<string, typeof langResults> = {};
      for (const r of langResults) {
        const l = r.lang || "fr";
        if (!langGroups[l]) langGroups[l] = [];
        langGroups[l].push(r);
      }
      for (const [lang, results] of Object.entries(langGroups)) {
        if (results.length === 0) continue;
        const mentionRate = results.filter((r) => r.cited).length / results.length;
        const recoRate = results.filter((r) => r.is_recommended).length / results.length;
        const avgSent = results.reduce((s, r) => s + (r.sentiment_score || 0), 0) / results.length;
        // Simplified per-lang score: same 4-component formula
        const langScore = Math.round(
          (mentionRate * 25 + 12.5 + ((avgSent + 1) / 2) * 25 + recoRate * 25) * 100
        ) / 100;
        scoreByLang[lang] = langScore;
      }
    }

    // Citation rate (from last run)
    const citationRate = allResponseScores.length > 0
      ? allResponseScores.filter((r) => r.isBrandMentioned).length / allResponseScores.length
      : 0;

    // 7. Mettre a jour le score entry
    const modelsUsed = Object.fromEntries(
      PROVIDERS.map((p) => [p.name, p.model])
    );

    await supabase
      .from("llmwatch_scores")
      .update({
        score: finalRunScore.scoreGeo,
        score_by_llm: scoreByLlm,
        score_by_lang: scoreByLang,
        citation_rate: Math.round(citationRate * 100) / 100,
        score_presence: finalRunScore.scorePresence,
        score_exactitude: finalRunScore.scoreExactitude,
        score_sentiment: finalRunScore.scoreSentiment,
        score_recommendation: finalRunScore.scoreRecommendation,
        total_responses: allResponseScores.length * runConfig.repetitions,
        total_cost_usd: Math.round(totalCost * 10000) / 10000,
        duration_ms: Date.now() - startTime,
        model_snapshot_version: MODEL_SNAPSHOT_VERSION,
        models_used: modelsUsed,
        run_level: level,
        run_count: runConfig.repetitions,
        score_stddev: runConfig.repetitions > 1 ? Math.round(stddev * 100) / 100 : null,
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
      score: finalRunScore,
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

/**
 * Fetch known facts for a client from llmwatch_facts table.
 * Returns undefined if no facts exist (gracefully handles missing table).
 */
async function getClientFacts(
  clientId: string,
  supabase: SupabaseClient
): Promise<Record<string, string> | undefined> {
  try {
    const { data } = await supabase
      .from("llmwatch_facts")
      .select("fact_key, fact_value")
      .eq("client_id", clientId)
      .eq("active", true);
    if (!data || data.length === 0) return undefined;
    return Object.fromEntries(data.map((f) => [f.fact_key, f.fact_value]));
  } catch {
    // Table may not exist yet — graceful fallback
    return undefined;
  }
}

/** Get Monday of current week as YYYY-MM-DD */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}
