"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SectorCombobox } from "@/components/ui/sector-combobox";
import { QUALITY_LEVELS } from "@/lib/constants";
import type { AuditType, AuditTheme, QualityLevel } from "@/types/audit";
import { THEME_LABELS, THEME_PRICES } from "@/types/audit";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type AuditLevel = "pre_audit" | "full" | "ultra";

interface LevelCard {
  value: AuditLevel;
  label: string;
  description: string;
  price: string;
  pages: string;
}

const LEVEL_CARDS: LevelCard[] = [
  {
    value: "pre_audit",
    label: "Pre-Audit",
    description: "Score rapide + 5 constats + 5 quick wins",
    price: "Gratuit",
    pages: "1-2 pages",
  },
  {
    value: "full",
    label: "Audit Complet",
    description: "Analyse approfondie + benchmark + plan d\u2019action",
    price: "490-1\u2019490 CHF",
    pages: "8-12 pages",
  },
  {
    value: "ultra",
    label: "Ultra Audit",
    description: "7 thematiques + benchmark croise SEO\u00d7GEO + roadmap",
    price: "4\u2019900 CHF",
    pages: "20-25 pages",
  },
];

const ALL_THEMES: AuditTheme[] = [
  "seo",
  "geo",
  "perf",
  "a11y",
  "rgesn",
  "tech",
  "contenu",
];

const THEME_ICONS: Record<AuditTheme, string> = {
  seo: "\uD83D\uDD0D",
  geo: "\uD83E\uDD16",
  perf: "\u26A1",
  a11y: "\u267F",
  rgesn: "\uD83C\uDF3F",
  tech: "\uD83D\uDD27",
  contenu: "\u270D\uFE0F",
};

type PageStep = "config" | "progress" | "redirect";

interface ThemeProgress {
  theme: AuditTheme;
  status: "pending" | "in-progress" | "done" | "error";
}

// ---------------------------------------------------------------------------
// Helper — same pattern as audit-complet
// ---------------------------------------------------------------------------

const MAX_RETRIES = 1;

