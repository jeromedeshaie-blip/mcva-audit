"use client";

import { Suspense, useState } from "react";
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

type AuditStep =
  | "idle"
  | "init"
  | "scoring_1"
  | "scoring_2"
  | "scoring_3"
  | "data"
  | "finalize"
  | "completed"
  | "error";

const STEP_LABELS: Record<AuditStep, string> = {
  idle: "",
  init: "Initialisation et scraping du site...",
  scoring_1: "Scoring CORE-EEAT dimensions C, O, R, E (1/3)...",
  scoring_2: "Scoring CORE-EEAT dimensions Exp, Ept, A, T (2/3)...",
  scoring_3: "Scoring CITE dimensions C, I, T, E (3/3)...",
  data: "Collecte donnees SEO, GEO et audit technique...",
  finalize: "Finalisation et sauvegarde des resultats...",
  completed: "Audit termine !",
  error: "",
};

const STEP_PROGRESS: Record<AuditStep, number> = {
  idle: 0,
  init: 8,
  scoring_1: 25,
  scoring_2: 45,
  scoring_3: 65,
  data: 80,
  finalize: 92,
  completed: 100,
  error: 0,
};

export default function AuditCompletPage() {
  return (
    <Suspense>
      <AuditCompletContent />
    </Suspense>
  );
}

/** Helper to call a step endpoint with error handling */
async function fetchStep(url: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Handle Vercel timeout / non-JSON errors
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (res.status === 504 || res.status === 502) {
      throw new Error("Timeout serveur. Veuillez reessayer.");
    }
    throw new Error(`Erreur serveur (${res.status}).`);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.detail || `Erreur ${res.status}`);
  }
  return data;
}

function AuditCompletContent() {
  const searchParams = useSearchParams();

  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [sector, setSector] = useState(searchParams.get("sector") || "");
  const [quality, setQuality] = useState<QualityLevel>(
    (searchParams.get("quality") as QualityLevel) || "standard"
  );
  const [fromAuditId] = useState(searchParams.get("from") || null);
  const [step, setStep] = useState<AuditStep>("idle");
  const [progress, setProgress] = useState(0);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scores, setScores] = useState<AuditScores | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [actions, setActions] = useState<AuditAction[]>([]);

  const isRunning = step !== "idle" && step !== "completed" && step !== "error";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setError(null);
    setScores(null);
    setItems([]);
    setActions([]);

    try {
      // ─── Step 1: Init (scrape + store HTML) ───
      setStep("init");
      setProgress(STEP_PROGRESS.init);
      const initData = await fetchStep("/api/audit-direct/init", { url, sector, quality });
      const id = initData.auditId;
      setAuditId(id);

      // ─── Steps 2-4: Score dimensions in 3 batches ───
      const batches: { step: AuditStep; dimensions: string[]; framework: "core_eeat" | "cite" }[] = [
        { step: "scoring_1", dimensions: ["C", "O", "R", "E"], framework: "core_eeat" },
        { step: "scoring_2", dimensions: ["Exp", "Ept", "A", "T"], framework: "core_eeat" },
        { step: "scoring_3", dimensions: ["C", "I", "T", "E"], framework: "cite" },
      ];

      for (const batch of batches) {
        setStep(batch.step);
        setProgress(STEP_PROGRESS[batch.step]);
        await fetchStep("/api/audit-direct/score", {
          auditId: id,
          dimensions: batch.dimensions,
          framework: batch.framework,
          quality,
        });
      }

      // ─── Step 5: Data collection (SEO + GEO + site audit) ───
      setStep("data");
      setProgress(STEP_PROGRESS.data);
      const dataRes = await fetchStep("/api/audit-direct/data", { auditId: id, quality });

      // ─── Step 6: Finalize (aggregate + save) ───
      setStep("finalize");
      setProgress(STEP_PROGRESS.finalize);
      await fetchStep("/api/audit-direct/finalize", {
        auditId: id,
        seoData: dataRes.seoData,
        geoData: dataRes.geoData,
        competitors: dataRes.competitors,
        siteAuditData: dataRes.siteAuditData,
      });

      // ─── Done — fetch full results ───
      setProgress(100);
      const resultsRes = await fetch(`/api/audit?id=${id}`);
      const results = await resultsRes.json();

      setScores(results.scores);
      setItems(results.items || []);
      setActions(results.actions || []);
      setStep("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setStep("error");
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
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-2">
                <Label>Secteur</Label>
                <SectorCombobox
                  value={sector}
                  onValueChange={setSector}
                  placeholder="Choisir un secteur"
                  disabled={isRunning}
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
                    disabled={isRunning}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      quality === q.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    } ${isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
              disabled={!url || isRunning}
              className="w-full md:w-auto"
            >
              {isRunning ? "Analyse en cours..." : "Lancer l'audit complet"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {STEP_LABELS[step]}
                </span>
                <span className="font-medium tabular-nums">{progress}%</span>
              </div>
              <Progress value={progress} />
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-[#D4553A] border-t-transparent animate-spin" />
                <p className="text-xs text-muted-foreground">
                  Etape {Object.keys(STEP_PROGRESS).indexOf(step)}/6 — chaque etape prend 10-20 secondes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {step === "error" && error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">{error}</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setStep("idle")}
            >
              Reessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {step === "completed" && scores && auditId && (
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
