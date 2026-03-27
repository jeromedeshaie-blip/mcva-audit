"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/llmwatch/ScoreCard";
import { ScoreChart } from "@/components/llmwatch/ScoreChart";
import { LlmBreakdown } from "@/components/llmwatch/LlmBreakdown";
import { BenchmarkTable } from "@/components/llmwatch/BenchmarkTable";
import { CitationBlock } from "@/components/llmwatch/CitationBlock";
import { AlertBadge } from "@/components/llmwatch/AlertBadge";
import type { LlmWatchScore, LlmWatchCitation, LlmWatchAlert } from "@/lib/llmwatch/types";

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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [clientRes, scoresRes, citationsRes, benchmarkRes] =
        await Promise.all([
          fetch(`/api/llmwatch/clients?id=${clientId}`),
          fetch(`/api/llmwatch/scores?clientId=${clientId}&limit=12`),
          fetch(`/api/llmwatch/citations?clientId=${clientId}&cited=true&limit=10`),
          fetch(`/api/llmwatch/benchmark?clientId=${clientId}`),
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
  const delta = latestScore && previousScore
    ? Math.round(Number(latestScore.score) - Number(previousScore.score))
    : undefined;

  // Build chart data (oldest first)
  const chartData = [...scores]
    .reverse()
    .map((s) => ({ week: s.week_start, score: Number(s.score) }));

  // Build benchmark entries
  const benchmarkEntries = [
    ...(latestScore
      ? [{
          name: client?.name || "Vous",
          score: Number(latestScore.score),
          isClient: true,
        }]
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          label="Score global"
          value={latestScore ? Math.round(Number(latestScore.score)) : "-"}
          delta={delta}
          size="lg"
        />
        <ScoreCard
          label="Taux de citation"
          value={latestScore ? `${Math.round(Number(latestScore.citation_rate))}%` : "-"}
        />
        <ScoreCard
          label="Semaines suivies"
          value={scores.length}
        />
        <ScoreCard
          label="Alertes actives"
          value={alerts.length}
        />
      </div>

      {/* Chart + LLM Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Evolution du score</CardTitle>
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
            {latestScore?.score_by_llm ? (
              <LlmBreakdown scoreByLlm={typeof latestScore.score_by_llm === "string" ? JSON.parse(latestScore.score_by_llm) : latestScore.score_by_llm} />
            ) : (
              <p className="text-sm text-muted-foreground">Pas de donnees</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Benchmark */}
      {benchmarkEntries.length > 1 && (
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
      )}

      {/* Citations */}
      <Card>
        <CardHeader>
          <CardTitle>Dernieres citations</CardTitle>
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
              Aucune citation detectee pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertes recentes</CardTitle>
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
