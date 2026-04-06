"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/llmwatch/ScoreCard";
import { ScoreChart } from "@/components/llmwatch/ScoreChart";
import { LlmBreakdown } from "@/components/llmwatch/LlmBreakdown";
import { LanguageBreakdown } from "@/components/llmwatch/LanguageBreakdown";
import { BenchmarkTable } from "@/components/llmwatch/BenchmarkTable";
import { CompetitiveGap } from "@/components/llmwatch/CompetitiveGap";
import { CitationBlock } from "@/components/llmwatch/CitationBlock";
import { AlertBadge } from "@/components/llmwatch/AlertBadge";
import { RecommendationCard } from "@/components/llmwatch/RecommendationCard";
import { QueryResultsTable } from "@/components/llmwatch/QueryResultsTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  LlmWatchScore,
  LlmWatchCitation,
  LlmWatchAlert,
  LlmWatchRecommendation,
  MonitoringFrequency,
} from "@/lib/llmwatch/types";

export default function LlmWatchDashboard({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const [client, setClient] = useState<any>(null);
  const [scores, setScores] = useState<LlmWatchScore[]>([]);
  const [citations, setCitations] = useState<LlmWatchCitation[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [competitorScores, setCompetitorScores] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<LlmWatchAlert[]>([]);
  const [recommendations, setRecommendations] = useState<LlmWatchRecommendation[]>([]);
  const [detailedResults, setDetailedResults] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<{
    current: number;
    total: number;
    currentQuery: string;
    errors: string[];
  } | null>(null);
  const [runMessage, setRunMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleRunMonitoring = async () => {
    setRunning(true);
    setRunMessage(null);
    setRunProgress(null);

    const startedAt = new Date().toISOString();

    try {
      // Step 1: Fetch queries list
      const queriesRes = await fetch(`/api/monitoring/queries?clientId=${clientId}`);
      if (!queriesRes.ok) {
        throw new Error("Impossible de charger les requetes");
      }
      const { queries: queryList, client: clientInfo } = await queriesRes.json();

      if (!queryList?.length) {
        setRunMessage({ text: "Aucune requete active pour ce client", success: false });
        setRunning(false);
        return;
      }

      const brandKeywords = clientInfo.brand_keywords || [clientInfo.name, clientInfo.domain];
      const errors: string[] = [];

      // Step 2: Run each query sequentially (each call ~5-10s, 4 LLMs in parallel)
      for (let i = 0; i < queryList.length; i++) {
        const q = queryList[i];
        setRunProgress({
          current: i + 1,
          total: queryList.length,
          currentQuery: q.text_fr.length > 60 ? q.text_fr.slice(0, 57) + "..." : q.text_fr,
          errors,
        });

        try {
          const res = await fetch("/api/monitoring/run-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId,
              queryId: q.id,
              queryText: q.text_fr,
              brandKeywords,
            }),
            signal: AbortSignal.timeout(45000), // 45s safety timeout
          });

          const data = await res.json();
          if (!data.success) {
            errors.push(`Q${i + 1}: ${data.error}`);
          }
        } catch (err) {
          errors.push(`Q${i + 1}: ${err instanceof Error ? err.message : "Erreur"}`);
        }

        // Small delay between queries to respect rate limits
        if (i < queryList.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Step 3: Finalize — aggregate scores
      setRunProgress((prev) => prev ? { ...prev, currentQuery: "Calcul du Score GEO..." } : null);

      const finalRes = await fetch("/api/monitoring/finalize-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, startedAt }),
      });

      const finalData = await finalRes.json();

      if (finalData.success) {
        const errText = errors.length > 0 ? ` (${errors.length} erreur${errors.length > 1 ? "s" : ""})` : "";
        setRunMessage({
          text: `Score GEO : ${finalData.scoreGeo}/100 — Presence ${finalData.breakdown.presence} | Exactitude ${finalData.breakdown.exactitude} | Sentiment ${finalData.breakdown.sentiment} | Recommandation ${finalData.breakdown.recommendation}${errText}`,
          success: true,
        });
        fetchData(); // refresh dashboard
      } else {
        setRunMessage({ text: finalData.error || "Erreur de finalisation", success: false });
      }
    } catch (err) {
      setRunMessage({ text: err instanceof Error ? err.message : "Erreur reseau", success: false });
    } finally {
      setRunning(false);
      setRunProgress(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [clientRes, scoresRes, citationsRes, benchmarkRes, recoRes, resultsRes] =
        await Promise.all([
          fetch(`/api/llmwatch/clients?id=${clientId}`),
          fetch(`/api/llmwatch/scores?clientId=${clientId}&limit=12`),
          fetch(`/api/llmwatch/citations?clientId=${clientId}&cited=true&limit=10`),
          fetch(`/api/llmwatch/benchmark?clientId=${clientId}`),
          fetch(`/api/llmwatch/recommendations?clientId=${clientId}`),
          fetch(`/api/llmwatch/results?clientId=${clientId}`),
        ]);

      if (clientRes.ok) {
        const data = await clientRes.json();
        setClient(data.client);
      }
      if (scoresRes.ok) {
        const data = await scoresRes.json();
        setScores(data.scores || []);
      }
      if (citationsRes.ok) {
        const data = await citationsRes.json();
        setCitations(data.citations || []);
      }
      if (benchmarkRes.ok) {
        const data = await benchmarkRes.json();
        setCompetitors(data.competitors || []);
        setCompetitorScores(data.scores || []);
      }
      if (recoRes.ok) {
        const data = await recoRes.json();
        setRecommendations(data.recommendations || []);
      }
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setDetailedResults(data.results || []);
        setQueries(data.queries || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">LLM Watch</h1>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const latestScore = scores[0];
  const previousScore = scores[1];
  const delta =
    latestScore && previousScore
      ? Math.round(Number(latestScore.score) - Number(previousScore.score))
      : undefined;

  // Chart data (oldest first)
  const chartData = [...scores]
    .reverse()
    .map((s) => ({ week: s.week_start, score: Number(s.score) }));

  // Benchmark entries
  const benchmarkEntries = [
    ...(latestScore
      ? [
          {
            name: client?.name || "Vous",
            score: Number(latestScore.score),
            isClient: true,
          },
        ]
      : []),
    ...competitors.map((comp) => {
      const latestCompScore = competitorScores.find(
        (s: any) => s.competitor_id === comp.id
      );
      return {
        name: comp.name,
        score: latestCompScore ? Number(latestCompScore.score) : 0,
      };
    }),
  ];

  // Score by lang (parse if string)
  const scoreByLang = latestScore?.score_by_lang
    ? typeof latestScore.score_by_lang === "string"
      ? JSON.parse(latestScore.score_by_lang)
      : latestScore.score_by_lang
    : null;

  // Score by LLM (parse if string)
  const scoreByLlm = latestScore?.score_by_llm
    ? typeof latestScore.score_by_llm === "string"
      ? JSON.parse(latestScore.score_by_llm)
      : latestScore.score_by_llm
    : null;

  // Citation stats
  const totalResults = detailedResults.length;
  const citedResults = detailedResults.filter((r: any) => r.cited).length;
  const rankedResults = detailedResults.filter((r: any) => r.rank && r.rank <= 3).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {client?.name || "Client"} — LLM Watch
          </h1>
          <p className="text-muted-foreground mt-1">
            {client?.sector} / GEO — {client?.location}
          </p>
          {client?.last_monitored_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Dernier scan : {new Date(client.last_monitored_at).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {({ weekly: "Hebdo", monthly: "Mensuel", quarterly: "Trimestriel", manual: "Manuel" } as Record<string, string>)[client?.monitoring_frequency || "manual"] || "Manuel"}
          </Badge>
          {latestScore && (
            <Button
              variant="outline"
              onClick={() => window.open(`/api/llmwatch/pdf?clientId=${clientId}&format=pdf`, "_blank")}
            >
              Exporter PDF
            </Button>
          )}
          <Button
            onClick={handleRunMonitoring}
            disabled={running}
          >
            {running ? "Analyse en cours..." : "Lancer l'analyse"}
          </Button>
        </div>
      </div>

      {/* Progress bar during analysis */}
      {runProgress && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Requete {runProgress.current}/{runProgress.total}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round((runProgress.current / runProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 mb-2">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(runProgress.current / runProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {runProgress.currentQuery}
            </p>
            {runProgress.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {runProgress.errors.length} erreur{runProgress.errors.length > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Run result feedback */}
      {runMessage && !runProgress && (
        <div className={`text-sm px-4 py-3 rounded-md ${
          runMessage.success
            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
        }`}>
          {runMessage.text}
        </div>
      )}

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ScoreCard
          label="Score global"
          value={latestScore ? Math.round(Number(latestScore.score)) : "-"}
          delta={delta}
          size="lg"
        />
        <ScoreCard
          label="Taux de citation"
          value={
            latestScore
              ? `${Math.round(Number(latestScore.citation_rate))}%`
              : "-"
          }
        />
        <ScoreCard label="Top 3" value={rankedResults} />
        <ScoreCard label="Semaines suivies" value={scores.length} />
        <ScoreCard label="Alertes actives" value={alerts.length} />
      </div>

      {/* Recommendations — the most valuable section */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Actions recommandées</span>
              <span className="text-xs font-normal text-muted-foreground">
                Générées par IA
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations.map((r) => (
                <RecommendationCard key={r.id} recommendation={r} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart + LLM Breakdown + Language Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Évolution du score</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreChart data={chartData} height={250} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score par LLM</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreByLlm ? (
              <LlmBreakdown scoreByLlm={scoreByLlm} />
            ) : (
              <p className="text-sm text-muted-foreground">Pas de données</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score par langue</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreByLang ? (
              <LanguageBreakdown scoreByLang={scoreByLang} />
            ) : (
              <p className="text-sm text-muted-foreground">Pas de données</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Competitive Gap Analysis */}
      {benchmarkEntries.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse concurrentielle</CardTitle>
            </CardHeader>
            <CardContent>
              <CompetitiveGap
                entries={benchmarkEntries}
                clientName={client?.name || ""}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benchmark concurrents</CardTitle>
            </CardHeader>
            <CardContent>
              <BenchmarkTable
                entries={benchmarkEntries}
                clientName={client?.name || ""}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Query Results Matrix */}
      {detailedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Détail par requête</span>
              <span className="text-xs font-normal text-muted-foreground">
                {citedResults}/{totalResults} citations
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QueryResultsTable results={detailedResults} queries={queries} />
          </CardContent>
        </Card>
      )}

      {/* Citations */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières citations</CardTitle>
        </CardHeader>
        <CardContent>
          {citations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {citations.map((c) => (
                <CitationBlock
                  key={c.id}
                  llm={c.llm}
                  lang={c.lang}
                  snippet={c.snippet}
                  rank={c.rank}
                  cited={c.cited}
                  collectedAt={c.collected_at}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune citation détectée pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertes récentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((a) => (
              <AlertBadge
                key={a.id}
                alertType={a.alert_type}
                message={a.message}
                delta={Number(a.delta)}
                createdAt={a.created_at}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
