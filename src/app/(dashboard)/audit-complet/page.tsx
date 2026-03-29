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
  | "scoring_4"
  | "scoring_5"
  | "scoring_6"
  | "data"
  | "finalize"
  | "completed"
  | "error";

const STEP_LABELS: Record<AuditStep, string> = {
  idle: "",
  init: "Initialisation et scraping du site...",
  scoring_1: "Scoring CORE-EEAT — C, O (1/6)...",
  scoring_2: "Scoring CORE-EEAT — R, E (2/6)...",
  scoring_3: "Scoring CORE-EEAT — Exp, Ept (3/6)...",
  scoring_4: "Scoring CORE-EEAT — A, T (4/6)...",
  scoring_5: "Scoring CITE — C, I (5/6)...",
  scoring_6: "Scoring CITE — T, E (6/6)...",
  data: "Collecte donnees SEO, GEO et audit technique...",
  finalize: "Finalisation, plan d'action et sauvegarde...",
  completed: "Audit termine !",
  error: "",
};

const STEP_PROGRESS: Record<AuditStep, number> = {
  idle: 0,
  init: 4,
  scoring_1: 12,
  scoring_2: 22,
  scoring_3: 32,
  scoring_4: 42,
  scoring_5: 52,
  scoring_6: 62,
  data: 78,
  finalize: 90,
  completed: 100,
  error: 0,
};

const MAX_RETRIES = 1;

export default function AuditCompletPage() {
  return (
    <Suspense>
      <AuditCompletContent />
    </Suspense>
  );
}

/** Helper to call a step endpoint with error handling + retry on timeout */
async function fetchStep(
  url: string,
  body: Record<string, unknown>,
  stepLabel?: string,
  retries = MAX_RETRIES
): Promise<any> {
  const label = stepLabel || url;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Handle Vercel timeout / non-JSON errors
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if ((res.status === 504 || res.status === 502) && attempt < retries) {
        console.warn(`[audit] Timeout on ${label}, retry ${attempt + 1}/${retries}...`);
        continue; // retry
      }
      if (res.status === 504 || res.status === 502) {
        throw new Error(`Timeout serveur a l'etape "${label}". Veuillez reessayer.`);
      }
      throw new Error(`Erreur serveur (${res.status}) a l'etape "${label}".`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.detail || `Erreur ${res.status} a l'etape "${label}"`);
    }
    return data;
  }

  throw new Error(`Echec apres ${retries + 1} tentatives a l'etape "${label}".`);
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
  const [isSpa, setIsSpa] = useState(false);

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
      const initData = await fetchStep("/api/audit-direct/init", { url, sector, quality }, "Init");
      const id = initData.auditId;
      setAuditId(id);
      if (initData.spaDetected) setIsSpa(true);

      // ─── Steps 2-7: Score dimensions in 6 batches of 2 ───
      const batches: { step: AuditStep; dimensions: string[]; framework: "core_eeat" | "cite"; label: string }[] = [
        { step: "scoring_1", dimensions: ["C", "O"], framework: "core_eeat", label: "CORE-EEAT C,O" },
        { step: "scoring_2", dimensions: ["R", "E"], framework: "core_eeat", label: "CORE-EEAT R,E" },
        { step: "scoring_3", dimensions: ["Exp", "Ept"], framework: "core_eeat", label: "CORE-EEAT Exp,Ept" },
        { step: "scoring_4", dimensions: ["A", "T"], framework: "core_eeat", label: "CORE-EEAT A,T" },
        { step: "scoring_5", dimensions: ["C", "I"], framework: "cite", label: "CITE C,I" },
        { step: "scoring_6", dimensions: ["T", "E"], framework: "cite", label: "CITE T,E" },
      ];

      for (const batch of batches) {
        setStep(batch.step);
        setProgress(STEP_PROGRESS[batch.step]);
        await fetchStep("/api/audit-direct/score", {
          auditId: id,
          dimensions: batch.dimensions,
          framework: batch.framework,
          quality,
        }, batch.label);
      }

      // ─── Step 6: Data collection (SEO + GEO + site audit) ───
      setStep("data");
      setProgress(STEP_PROGRESS.data);
      const dataRes = await fetchStep("/api/audit-direct/data", { auditId: id, quality }, "Data SEO/GEO");

      // ─── Step 7: Finalize (aggregate + save) ───
      setStep("finalize");
      setProgress(STEP_PROGRESS.finalize);
      await fetchStep("/api/audit-direct/finalize", {
        auditId: id,
        seoData: dataRes.seoData,
        geoData: dataRes.geoData,
        competitors: dataRes.competitors,
        siteAuditData: dataRes.siteAuditData,
        quality,
      }, "Finalize + Plan d'action");

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
                  Etape {Object.keys(STEP_PROGRESS).indexOf(step)}/8 — chaque etape prend 10-30 secondes
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
            isSpa={isSpa}
          />
        </>
      )}
    </div>
  );
}
