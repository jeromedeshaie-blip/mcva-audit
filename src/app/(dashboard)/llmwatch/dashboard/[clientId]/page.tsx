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
import type {
  LlmWatchScore,
  LlmWatchCitation,
  LlmWatchAlert,
  LlmWatchRecommendation,
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
      <div>
        <h1 className="text-2xl font-bold">
          {client?.name || "Client"} — LLM Watch
        </h1>
        <p className="text-muted-foreground mt-1">
          {client?.sector} — {client?.location}
        </p>
      </div>

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