async function fetchStep(
  url: string,
  body: Record<string, unknown>,
  stepLabel?: string,
  retries = MAX_RETRIES,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const label = stepLabel || url;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if ((res.status === 504 || res.status === 502) && attempt < retries) {
        console.warn(`[audit] Timeout on ${label}, retry ${attempt + 1}/${retries}...`);
        continue;
      }
      if (res.status === 504 || res.status === 502) {
        throw new Error(`Timeout serveur a l\u2019etape "${label}". Veuillez reessayer.`);
      }
      throw new Error(`Erreur serveur (${res.status}) a l\u2019etape "${label}".`);
    }

    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || `Erreur ${res.status}`);
      throw new Error(`${msg} (etape "${label}")`);
    }
    return data;
  }

  throw new Error(`Echec apres ${retries + 1} tentatives a l\u2019etape "${label}".`);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NouveauAuditPage() {
  const router = useRouter();

  // --- Step 1: config state ---
  const [url, setUrl] = useState("");
  const [sector, setSector] = useState("");
  const [level, setLevel] = useState<AuditLevel>("pre_audit");
  const [selectedThemes, setSelectedThemes] = useState<AuditTheme[]>(["seo"]);
  const [quality, setQuality] = useState<QualityLevel>("eco");
  const [semrushFile, setSemrushFile] = useState<File | null>(null);
  const [qwairyFile, setQwairyFile] = useState<File | null>(null);

  // --- Step 2: progress state ---
  const [pageStep, setPageStep] = useState<PageStep>("config");
  const [globalProgress, setGlobalProgress] = useState(0);
  const [themeProgress, setThemeProgress] = useState<ThemeProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const abortRef = useRef(false);

  const isRunning = pageStep === "progress";

  // --- Theme selection logic ---
  const handleThemeToggle = (theme: AuditTheme) => {
    if (level === "ultra") return; // all locked

    if (level === "pre_audit") {
      // single select
      setSelectedThemes([theme]);
      return;
    }

    // full — single select
    setSelectedThemes([theme]);
  };

  const handleLevelChange = (newLevel: AuditLevel) => {
    setLevel(newLevel);
    if (newLevel === "ultra") {
      setSelectedThemes([...ALL_THEMES]);
    } else {
      // Keep first selected or default to seo
      setSelectedThemes((prev) => (prev.length > 0 ? [prev[0]] : ["seo"]));
    }
  };

  // --- Computed ---
  const effectiveThemes = level === "ultra" ? ALL_THEMES : selectedThemes;
  const hasUpload = semrushFile !== null || qwairyFile !== null;
  const dataMode = hasUpload ? "B" : "A";

  const totalPrice =
    level === "pre_audit"
      ? 0
      : level === "ultra"
        ? 4900
        : selectedThemes.reduce((sum, t) => sum + (THEME_PRICES[t] ?? 0), 0);

  // --- Launch ---
  const handleLaunch = async () => {
    if (!url || effectiveThemes.length === 0) return;

    abortRef.current = false;
    setError(null);
    setPageStep("progress");

    // Build theme progress list
    const initialProgress: ThemeProgress[] = effectiveThemes.map((t) => ({
      theme: t,
      status: "pending" as const,
    }));
    setThemeProgress(initialProgress);
    setGlobalProgress(2);

    try {
      // --- Init step ---
      const initData = await fetchStep("/api/audit-direct/init", {
        url,
        sector,
        quality: level === "ultra" ? "ultra" : quality,
        level,
        themes: effectiveThemes,
      }, "Init");

      const id = initData.auditId;
      setAuditId(id);
      setGlobalProgress(10);

      if (abortRef.current) return;

      // --- Ultra uses the same step-by-step flow as complet, with quality="ultra" ---
      // (Inngest is not used — Vercel Hobby has a 10s function limit which breaks LLM steps)
      const effectiveQuality = level === "ultra" ? "ultra" : quality;

      // --- Upload CSV files if present ---
      if (semrushFile || qwairyFile) {
        const uploads: Promise<void>[] = [];
        if (semrushFile) {
          const fd = new FormData();
          fd.append("auditId", id);
          fd.append("source", "semrush");
          fd.append("file", semrushFile);
          uploads.push(
            fetch("/api/audit/upload", { method: "POST", body: fd })
              .then((r) => { if (!r.ok) console.warn("Semrush upload failed"); })
          );
        }
        if (qwairyFile) {
          const fd = new FormData();
          fd.append("auditId", id);
          fd.append("source", "qwairy");
          fd.append("file", qwairyFile);
          uploads.push(
            fetch("/api/audit/upload", { method: "POST", body: fd })
              .then((r) => { if (!r.ok) console.warn("Qwairy upload failed"); })
          );
        }
        await Promise.allSettled(uploads);
      }

      // --- Score themes ---
      const hasSeo = effectiveThemes.includes("seo");
      const hasGeo = effectiveThemes.includes("geo");
      const newThemes = effectiveThemes.filter(
        (t) => !["seo", "geo"].includes(t),
      );

      // SEO = CORE-EEAT + CITE scoring (existing flow)
      if (hasSeo || hasGeo) {
        const seoIdx = effectiveThemes.indexOf("seo");
        const geoIdx = effectiveThemes.indexOf("geo");
        if (seoIdx >= 0) {
          setThemeProgress((prev) =>
            prev.map((tp) =>
              tp.theme === "seo" ? { ...tp, status: "in-progress" } : tp,
            ),
          );
        }

        const coreEeatBatches = [
          { dimensions: ["C", "O"], label: "CORE-EEAT C,O" },
          { dimensions: ["R", "E"], label: "CORE-EEAT R,E" },
          { dimensions: ["Exp", "Ept"], label: "CORE-EEAT Exp,Ept" },
          { dimensions: ["A", "T"], label: "CORE-EEAT A,T" },
        ];

        for (let bIdx = 0; bIdx < coreEeatBatches.length; bIdx++) {
          if (abortRef.current) return;
          const batch = coreEeatBatches[bIdx];
          setGlobalProgress(10 + Math.round(((bIdx + 1) / coreEeatBatches.length) * 20));
          await fetchStep("/api/audit-direct/score", {
            auditId: id,
            dimensions: batch.dimensions,
            framework: "core_eeat",
            quality: effectiveQuality,
          }, batch.label);
        }

        if (seoIdx >= 0) {
          setThemeProgress((prev) =>
            prev.map((tp) =>
              tp.theme === "seo" ? { ...tp, status: "done" } : tp,
            ),
          );
        }

        // GEO = CITE scoring
        if (hasGeo) {
          if (geoIdx >= 0) {
            setThemeProgress((prev) =>
              prev.map((tp) =>
                tp.theme === "geo" ? { ...tp, status: "in-progress" } : tp,
              ),
            );
          }

          const citeBatches = [
            { dimensions: ["C", "I"], label: "CITE C,I" },
            { dimensions: ["T", "E"], label: "CITE T,E" },
          ];

          for (const batch of citeBatches) {
            if (abortRef.current) return;
            setGlobalProgress(35);
            await fetchStep("/api/audit-direct/score", {
              auditId: id,
              dimensions: batch.dimensions,
              framework: "cite",
              quality: effectiveQuality,
            }, batch.label);
          }

          setThemeProgress((prev) =>
            prev.map((tp) =>
              tp.theme === "geo" ? { ...tp, status: "done" } : tp,
            ),
          );
        }
      }

      // Score new themes (perf, a11y, rgesn, tech, contenu) — resilient: continue on failure
      // Ultra: score dimension-by-dimension to stay within 60s per API call
      // Non-ultra: score all dimensions of a theme in one call (faster, fits in 60s)
      for (let tIdx = 0; tIdx < newThemes.length; tIdx++) {
        if (abortRef.current) return;
        const theme = newThemes[tIdx];
        setThemeProgress((prev) =>
          prev.map((tp) =>
            tp.theme === theme ? { ...tp, status: "in-progress" } : tp,
          ),
        );
        setGlobalProgress(40 + Math.round(((tIdx + 1) / newThemes.length) * 25));

        try {
          if (effectiveQuality === "ultra") {
            // Ultra: get dimensions list then score one-by-one
            const dimRes = await fetchStep("/api/audit-direct/score-theme", {
              auditId: id,
              theme,
              quality: effectiveQuality,
              listDimensions: true,
            }, `${theme} dims`);

            const dims: string[] = dimRes.dimensions || [];
            for (const dim of dims) {
              if (abortRef.current) return;
              await fetchStep("/api/audit-direct/score-theme", {
                auditId: id,
                theme,
                dimension: dim,
                quality: effectiveQuality,
              }, `${theme}/${dim}`);
            }
          } else {
            // Non-ultra: score all dimensions in one call
            await fetchStep("/api/audit-direct/score-theme", {
              auditId: id,
              theme,
              quality: effectiveQuality,
            }, `Theme ${theme}`);
          }

          setThemeProgress((prev) =>
            prev.map((tp) =>
              tp.theme === theme ? { ...tp, status: "done" } : tp,
            ),
          );
        } catch (themeErr) {
          console.warn(`[audit] Theme ${theme} failed, continuing:`, themeErr);
          setThemeProgress((prev) =>
            prev.map((tp) =>
              tp.theme === theme ? { ...tp, status: "error" } : tp,
            ),
          );
        }
      }

      if (abortRef.current) return;

      // --- Data collection ---
      setGlobalProgress(70);
      const dataRes = await fetchStep("/api/audit-direct/data", { auditId: id, quality: effectiveQuality }, "Data SEO/GEO");

      if (abortRef.current) return;

      // --- Finalize ---
      setGlobalProgress(85);
      await fetchStep("/api/audit-direct/finalize", {
        auditId: id,
        seoData: dataRes.seoData,
        geoData: dataRes.geoData,
        competitors: dataRes.competitors,
        siteAuditData: dataRes.siteAuditData,
        quality: effectiveQuality,
      }, "Finalize");

      // Mark all themes done
      setThemeProgress((prev) => prev.map((tp) => ({ ...tp, status: "done" })));
      setGlobalProgress(100);

      // --- Redirect to results ---
      setPageStep("redirect");
      router.push(`/audit/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      // Mark current in-progress theme as error
      setThemeProgress((prev) =>
        prev.map((tp) => (tp.status === "in-progress" ? { ...tp, status: "error" } : tp)),
      );
    }
  };

  const handleRetry = () => {
    setError(null);
    setPageStep("config");
    setGlobalProgress(0);
    setThemeProgress([]);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0808] via-[#1A0F0F] to-[#2A1515] p-6 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 60% 40%, #A53535 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Nouvel Audit
          </h1>
          <p className="mt-1 text-white/60">
            Choisissez le niveau, la thematique et lancez votre audit SEO / GEO
            en quelques clics.
          </p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* STEP 1 — Configuration                                           */}
      {/* ================================================================= */}
      {pageStep === "config" && (
        <>
          {/* URL + Sector */}
          <Card>
            <CardHeader>
              <CardTitle>Site a auditer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="url">URL du site *</Label>
                  <Input
                    id="url"
                    type="text"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secteur</Label>
                  <SectorCombobox
                    value={sector}
                    onValueChange={setSector}
                    placeholder="Choisir un secteur"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Level selector */}
          <Card>
            <CardHeader>
              <CardTitle>Niveau d&apos;audit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {LEVEL_CARDS.map((lc) => {
                  const selected = level === lc.value;
                  return (
                    <button
                      key={lc.value}
                      type="button"
                      onClick={() => handleLevelChange(lc.value)}
                      className={`rounded-xl border-2 p-5 text-left transition-all ${
                        selected
                          ? "border-[#A53535] bg-[#A53535]/5 ring-1 ring-[#A53535]/30"
                          : "border-gray-200 hover:border-gray-300"
                      } cursor-pointer`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-base font-semibold">
                          {lc.label}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            lc.value === "pre_audit"
                              ? "bg-green-100 text-green-700"
                              : "bg-[#A53535]/10 text-[#8B2C2C]"
                          }`}
                        >
                          {lc.price}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {lc.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {lc.pages}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Theme selector */}
          <Card>
            <CardHeader>
              <CardTitle>
                Thematique{level === "ultra" ? "s (toutes incluses)" : ""}
              </CardTitle>
              {level === "pre_audit" && (
                <p className="text-sm text-muted-foreground">
                  Selectionnez 1 thematique pour le pre-audit gratuit.
                </p>
              )}
              {level === "full" && (
                <p className="text-sm text-muted-foreground">
                  Selectionnez 1 thematique. Le prix depend du theme choisi.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {ALL_THEMES.map((theme) => {
                  const isSelected = effectiveThemes.includes(theme);
                  const isDisabled = level === "ultra";
                  return (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => handleThemeToggle(theme)}
                      disabled={isDisabled}
                      className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                        isSelected
                          ? "border-[#A53535] bg-[#A53535]/5"
                          : "border-gray-200 hover:border-gray-300"
                      } ${isDisabled ? "cursor-default opacity-70" : "cursor-pointer"}`}
                    >
                      {/* Checkbox indicator */}
                      <div
                        className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          isSelected
                            ? "border-[#A53535] bg-[#A53535] text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      <span className="text-xl">{THEME_ICONS[theme]}</span>
                      <p className="mt-1.5 text-sm font-medium">
                        {THEME_LABELS[theme]}
                      </p>
                      {level === "full" && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {THEME_PRICES[theme].toLocaleString("fr-CH")} CHF
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upload zone — only for Complet / Ultra */}
          {(level === "full" || level === "ultra") && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CardTitle>Donnees externes (optionnel)</CardTitle>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      dataMode === "A"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {dataMode === "A"
                      ? "Mode A — Estimation"
                      : "Mode B — Donnees reelles"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Semrush dropzone */}
                  <label
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                      semrushFile
                        ? "border-green-400 bg-green-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <svg
                      className="mb-2 h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      Donnees Semrush (CSV)
                    </span>
                    {semrushFile && (
                      <span className="mt-1 text-xs text-green-600">
                        {semrushFile.name}
                      </span>
                    )}
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setSemrushFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>

                  {/* Qwairy dropzone */}
                  <label
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                      qwairyFile
                        ? "border-green-400 bg-green-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <svg
                      className="mb-2 h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      Donnees Qwairy (CSV)
                    </span>
                    {qwairyFile && (
                      <span className="mt-1 text-xs text-green-600">
                        {qwairyFile.name}
                      </span>
                    )}
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) =>
                        setQwairyFile(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quality level */}
          <Card>
            <CardHeader>
              <CardTitle>Niveau de qualite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {QUALITY_LEVELS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setQuality(q.value as QualityLevel)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      quality === q.value
                        ? "border-[#A53535] bg-[#A53535]/5"
                        : "border-gray-200 hover:border-gray-300"
                    } cursor-pointer`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{q.icon}</span>
                      <span>{q.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {q.description}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary + Launch */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    <strong>
                      {LEVEL_CARDS.find((l) => l.value === level)?.label}
                    </strong>{" "}
                    &mdash;{" "}
                    {effectiveThemes
                      .map((t) => THEME_LABELS[t])
                      .join(", ")}
                  </p>
                  {level !== "pre_audit" && (
                    <p className="text-lg font-semibold text-[#8B2C2C]">
                      {totalPrice.toLocaleString("fr-CH")} CHF
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleLaunch}
                  disabled={!url || effectiveThemes.length === 0}
                  className="bg-gradient-to-r from-[#6B1E1E] via-[#8B2C2C] to-[#A53535] px-8 text-white hover:opacity-90"
                  size="lg"
                >
                  Lancer l&apos;audit
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ================================================================= */}
      {/* STEP 2 — Progress                                                */}
      {/* ================================================================= */}
      {pageStep === "progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Audit en cours...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Global progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {level === "ultra"
                    ? (globalProgress < 10
                      ? "Initialisation..."
                      : globalProgress < 90
                        ? "Audit ultra en cours (Inngest)..."
                        : globalProgress < 100
                          ? "Finalisation..."
                          : "Termine !")
                    : (globalProgress < 10
                      ? "Initialisation..."
                      : globalProgress < 65
                        ? "Scoring des criteres..."
                        : globalProgress < 85
                          ? "Collecte des donnees SEO/GEO..."
                          : globalProgress < 100
                            ? "Finalisation..."
                            : "Termine !")}
                </span>
                <span className="font-medium tabular-nums">
                  {globalProgress}%
                </span>
              </div>
              <Progress value={globalProgress} />
            </div>

            {/* Theme step list */}
            <div className="space-y-2">
              {themeProgress.map((tp) => (
                <div
                  key={tp.theme}
                  className="flex items-center gap-3 rounded-lg border px-4 py-2.5"
                >
                  {/* Status icon */}
                  {tp.status === "pending" && (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  {tp.status === "in-progress" && (
                    <div className="h-4 w-4 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
                  )}
                  {tp.status === "done" && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                      <svg
                        className="h-2.5 w-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                  {tp.status === "error" && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500">
                      <svg
                        className="h-2.5 w-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </div>
                  )}

                  <span className="text-sm">
                    {THEME_ICONS[tp.theme]} {THEME_LABELS[tp.theme]}
                  </span>
                  <span className="ml-auto text-xs capitalize text-muted-foreground">
                    {tp.status === "pending" && "En attente"}
                    {tp.status === "in-progress" && "En cours..."}
                    {tp.status === "done" && "Termine"}
                    {tp.status === "error" && "Erreur"}
                  </span>
                </div>
              ))}
            </div>

            {/* Spinner message */}
            {!error && (
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
                <p className="text-xs text-muted-foreground">
                  {level === "ultra"
                    ? "Audit ultra en cours... Temps estime : 10-15 minutes. Ne fermez pas cette page."
                    : "Chaque etape prend 10-30 secondes. Ne fermez pas cette page."}
                </p>
              </div>
            )}

            {/* Error + retry */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">{error}</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={handleRetry}
                >
                  Reessayer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* STEP 3 — Redirect (brief loading state)                          */}
      {/* ================================================================= */}
      {pageStep === "redirect" && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
              <span className="text-muted-foreground">
                Redirection vers les resultats...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
