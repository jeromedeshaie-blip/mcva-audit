"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { SectorRanking } from "@/types/audit";
import { SECTORS } from "@/lib/constants";

export default function ClassementsPage() {
  const [sector, setSector] = useState("tech-saas");
  const [rankings, setRankings] = useState<SectorRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true);
      try {
        const res = await fetch(`/api/rankings?sector=${sector}`);
        if (res.ok) {
          const data = await res.json();
          setRankings(data.rankings || []);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchRankings();
  }, [sector]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classements sectoriels</h1>
          <p className="text-muted-foreground mt-1">
            Benchmark SEO/GEO par secteur d&apos;activite.
          </p>
        </div>
        <Select value={sector} onValueChange={(v) => setSector(v || sector)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTORS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Top domaines — {SECTORS.find((s) => s.value === sector)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : rankings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Aucun classement disponible pour ce secteur.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Les classements sont mis a jour automatiquement a partir des
                audits realises.
              </p>
            </div>
          ) : (
            <table className="w-full" aria-label={`Classement ${SECTORS.find((s) => s.value === sector)?.label}`}>
              <thead>
                <tr className="border-b text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2 text-left w-12">#</th>
                  <th className="px-4 py-2 text-left">Domaine</th>
                  <th className="px-4 py-2 text-right">Score SEO</th>
                  <th className="px-4 py-2 text-right">Score GEO</th>
                  <th className="px-4 py-2 text-right">Semaine</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <RankBadge rank={idx + 1} />
                    </td>
                    <td className="px-4 py-3 font-medium">{r.domain}</td>
                    <td className="px-4 py-3 text-right">
                      <ScoreCell score={r.score_seo} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ScoreCell score={r.score_geo} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                      {new Date(r.week_of).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = ["bg-yellow-400 text-black", "bg-gray-300 text-black", "bg-amber-600 text-white"];
    return (
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colors[rank - 1]}`}
      >
        {rank}
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground ml-1">{rank}</span>;
}

function ScoreCell({ score }: { score: number }) {
  const color =
    score >= 75
      ? "text-green-600"
      : score >= 50
        ? "text-amber-600"
        : score >= 25
          ? "text-orange-600"
          : "text-red-600";
  return <span className={`font-bold ${color}`}>{score}</span>;
}
