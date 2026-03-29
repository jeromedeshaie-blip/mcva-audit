"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SectorCombobox } from "@/components/ui/sector-combobox";
import { AuditResults } from "@/components/audit/audit-results";
import type { AuditScores, AuditItem, AuditAction } from "@/types/audit";
import { QUALITY_LEVELS } from "@/lib/constants";
import type { QualityLevel } from "@/types/audit";

type AuditState = "idle" | "loading" | "polling" | "completed" | "error";

export default function AuditCompletPage() {
  return (
    <Suspense>
      <AuditCompletContent />
    </Suspense>
  );
}

function AuditCompletContent() {
  const searchParams = useSearchParams();

  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [sector, setSector] = useState(searchParams.get("sector") || "");
  const [quality, setQuality] = useState<QualityLevel>(
    (searchParams.get("quality") as QualityLevel) || "standard"
  );
  const [fromAuditId] = useState(searchParams.get("from") || null);
  const [state, setState] = useState<AuditState>("idle");
  const [progress, setProgress] = useState(0);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scores, setScores] = useState<AuditScores | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [actions, setActions] = useState<AuditAction[]>([]);

  // Simulated progress while the direct endpoint runs
  useEffect(() => {
    if (state !== "loading") return;
    const steps = [
      { at: 500, pct: 5 },
      { at: 2000, pct: 15 },
      { at: 5000, pct: 30 },
      { at: 10000, pct: 45 },
      { at: 18000, pct: 60 },
      { at: 25000, pct: 72 },
      { at: 35000, pct: 82 },
      { at: 45000, pct: 88 },
    ];
    const timers = steps.map(({ at, pct }) =>
      setTimeout(() => setProgress((p) => Math.max(p, pct)), at)
    );
    return () => timers.forEach(clearTimeout);
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setState("loading");
    setProgress(3);
    setError(null);
    setScores(null);
    setItems([]);
    setActions([]);

    try {
      // Use the direct (non-Inngest) endpoint for reliability
      const res = await fetch("/api/audit-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          sector,
          quality,
        }),
      });

      // Handle non-JSON responses (Vercel timeout pages, 502/504 errors)
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        if (res.status === 504 || res.status === 502) {
          throw new Error("L'audit a depasse le temps limite (60s). Essayez en qualite 'eco' pour un audit plus rapide.");
        }
        throw new Error(`Erreur serveur (${res.status}). Veuillez reessayer.`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.detail || "Erreur lors de l'audit");
      }

      // Audit completed directly — fetch full results
      setAuditId(data.audit_id);
      setProgress(95);

      const resultsRes = await fetch(`/api/audit?id=${data.audit_id}`);
      const results = await resultsRes.json();

      setScores(results.scores);
      setItems(results.items || []);
      setActions(results.actions || []);
      setState("completed");
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setState("error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0808] via-[#1A0F0F] to-[#2A1515] p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 70%, #D4553A 0%, transparent 60%)" }}
        />
        <div className="relative">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Audit Complet</h1>
          <p className="text-white/60 mt-1">
            80 criteres CORE-EEAT + 40 criteres CITE + plan d&apos;action
            priorise + benchmark concurrentiel.
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Lancer un audit complet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="url">URL du site</Label>
                <Input
                  id="url"
                  type="text"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={state === "loading" || state === "polling"}
                />
              </div>
              <div className="space-y-2">
                <Label>Secteur</Label>
                <SectorCombobox
                  value={sector}
                  onValueChange={setSector}
                  placeholder="Choisir un secteur"
                  disabled={state === "loading" || state === "polling"}
                />
              </div>
            </div>

            {/* Quality level selector */}
            <div className="space-y-2">
              <Label>Niveau de qualite</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {QUALITY_LEVELS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setQuality(q.value as QualityLevel)}
                    disabled={state === "loading" || state === "polling"}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      quality === q.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    } ${state === "loading" || state === "polling" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <span>{q.icon}</span>
                      <span>{q.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {q.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {fromAuditId && (
              <p className="text-sm text-muted-foreground">
                Cet audit complet est base sur l&apos;audit express precedent.
                Les scores seront affines avec 120 criteres au lieu de 30.
              </p>
            )}

            <Button
              type="submit"
              disabled={!url || state === "loading" || state === "polling"}
              className="w-full md:w-auto"
            >
              {state === "loading" || state === "polling"
                ? "Analyse en cours..."
                : "Lancer l'audit complet"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Progress */}
      {(state === "loading" || state === "polling") && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {progress < 10
                    ? "Initialisation..."
                    : progress < 25
                      ? "Scraping HTML et collecte des donnees SEO..."
                      : progress < 40
                        ? "Analyse de la visibilite IA (GEO)..."
                        : progress < 55
                          ? "Scoring CORE-EEAT (80 criteres via LLM)..."
                          : progress < 70
                            ? "Scoring CITE (40 criteres via LLM)..."
                            : progress < 80
                              ? "Analyse concurrentielle..."
                              : progress < 90
                                ? "Generation du plan d'action..."
                                : "Finalisation des scores..."}
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                Temps estime : 30-60 secondes
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {state === "error" && error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">{error}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setState("idle")}
            >
              Reessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {state === "completed" && scores && auditId && (
        <>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                window.open(`/api/audit/pdf?id=${auditId}`, "_blank");
              }}
            >
              Telecharger le PDF
            </Button>
          </div>

          <AuditResults
            scores={scores}
            items={items}
            actions={actions}
            auditType="full"
          />
        </>
      )}
    </div>
  );
}
