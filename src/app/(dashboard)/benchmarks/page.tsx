"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GEOGRAPHIC_SCOPES, POLLING_TIMEOUT_MS } from "@/lib/constants";
import type { Benchmark, BenchmarkDomain } from "@/types/audit";

type PageState = "list" | "create" | "running" | "detail";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  running: { label: "En cours", variant: "default" },
  completed: { label: "Termine", variant: "outline" },
  error: { label: "Erreur", variant: "destructive" },
};

export default function BenchmarksPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("list");
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [geoScope, setGeoScope] = useState("suisse");
  const [domainsText, setDomainsText] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Running state
  const [activeBenchmarkId, setActiveBenchmarkId] = useState<string | null>(null);
  const [activeBenchmark, setActiveBenchmark] = useState<Benchmark | null>(null);
  const [activeDomains, setActiveDomains] = useState<BenchmarkDomain[]>([]);
  const pollingStartedAt = useRef<number>(0);

  // Fetch benchmarks
  const fetchBenchmarks = useCallback(async () => {
    try {
      const res = await fetch("/api/benchmark");
      if (res.ok) {
        const data = await res.json();
        setBenchmarks(data.benchmarks || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  // Create benchmark
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    const domains = domainsText
      .split("\n")
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    if (domains.length < 2) {
      setCreateError("Entrez au moins 2 domaines (un par ligne).");
      setCreating(false);
      return;
    }

    try {
      const res = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sub_category: subCategory,
          geographic_scope: geoScope,
          domains,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      const data = await res.json();
      setActiveBenchmarkId(data.benchmark_id);
      setPageState("running");
      pollingStartedAt.current = Date.now();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  };

  // Poll running benchmark
  const pollBenchmark = useCallback(async () => {
    if (!activeBenchmarkId) return;

    if (Date.now() - pollingStartedAt.current > POLLING_TIMEOUT_MS.benchmark) {
      setPageState("list");
      fetchBenchmarks();
      return;
    }

    try {
      const res = await fetch(`/api/benchmark?id=${activeBenchmarkId}`);
      if (!res.ok) return;

      const data = await res.json();
      setActiveBenchmark(data.benchmark);
      setActiveDomains(data.domains || []);

      if (data.benchmark?.status === "completed" || data.benchmark?.status === "error") {
        setPageState("detail");
      }
    } catch {
      // ignore
    }
  }, [activeBenchmarkId, fetchBenchmarks]);

  useEffect(() => {
    if (pageState !== "running") return;
    pollBenchmark(); // immediate first poll
    const interval = setInterval(pollBenchmark, 5000);
    return () => clearInterval(interval);
  }, [pageState, pollBenchmark]);

  // View existing benchmark
  const viewBenchmark = async (id: string) => {
    setActiveBenchmarkId(id);
    try {
      const res = await fetch(`/api/benchmark?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveBenchmark(data.benchmark);
        setActiveDomains(data.domains || []);

        if (data.benchmark?.status === "running") {
          pollingStartedAt.current = Date.now();
          setPageState("running");
        } else {
          setPageState("detail");
        }
      }
    } catch {
      // ignore
    }
  };

  // --- RENDER ---

  if (pageState === "detail" && activeBenchmark) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{activeBenchmark.name}</h1>
            <p className="text-muted-foreground mt-1">
              {activeBenchmark.sub_category} — {activeBenchmark.geographic_scope} — {activeDomains.length} domaines
            </p>
          </div>
          <Button variant="outline" onClick={() => { setPageState("list"); fetchBenchmarks(); }}>
            Retour
          </Button>
        </div>

        {activeBenchmark.status === "error" && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">
                Le benchmark a rencontre une erreur. Certains domaines n&apos;ont peut-etre pas pu etre audites.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Rankings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Classement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-semibold w-12">#</th>
                    <th className="text-left p-3 font-semibold">Domaine</th>
                    <th className="text-center p-3 font-semibold w-24">Score SEO</th>
                    <th className="text-center p-3 font-semibold w-24">Score GEO</th>
                    <th className="text-center p-3 font-semibold w-20">Rang SEO</th>
                    <th className="text-center p-3 font-semibold w-20">Rang GEO</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDomains
                    .sort((a, b) => (a.rank_seo ?? 999) - (b.rank_seo ?? 999))
                    .map((d, idx) => (
                      <tr
                        key={d.id}
                        className={`border-b ${idx < 3 ? "bg-primary/5" : ""}`}
                      >
                        <td className="p-3 font-bold text-muted-foreground">
                          {d.rank_seo ?? "-"}
                        </td>
                        <td className="p-3 font-medium">{d.domain}</td>
                        <td className="text-center p-3">
                          <ScoreBadge score={d.score_seo} />
                        </td>
                        <td className="text-center p-3">
                          <ScoreBadge score={d.score_geo} />
                        </td>
                        <td className="text-center p-3 text-muted-foreground">
                          {d.rank_seo ? `${d.rank_seo}/${activeDomains.length}` : "-"}
                        </td>
                        <td className="text-center p-3 text-muted-foreground">
                          {d.rank_geo ? `${d.rank_geo}/${activeDomains.length}` : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "running" && activeBenchmark) {
    const progress = activeBenchmark.domains_count > 0
      ? Math.round((activeBenchmark.completed_count / activeBenchmark.domains_count) * 100)
      : 5;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{activeBenchmark.name}</h1>
          <p className="text-muted-foreground mt-1">Benchmark en cours...</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {activeBenchmark.completed_count}/{activeBenchmark.domains_count} audits termines
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={Math.max(progress, 5)} />
              <p className="text-xs text-muted-foreground">
                Cout estime : ~${(activeBenchmark.domains_count * 0.03).toFixed(2)} (eco)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageState === "create") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Nouveau benchmark</h1>
            <p className="text-muted-foreground mt-1">
              Comparez les scores SEO/GEO de domaines concurrents dans un secteur.
            </p>
          </div>
          <Button variant="outline" onClick={() => setPageState("list")}>
            Retour
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du benchmark</Label>
                  <Input
                    id="name"
                    placeholder="Offices de tourisme — Valais"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sub_category">Sous-categorie (texte libre)</Label>
                  <Input
                    id="sub_category"
                    placeholder="tourisme-valais"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Perimetre geographique</Label>
                <Select value={geoScope} onValueChange={(v) => setGeoScope(v || "suisse")}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEOGRAPHIC_SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="domains">
                  Domaines a comparer (un par ligne)
                </Label>
                <textarea
                  id="domains"
                  className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder={`nendaz.ch\nverbier.ch\nzermatt.ch\ncrans-montana.ch\nsierre-anniviers.ch\nleukerbad.ch`}
                  value={domainsText}
                  onChange={(e) => setDomainsText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {domainsText.split("\n").filter((d) => d.trim()).length} domaines —
                  Cout estime : ~${(Math.max(domainsText.split("\n").filter((d) => d.trim()).length, 0) * 0.03).toFixed(2)}
                </p>
              </div>

              {createError && (
                <p className="text-sm text-destructive font-medium">{createError}</p>
              )}

              <Button type="submit" disabled={creating || !name || !subCategory}>
                {creating ? "Lancement en cours..." : "Lancer le benchmark"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- LIST ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Benchmarks sectoriels</h1>
          <p className="text-muted-foreground mt-1">
            Classements SEO/GEO par secteur et perimetre geographique.
          </p>
        </div>
        <Button onClick={() => setPageState("create")}>
          Nouveau benchmark
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      ) : benchmarks.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">
              Aucun benchmark pour le moment.
            </p>
            <Button onClick={() => setPageState("create")}>
              Creer votre premier benchmark
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {benchmarks.map((b) => {
            const statusInfo = STATUS_LABELS[b.status] || STATUS_LABELS.draft;
            return (
              <Card
                key={b.id}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => viewBenchmark(b.id)}
              >
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{b.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {b.sub_category} — {b.geographic_scope} — {b.domains_count} domaines
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-muted-foreground">-</span>;

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
