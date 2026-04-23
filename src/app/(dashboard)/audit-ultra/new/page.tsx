"use client";

/**
 * Wizard Audit Ultra — 7 étapes (POLE-PERFORMANCE v2.1 § 6.4)
 *
 * 1. Config (URL + secteur)
 * 2-7. Blocs A-F (paste structuré)
 * 8. Recap + lancement (full / dégradé / bloqué)
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SECTOR_GROUPS, QUALITY_LEVELS } from "@/lib/constants";
import { EXTERNAL_BLOCKS, canRunUltra, type ExternalBlockLetter } from "@/lib/scoring/constants";

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface BlocState {
  loaded: boolean;
  letter: ExternalBlockLetter;
  raw: string;
  warnings: string[];
  error: string | null;
  saving: boolean;
}

const INITIAL_BLOCS: Record<ExternalBlockLetter, BlocState> = {
  A: { loaded: false, letter: "A", raw: "", warnings: [], error: null, saving: false },
  B: { loaded: false, letter: "B", raw: "", warnings: [], error: null, saving: false },
  C: { loaded: false, letter: "C", raw: "", warnings: [], error: null, saving: false },
  D: { loaded: false, letter: "D", raw: "", warnings: [], error: null, saving: false },
  E: { loaded: false, letter: "E", raw: "", warnings: [], error: null, saving: false },
  F: { loaded: false, letter: "F", raw: "", warnings: [], error: null, saving: false },
};

export default function AuditUltraWizard() {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(1);
  const [auditId, setAuditId] = useState<string | null>(null);

  // Step 1 — config
  const [url, setUrl] = useState("");
  const [sector, setSector] = useState("");
  const [brandName, setBrandName] = useState("");
  const [quality, setQuality] = useState<string>("premium");
  const [llmwatchClientId, setLlmwatchClientId] = useState("");
  const [creatingAudit, setCreatingAudit] = useState(false);

  // Blocs state
  const [blocs, setBlocs] = useState<Record<ExternalBlockLetter, BlocState>>(INITIAL_BLOCS);

  // Launch state
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const availableLetters = useMemo(
    () => (Object.entries(blocs) as [ExternalBlockLetter, BlocState][])
      .filter(([, s]) => s.loaded)
      .map(([l]) => l),
    [blocs]
  );
  const readiness = useMemo(() => canRunUltra(availableLetters), [availableLetters]);

  // Create audit on step 1 → 2 transition
  async function handleStep1Next() {
    if (!url || !sector) {
      setLaunchError("URL et secteur requis");
      return;
    }
    try {
      new URL(url);
    } catch {
      setLaunchError("URL invalide");
      return;
    }
    setCreatingAudit(true);
    setLaunchError(null);
    try {
      const res = await fetch("/api/audit-direct/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          sector,
          brand_name: brandName || null,
          audit_type: "ultra",
          themes: ["seo", "geo", "perf", "a11y", "tech", "contenu", "rgesn"],
          quality,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setAuditId(data.auditId || data.id);
      setStep(2);
    } catch (e: any) {
      setLaunchError(e.message || "Impossible de creer l'audit");
    } finally {
      setCreatingAudit(false);
    }
  }

  async function saveBloc(letter: ExternalBlockLetter) {
    if (!auditId) return;
    setBlocs((prev) => ({
      ...prev,
      [letter]: { ...prev[letter], saving: true, error: null },
    }));

    try {
      const body: any = {
        auditId,
        blocLetter: letter,
        rawInput: blocs[letter].raw,
      };
      if (letter === "F") body.llmwatchClientId = llmwatchClientId;

      const res = await fetch("/api/audit-ultra/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur import");

      setBlocs((prev) => ({
        ...prev,
        [letter]: {
          ...prev[letter],
          loaded: true,
          saving: false,
          error: null,
          warnings: data.warnings || [],
        },
      }));
    } catch (e: any) {
      setBlocs((prev) => ({
        ...prev,
        [letter]: { ...prev[letter], saving: false, error: e.message },
      }));
    }
  }

  function skipBloc(letter: ExternalBlockLetter) {
    setBlocs((prev) => ({
      ...prev,
      [letter]: { ...prev[letter], loaded: false },
    }));
    setStep((s) => (s + 1) as StepId);
  }

  async function handleLaunch() {
    if (!auditId) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      // Audit already created in step 1 via /api/audit-direct/init
      // Blocs A-F stored in audit_external_blocks via /api/audit-ultra/blocks
      // Redirect to the scoring flow — audit-complet page will load the
      // blocs from DB and enrich the scoring (Phase 2D behavior).
      const params = new URLSearchParams({
        url,
        sector,
        quality,
        auditId,
        resume: "1",
      });
      router.push(`/audit-complet?${params.toString()}`);
    } catch (e: any) {
      setLaunchError(e.message || "Echec lancement audit");
    } finally {
      setLaunching(false);
    }
  }

  const blocLetters: ExternalBlockLetter[] = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Ultra — Wizard 6 blocs</h1>
        <Badge variant="outline">Étape {step}/8</Badge>
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <button
            key={s}
            disabled={!auditId && s > 1}
            onClick={() => auditId && setStep(s as StepId)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              step === s
                ? "bg-primary text-primary-foreground"
                : s < step
                ? "bg-green-100 text-green-700"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s === 1 ? "Config" : s === 8 ? "Recap" : `Bloc ${blocLetters[s - 2]}`}
          </button>
        ))}
      </div>

      {/* STEP 1 — Config */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Configuration de l'audit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="url">URL du site *</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemple.ch"
              />
            </div>
            <div>
              <Label htmlFor="brand">Nom de la marque (optionnel)</Label>
              <Input
                id="brand"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Nom commercial"
              />
            </div>
            <div>
              <Label htmlFor="sector">Secteur *</Label>
              <select
                id="sector"
                className="w-full rounded-md border px-3 py-2"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              >
                <option value="">-- Choisir --</option>
                {SECTOR_GROUPS.map((group) => (
                  <optgroup key={group.value} label={group.label}>
                    {group.subSectors.map((ss) => (
                      <option key={ss.value} value={ss.value}>{ss.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="quality">Niveau de qualité</Label>
              <select
                id="quality"
                className="w-full rounded-md border px-3 py-2"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
              >
                {QUALITY_LEVELS.filter((q) => q.value !== "eco").map((q) => (
                  <option key={q.value} value={q.value}>{q.label} — {q.description}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="llmwatch">LLM Watch client ID (pour Bloc F)</Label>
              <Input
                id="llmwatch"
                value={llmwatchClientId}
                onChange={(e) => setLlmwatchClientId(e.target.value)}
                placeholder="uuid du client LLM Watch (optionnel mais recommandé)"
              />
            </div>
            {launchError && <p className="text-sm text-red-600">{launchError}</p>}
            <Button onClick={handleStep1Next} disabled={creatingAudit || !url || !sector}>
              {creatingAudit ? "Création…" : "Suivant →"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2-7 — Blocs A-F */}
      {step >= 2 && step <= 7 && (() => {
        const letter = blocLetters[step - 2];
        const info = EXTERNAL_BLOCKS[letter];
        const state = blocs[letter];

        return (
          <Card>
            <CardHeader>
              <CardTitle>
                Bloc {letter} — {info.name}
                {state.loaded && <Badge className="ml-2" variant="default">✓ Importé</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {letter === "F" ? (
                <div className="rounded-md bg-blue-50 p-4 text-sm">
                  Le bloc F est récupéré automatiquement depuis LLM Watch (client ID :{" "}
                  <code>{llmwatchClientId || "non défini"}</code>).
                  {!llmwatchClientId && (
                    <p className="mt-2 text-red-700">
                      Aucun client LLM Watch configuré à l'étape 1. Vous pouvez skipper ce bloc.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Paste les données {info.short}</Label>
                  <BlocPasteInstructions letter={letter} />
                  <textarea
                    className="h-64 w-full rounded-md border p-3 font-mono text-xs"
                    placeholder={placeholderForBloc(letter)}
                    value={state.raw}
                    onChange={(e) => setBlocs((prev) => ({
                      ...prev,
                      [letter]: { ...prev[letter], raw: e.target.value },
                    }))}
                  />
                </div>
              )}

              {state.error && <p className="text-sm text-red-600">⚠️ {state.error}</p>}
              {state.warnings.length > 0 && (
                <div className="rounded-md bg-yellow-50 p-3 text-xs">
                  <p className="font-semibold">Avertissements parse :</p>
                  <ul className="list-disc pl-5">
                    {state.warnings.map((w, i) => (<li key={i}>{w}</li>))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={() => setStep((s) => Math.max(2, (s - 1)) as StepId)} variant="outline">
                  ← Précédent
                </Button>
                <Button onClick={() => skipBloc(letter)} variant="outline">
                  Skipper →
                </Button>
                {letter === "F" ? (
                  <Button
                    onClick={() => saveBloc(letter).then(() => setStep((s) => (s + 1) as StepId))}
                    disabled={!llmwatchClientId || state.saving}
                  >
                    {state.saving ? "Import…" : "Importer depuis LLM Watch →"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => saveBloc(letter).then(() => state.error ? null : setStep((s) => (s + 1) as StepId))}
                    disabled={!state.raw.trim() || state.saving}
                  >
                    {state.saving ? "Parse…" : "Importer →"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* STEP 8 — Recap + launch */}
      {step === 8 && (
        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              {blocLetters.map((l) => (
                <div
                  key={l}
                  className={`rounded-md border p-3 text-center ${
                    blocs[l].loaded
                      ? "border-green-500 bg-green-50"
                      : "border-dashed border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="text-2xl font-bold">{l}</div>
                  <div className="text-xs">{EXTERNAL_BLOCKS[l].short}</div>
                  <div className="mt-1 text-xs">
                    {blocs[l].loaded ? "✓" : "—"}
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`rounded-md p-4 ${
                readiness.mode === "full"
                  ? "bg-green-100 text-green-800"
                  : readiness.mode === "degraded"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              <p className="font-semibold">Mode d'audit : {readiness.mode.toUpperCase()}</p>
              <p className="text-sm">{readiness.reason}</p>
              {readiness.missingBlocks.length > 0 && (
                <p className="mt-1 text-xs">
                  Blocs manquants : {readiness.missingBlocks.join(", ")}
                </p>
              )}
            </div>

            {launchError && <p className="text-sm text-red-600">{launchError}</p>}

            <div className="flex gap-2">
              <Button onClick={() => setStep(7)} variant="outline">← Retour</Button>
              <Button
                onClick={handleLaunch}
                disabled={!readiness.canRun || launching}
              >
                {launching ? "Lancement…" : readiness.canRun ? "Lancer l'audit Ultra" : "Blocs insuffisants"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BlocPasteInstructions({ letter }: { letter: ExternalBlockLetter }) {
  const texts: Record<ExternalBlockLetter, string> = {
    A: "Depuis Ahrefs Webmaster Tools → Site Explorer → Overview. Copier-coller les KPIs.",
    B: "Depuis Google Search Console → Performance. Copier-coller les KPIs globaux + top requêtes.",
    C: "Depuis GA4 → Acquisition → Organic Search. Copier-coller Sessions, Users, Engagement.",
    D: "Pour chaque concurrent : Moz DA, SimilarWeb trafic, Seobility backlinks. Séparer les blocs avec '---'.",
    E: "Depuis Google Keyword Planner. Format : keyword | volume_monthly | competition",
    F: "Automatique depuis LLM Watch — rien à coller.",
  };
  return <p className="text-xs text-muted-foreground">{texts[letter]}</p>;
}

function placeholderForBloc(letter: ExternalBlockLetter): string {
  switch (letter) {
    case "A":
      return "Domain Rating: 45\nBacklinks total: 1234\nReferring Domains: 234\n...";
    case "B":
      return "Clics total: 12345\nImpressions total: 234567\nCTR moyen: 5.2%\nPosition moyenne: 12.3\n\nquery1 | 120 | 2300 | 5.2% | 8.1\nquery2 | 80 | 1800 | 4.4% | 12.4";
    case "C":
      return "Sessions organic: 5432\nUtilisateurs organic: 4200\nTaux d'engagement: 62%\nDurée moyenne session: 145 sec\nConversions organic: 87";
    case "D":
      return "Nom concurrent: Concurrent 1\nDomain: concurrent1.ch\nMoz DA: 38\n---\nNom concurrent: Concurrent 2\nDomain: concurrent2.ch\nMoz DA: 42";
    case "E":
      return "mot clé 1 | 880 | medium | 1.20\nmot clé 2 | 1200 | high\nmot clé 3 | 320 | low";
    default:
      return "";
  }
}
