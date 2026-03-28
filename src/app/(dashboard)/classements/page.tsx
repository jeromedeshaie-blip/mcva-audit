"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectorCombobox, findParentGroup } from "@/components/ui/sector-combobox";
import type { SectorRanking } from "@/types/audit";
import { SECTORS, SECTOR_GROUPS } from "@/lib/constants";

export default function ClassementsPage() {
  const [sector, setSector] = useState("finance-fiduciaire");
  const [rankings, setRankings] = useState<SectorRanking[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine if the selected value is a group or a sub-sector
  const isGroupSelected = useMemo(
    () => SECTOR_GROUPS.some((g) => g.value === sector),
    [sector]
  );

  const parentGroup = useMemo(() => findParentGroup(sector), [sector]);

  const sectorLabel = useMemo(() => {
    if (isGroupSelected) {
      return SECTOR_GROUPS.find((g) => g.value === sector)?.label ?? sector;
    }
    return SECTORS.find((s) => s.value === sector)?.label ?? sector;
  }, [sector, isGroupSelected]);

  const parentGroupLabel = useMemo(() => {
    if (isGroupSelected) return null;
    return parentGroup?.label ?? null;
  }, [isGroupSelected, parentGroup]);

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ sector });
        if (isGroupSelected) params.set("group", "1");
        const res = await fetch(`/api/rankings?${params}`);
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
  }, [sector, isGroupSelected]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Classements sectoriels</h1>
          <p className="text-muted-foreground mt-1">
            Benchmark SEO/GEO par secteur d&apos;activite.
          </p>
        </div>
        <SectorCombobox
          value={sector}
          onValueChange={(v) => v && setSector(v)}
          placeholder="Choisir un secteur"
          allowGroupSelection
          className="w-full sm:w-[280px]"
        />
      </div>

      {/* Breadcrumb showing group > sub-sector */}
      {parentGroupLabel && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => parentGroup && setSector(parentGroup.value)}
            className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            {parentGroupLabel}
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">{sectorLabel}</span>
        </div>
      )}

      {/* Scope indicator */}
      <div className="flex items-center gap-2">
        <Badge variant={isGroupSelected ? "default" : "secondary"}>
          {isGroupSelected ? "Vue secteur" : "Vue sous-secteur"}
        </Badge>
        {isGroupSelected && (
          <span className="text-xs text-muted-foreground">
            Agregation de tous les sous-secteurs de {sectorLabel}
          </span>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Top domaines — {sectorLabel}
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
            <table className="w-full" aria-label={`Classement ${sectorLabel}`}>
              <thead>
                <tr className="border-b text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2 text-left w-12">#</th>
                  <th className="px-4 py-2 text-left">Domaine</th>
                  {!isGroupSelected && (
                    <th className="px-4 py-2 text-left">Sous-secteur</th>
                  )}
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
                    {!isGroupSelected && (
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {SECTORS.find((s) => s.value === r.sector)?.label ?? r.sector}
                      </td>
                    )}
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
    const colors = [
      "bg-gradient-to-br from-[#D4553A] to-[#8B2C2C] text-white shadow-sm",
      "bg-gradient-to-br from-[#E8937A] to-[#D4553A] text-white shadow-sm",
      "bg-gradient-to-br from-[#F5C4B0] to-[#E8937A] text-[#4A1515] shadow-sm",
    ];
    return (
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${colors[rank - 1]}`}
      >
        {rank}
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground ml-1.5">{rank}</span>;
}

function ScoreCell({ score }: { score: number }) {
  const color =
    score >= 75
      ? "text-[#2A9D5C]"
      : score >= 50
        ? "text-[#D4553A]"
        : score >= 25
          ? "text-[#A83D33]"
          : "text-[#8B2C2C]";
  return <span className={`font-bold tabular-nums ${color}`}>{score}</span>;
}
