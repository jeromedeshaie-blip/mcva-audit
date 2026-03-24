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
import { AuditResults } from "@/components/audit/audit-results";
import type { AuditScores, AuditItem, AuditAction } from "@/types/audit";
import { SECTORS, POLLING_TIMEOUT_MS, QUALITY_LEVELS } from "@/lib/constants";
import type { QualityLevel } from "@/types/audit";

type AuditState = "idle" | "loading" | "polling" | "completed" | "error";

export default function AuditExpressPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [sector, setSector] = useState("");
  const [quality, setQuality] = useState<QualityLevel>("eco");
  const [state, setState] = useState<AuditState>("idle");
  const [progress, setProgress] = useState(0);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingStartedAt = useRef<number>(0);

  const [scores, setScores] = useState<AuditScores | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [actions, setActions] = useState<AuditAction[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setState("loading");
    setProgress(5);
    setError(null);
    setScores(null);
    setItems([]);
    setActions([]);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, sector, type: "express", quality }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors du lancement");
      }

      const data = await res.json();
      setAuditId(data.audit_id);
      setState("polling");
      setProgress(15);
      pollingStartedAt.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setState("error");
    }
  };

  // Poll for results
  const pollResults = useCallback(async () => {
    if (!auditId || state !== "polling") return;

    // Timeout check
    if (Date.now() - pollingStartedAt.current > POLLING_TIMEOUT_MS.express) {
      setError("L'audit a pris trop de temps. Veuillez réessayer.");
      setState("error");
      return;
    }

    try {
      const res = await fetch(`/api/audit?id=${auditId}`);
      if (!res.ok) return;

      const data = await res.json();

      if (data.audit?.status === "completed") {
        setScores(data.scores);
        setItems(data.items || []);
        setActions(data.actions || []);
        setState("completed");
        setProgress(100);
      } else if (data.audit?.status === "error") {
        setError("L'audit a echoue. Veuillez reessayer.");
        setState("error");
      } else {
        // Still processing — increment progress
        setProgress((p) => Math.min(p + 8, 90));
      }
    } catch {
      // Ignore polling errors, will retry
    }
  }, [auditId, state]);

  useEffect(() => {
    if (state !== "polling") return;

    const interval = setInterval(pollResults, 3000);
    return () => clearInterval(interval);
  }, [state, pollResults]);

  const handleLaunchFull = async () => {
    if (!url) return;
    router.push(
      `/audit-complet?url=${encodeURIComponent(url)}&sector=${encodeURIComponent(sector)}&quality=${quality}&from=${auditId}`
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Express</h1>
        <p className="text-muted-foreground mt-1">
          Score SEO + GEO en moins de 3 minutes — 20 criteres CORE-EEAT
          analyses sur 8 dimensions.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Lancer un audit express</CardTitle>
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
                <Select value={sector} onValueChange={(v) => setSector(v || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un secteur" />
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

            <Button
              type="submit"
              disabled={!url || state === "loading" || state === "polling"}
              className="w-full md:w-auto"
            >
              {state === "loading" || state === "polling"
                ? "Analyse en cours..."
                : "Lancer l'audit express"}
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
                  {progress < 20
                    ? "Initialisation..."
                    : progress < 40
                      ? "Scraping HTML et collecte des donnees SEO..."
                      : progress < 60
                        ? "Analyse de la visibilite IA (GEO)..."
                        : progress < 85
                          ? "Scoring CORE-EEAT (20 criteres via LLM)..."
                          : "Finalisation des scores..."}
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                Temps estime : 2-3 minutes
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
          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                window.open(`/api/audit/pdf?id=${auditId}`, "_blank");
              }}
            >
              Telecharger le PDF
            </Button>
            <Button
              variant="default"
              onClick={() => handleLaunchFull()}
            >
              Lancer l&apos;audit complet
            </Button>
          </div>

          <AuditResults
            scores={scores}
            items={items}
            actions={actions}
            auditType="express"
          />

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Passez a l&apos;audit complet
                </p>
                <p className="text-sm text-muted-foreground">
                  80 criteres CORE-EEAT + 40 criteres CITE + plan d&apos;action
                  priorise + benchmark concurrentiel
                </p>
              </div>
              <Button
                variant="default"
                onClick={() => handleLaunchFull()}
              >
                Lancer l&apos;audit complet
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
