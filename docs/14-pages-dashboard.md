# 14 — Pages Dashboard

**Module** : 14 — Pages Dashboard
**Version** : 2.1 (tag `v2.1-release`)

Pages Next.js authentifiées : wizard Ultra, audit-complet, audit-express, LLM Watch dashboard + admin, benchmarks, classements, settings, siteaudit.

---

## `src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const generalSans = localFont({
  src: [
    { path: "../fonts/GeneralSans-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/GeneralSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/GeneralSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/GeneralSans-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/GeneralSans-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-general-sans",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "sans-serif"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MCVA Audit — Plateforme SEO/GEO",
  description: "Rendre votre entreprise citable par l'IA. Audit SEO et GEO pour optimiser la visibilite de votre marque.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${generalSans.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

```


## `src/app/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-dm-sans), -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: var(--font-dm-mono), 'SF Mono', monospace;
  --font-heading: var(--font-general-sans), -apple-system, sans-serif;
  --font-display: var(--font-general-sans), -apple-system, sans-serif;
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  /* MCVA Red Spectrum v3.0 */
  --color-rouge-vif: #A53535;
  --color-rouge-sombre: #7A2525;
  --color-bordeaux: #6B1E1E;
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

/* ── MCVA Consulting SA — Charte graphique v3.0 ── */
:root {
  /* Pure White #FFFFFF */
  --background: oklch(1 0 0);
  /* Ink #0E0E0E */
  --foreground: oklch(0.13 0 0);
  /* White #FFFFFF */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.13 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.13 0 0);
  /* Swiss Red #8B2C2C */
  --primary: oklch(0.38 0.12 25);
  --primary-foreground: oklch(1 0 0);
  /* Neutral light */
  --secondary: oklch(0.95 0 0);
  --secondary-foreground: oklch(0.13 0 0);
  /* Neutral muted */
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.45 0 0);
  /* Neutral accent */
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.13 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  /* Neutral border */
  --border: oklch(0.92 0 0);
  --input: oklch(0.92 0 0);
  --ring: oklch(0.38 0.12 25);
  /* Chart: MCVA spectrum */
  --chart-1: oklch(0.38 0.12 25);
  --chart-2: oklch(0.55 0.16 30);
  --chart-3: oklch(0.68 0.12 35);
  --chart-4: oklch(0.78 0.08 40);
  --chart-5: oklch(0.88 0.04 45);
  --radius: 0.625rem;
  /* Sidebar */
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.13 0 0);
  --sidebar-primary: oklch(0.38 0.12 25);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.13 0 0);
  --sidebar-border: oklch(0.92 0 0);
  --sidebar-ring: oklch(0.38 0.12 25);
}

.dark {
  /* Abyss #0A0808 */
  --background: oklch(0.12 0.005 25);
  --foreground: oklch(0.975 0.005 85);
  /* Dark card */
  --card: oklch(0.18 0.005 25);
  --card-foreground: oklch(0.975 0.005 85);
  --popover: oklch(0.18 0.005 25);
  --popover-foreground: oklch(0.975 0.005 85);
  /* Swiss Red stays */
  --primary: oklch(0.50 0.14 25);
  --primary-foreground: oklch(0.975 0.005 85);
  --secondary: oklch(0.22 0.005 25);
  --secondary-foreground: oklch(0.975 0.005 85);
  --muted: oklch(0.22 0.005 25);
  --muted-foreground: oklch(0.65 0.005 85);
  --accent: oklch(0.22 0.005 25);
  --accent-foreground: oklch(0.975 0.005 85);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.25 0.005 25);
  --input: oklch(0.25 0.005 25);
  --ring: oklch(0.50 0.14 25);
  --chart-1: oklch(0.50 0.14 25);
  --chart-2: oklch(0.55 0.16 30);
  --chart-3: oklch(0.68 0.12 35);
  --chart-4: oklch(0.78 0.08 40);
  --chart-5: oklch(0.88 0.04 45);
  --sidebar: oklch(0.18 0.005 25);
  --sidebar-foreground: oklch(0.975 0.005 85);
  --sidebar-primary: oklch(0.50 0.14 25);
  --sidebar-primary-foreground: oklch(0.975 0.005 85);
  --sidebar-accent: oklch(0.22 0.005 25);
  --sidebar-accent-foreground: oklch(0.975 0.005 85);
  --sidebar-border: oklch(0.25 0.005 25);
  --sidebar-ring: oklch(0.50 0.14 25);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground antialiased;
  }
  html {
    @apply font-sans scroll-smooth;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    letter-spacing: -0.01em;
  }
}

/* MCVA Skeleton / loading pulse */
@keyframes mcva-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}
.mcva-skeleton {
  animation: mcva-pulse 1.5s ease-in-out infinite;
  background: linear-gradient(90deg, var(--muted) 0%, oklch(0.93 0 0) 50%, var(--muted) 100%);
  background-size: 200% 100%;
}

/* Tabular nums for scores */
.tabular-nums { font-variant-numeric: tabular-nums; }

```


## `src/middleware.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Supabase Auth Middleware — protège les routes dashboard.
 * Redirige vers /login si l'utilisateur n'est pas authentifié.
 */
export async function middleware(request: NextRequest) {
  // Skip auth check if Supabase is not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[middleware] Supabase env vars missing, skipping auth");
    return NextResponse.next();
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect to login if not authenticated (except for auth pages and API routes)
    if (
      !user &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/api/inngest")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Redirect to dashboard if authenticated and on login page
    if (user && request.nextUrl.pathname.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (error) {
    console.error("[middleware] Auth check failed:", error);
    // On error, redirect to login rather than crashing
    if (!request.nextUrl.pathname.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - api routes (handled by their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};

```


## `src/app/(dashboard)/audit-complet/page.tsx`

```tsx
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
  | "themes"
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
  themes: "Scoring thematique (Perf, A11y, Tech, Contenu, Eco)...",
  data: "Collecte donnees SEO, GEO et audit technique...",
  finalize: "Finalisation, plan d'action et sauvegarde...",
  completed: "Audit termine !",
  error: "",
};

const STEP_PROGRESS: Record<AuditStep, number> = {
  idle: 0,
  init: 4,
  scoring_1: 10,
  scoring_2: 18,
  scoring_3: 26,
  scoring_4: 34,
  scoring_5: 42,
  scoring_6: 50,
  themes: 62,
  data: 78,
  finalize: 90,
  completed: 100,
  error: 0,
};

const MAX_RETRIES = 2;

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
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(310_000),
      });
    } catch (networkErr) {
      if (attempt < retries) {
        console.warn(`[audit] Network error on ${label}, retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw new Error(`Erreur reseau a l'etape "${label}". Verifiez votre connexion et reessayez.`);
    }

    // Handle Vercel timeout / non-JSON errors
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if ((res.status === 504 || res.status === 502) && attempt < retries) {
        console.warn(`[audit] Timeout on ${label}, retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
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

      // ─── Step 7: Score new themes (perf, a11y, tech, contenu, rgesn) ───
      setStep("themes");
      setProgress(STEP_PROGRESS.themes);
      const newThemes = ["perf", "a11y", "tech", "contenu", "rgesn"];
      for (let tIdx = 0; tIdx < newThemes.length; tIdx++) {
        const theme = newThemes[tIdx];
        setProgress(50 + Math.round(((tIdx + 1) / newThemes.length) * 14));
        try {
          await fetchStep("/api/audit-direct/score-theme", {
            auditId: id,
            theme,
            quality,
          }, `Theme ${theme}`);
        } catch (themeErr) {
          // Résilient : on continue même si un thème échoue
          console.warn(`[audit-complet] Theme ${theme} failed:`, themeErr);
        }
      }

      // ─── Step 8: Data collection (SEO + GEO + site audit) ───
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
          style={{ backgroundImage: "radial-gradient(circle at 20% 70%, #A53535 0%, transparent 60%)" }}
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
                <div className="w-4 h-4 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
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

```


## `src/app/(dashboard)/audit-express/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SectorCombobox } from "@/components/ui/sector-combobox";
import { AuditResults } from "@/components/audit/audit-results";
import type { AuditScores, AuditItem, AuditAction } from "@/types/audit";
import { POLLING_TIMEOUT_MS, QUALITY_LEVELS } from "@/lib/constants";
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
      `/nouveau-audit?url=${encodeURIComponent(url)}&sector=${encodeURIComponent(sector)}&quality=${quality}&from=${auditId}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0808] via-[#1A0F0F] to-[#2A1515] p-6 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 30%, #A53535 0%, transparent 60%)" }}
        />
        <div className="relative">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Audit Express</h1>
          <p className="text-white/60 mt-1">
            Score SEO + GEO en moins de 3 minutes — 20 criteres CORE-EEAT
            analyses sur 8 dimensions.
          </p>
        </div>
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

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#8B2C2C]/10 via-[#A53535]/10 to-[#7A2525]/10 p-6 ring-1 ring-[#A53535]/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold">
                  Passez a l&apos;audit complet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  80 criteres CORE-EEAT + 40 criteres CITE + plan d&apos;action
                  priorise + benchmark concurrentiel
                </p>
              </div>
              <Button onClick={() => handleLaunchFull()}>
                Lancer l&apos;audit complet
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

```


## `src/app/(dashboard)/audit-ultra/new/page.tsx`

```tsx
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
import { QUALITY_LEVELS } from "@/lib/constants";
import { SectorCombobox } from "@/components/ui/sector-combobox";
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
              <SectorCombobox
                value={sector}
                onValueChange={setSector}
                placeholder="Rechercher un secteur (ex: fiduciaire, horlogerie, hotel...)"
                className="w-full"
              />
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

```


## `src/app/(dashboard)/audit/[id]/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditResults } from "@/components/audit/audit-results";
import type { Audit, AuditScores, AuditItem, AuditAction } from "@/types/audit";

type PageState = "loading" | "ready" | "error";

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [state, setState] = useState<PageState>("loading");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [scores, setScores] = useState<AuditScores | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [actions, setActions] = useState<AuditAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auditId) return;

    async function fetchAudit() {
      try {
        const res = await fetch(`/api/audit?id=${auditId}`);
        if (!res.ok) {
          throw new Error("Impossible de charger l'audit");
        }
        const data = await res.json();

        if (!data.audit) {
          throw new Error("Audit introuvable");
        }

        setAudit(data.audit);
        setScores(data.scores || null);
        setItems(data.items || []);
        setActions(data.actions || []);
        setState("ready");
      } catch (e: any) {
        setError(e.message);
        setState("error");
      }
    }

    fetchAudit();
  }, [auditId]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Chargement de l&apos;audit...</p>
      </div>
    );
  }

  if (state === "error" || !audit) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">{error || "Audit introuvable"}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = audit.status === "completed" && scores;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0808] via-[#1A0F0F] to-[#2A1515] p-6 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 70%, #A53535 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-3">
            <Link href="/" className="hover:text-white/80 transition-colors">
              Tableau de bord
            </Link>
            <span>/</span>
            <span className="text-white/70">Audit</span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {audit.domain}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className="bg-white/10 text-white/80 border-white/20"
                >
                  {audit.audit_type === "express" ? "Express" : audit.audit_type === "ultra" ? "Ultra" : "Complet"}
                </Badge>
                <StatusBadge status={audit.status} />
                <span className="text-sm text-white/50">
                  {new Date(audit.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {audit.sector && (
                  <span className="text-sm text-white/50">
                    — {audit.sector}
                  </span>
                )}
              </div>
            </div>

            {isCompleted && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() =>
                    window.open(`/api/audit/pdf?id=${auditId}&format=html`, "_blank")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mr-2"
                  >
                    <path
                      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Telecharger PDF
                </Button>
                {audit.audit_type === "express" && (
                  <Link
                    href={`/nouveau-audit?url=${encodeURIComponent(audit.url)}&sector=${encodeURIComponent(audit.sector || "")}&from=${audit.id}`}
                  >
                    <Button className="bg-white text-[#0A0808] hover:bg-white/90">
                      Lancer l&apos;audit complet
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status messages for non-completed audits */}
      {audit.status === "processing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
              <p className="text-muted-foreground">
                Audit en cours de traitement...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {audit.status === "error" && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">
              Cet audit a rencontre une erreur.
            </p>
            <Link
              href={audit.audit_type === "ultra"
                ? `/nouveau-audit?url=${encodeURIComponent(audit.url)}&sector=${encodeURIComponent(audit.sector || "")}`
                : `/audit-${audit.audit_type === "express" ? "express" : "complet"}?url=${encodeURIComponent(audit.url)}&sector=${encodeURIComponent(audit.sector || "")}`}
            >
              <Button variant="outline" className="mt-3">
                Relancer l&apos;audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {isCompleted && scores && (
        <AuditResults
          scores={scores}
          items={items}
          actions={actions}
          auditType={audit.audit_type as "express" | "full" | "ultra"}
          isSpa={audit.is_spa}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; classes: string }
  > = {
    pending: {
      label: "En attente",
      classes: "bg-white/10 text-white/60 border-white/20",
    },
    processing: {
      label: "En cours",
      classes: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    completed: {
      label: "Termine",
      classes: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    error: {
      label: "Erreur",
      classes: "bg-red-500/20 text-red-300 border-red-500/30",
    },
  };
  const { label, classes } = config[status] || config.pending;
  return (
    <Badge variant="outline" className={classes}>
      {label}
    </Badge>
  );
}

```


## `src/app/(dashboard)/benchmarks/page.tsx`

```tsx
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

```


## `src/app/(dashboard)/classements/page.tsx`

```tsx
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
      "bg-gradient-to-br from-[#A53535] to-[#8B2C2C] text-white shadow-sm",
      "bg-gradient-to-br from-[#7A2525] to-[#A53535] text-white shadow-sm",
      "bg-gradient-to-br from-[#5C1A1A] to-[#7A2525] text-white shadow-sm",
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
        ? "text-[#A53535]"
        : score >= 25
          ? "text-[#A83D33]"
          : "text-[#8B2C2C]";
  return <span className={`font-bold tabular-nums ${color}`}>{score}</span>;
}

```


## `src/app/(dashboard)/layout.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/nouveau-audit", label: "Nouvel Audit" },
  { href: "/audit-ultra/new", label: "Audit Ultra" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/llmwatch", label: "LLM Watch" },
  { href: "/classements", label: "Classements" },
  { href: "/settings/integrations", label: "Intégrations" },
];

/**
 * Logo Tessellation MCVA v2.3
 * Grille 2x2 de carres avec degrade diagonal du spectre signature.
 * Le carre bas-droite contient le drapeau suisse (croix blanche).
 * Micro-connexions Blush entre les blocs.
 */
function TessellationMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tessellation-g" x1="0" y1="0" x2="84" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A1515" />
          <stop offset="20%" stopColor="#6B2020" />
          <stop offset="40%" stopColor="#8B2C2C" />
          <stop offset="60%" stopColor="#A83D33" />
          <stop offset="80%" stopColor="#C44A38" />
          <stop offset="100%" stopColor="#A53535" />
        </linearGradient>
      </defs>
      {/* 4 carres de la grille */}
      <rect x="2" y="2" width="28" height="28" rx="4" fill="url(#tessellation-g)" />
      <rect x="34" y="2" width="28" height="28" rx="4" fill="url(#tessellation-g)" />
      <rect x="2" y="34" width="28" height="28" rx="4" fill="url(#tessellation-g)" />
      <rect x="34" y="34" width="28" height="28" rx="4" fill="url(#tessellation-g)" />
      {/* Croix suisse dans le carre bas-droite */}
      <rect x="44" y="38" width="8" height="20" rx="1.5" fill="#F0E8E4" />
      <rect x="38" y="44" width="20" height="8" rx="1.5" fill="#F0E8E4" />
      {/* Micro-connexions Blush */}
      <line x1="30" y1="16" x2="34" y2="16" stroke="#A53535" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
      <line x1="16" y1="30" x2="16" y2="34" stroke="#A53535" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
      <line x1="30" y1="48" x2="34" y2="48" stroke="#A53535" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
      <line x1="48" y1="30" x2="48" y2="34" stroke="#A53535" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
      <circle cx="31" cy="16" r="1.5" fill="#A53535" opacity="0.35" />
      <circle cx="16" cy="31" r="1.5" fill="#A53535" opacity="0.35" />
      <circle cx="31" cy="48" r="1.5" fill="#A53535" opacity="0.45" />
      <circle cx="48" cy="31" r="1.5" fill="#A53535" opacity="0.45" />
    </svg>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Header — dark abyss style matching mcva-site */}
      <header className="bg-[#0A0808] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Tessellation Mark v2.3 + Wordmark */}
            <Link href="/" className="inline-flex items-start gap-3 group">
              <TessellationMark size={36} />
              <div className="flex flex-col justify-between leading-none h-[36px]">
                <span className="font-display font-bold text-lg tracking-[0.12em] text-white leading-none">
                  MCVA
                </span>
                <div className="w-full h-[1.5px] bg-[#8B2C2C]" />
                <span className="font-display font-medium text-[9px] tracking-[0.25em] uppercase whitespace-nowrap text-white/40 leading-none">
                  Audit Platform
                </span>
              </div>
            </Link>
            <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-[13px] font-display font-medium uppercase tracking-widest transition-colors whitespace-nowrap ${
                      isActive
                        ? "text-[#A53535]"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-display font-medium tracking-[0.2em] uppercase text-white/50">
              Palier 1
            </span>
          </div>
        </div>
        {/* MCVA spectrum accent bar */}
        <div
          className="h-[3px]"
          style={{
            background: "linear-gradient(90deg, #4A1515 0%, #8B2C2C 20%, #A53535 45%, #8B2C2C 65%, #7A2525 80%, #5C1A1A 100%)",
          }}
        />
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TessellationMark size={20} />
            <span>MCVA Consulting SA</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Plateforme Audit SEO/GEO
          </p>
        </div>
      </footer>
    </div>
  );
}

```


## `src/app/(dashboard)/llmwatch/admin/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LlmWatchClient, MonitoringFrequency } from "@/lib/llmwatch/types";

type ViewState = "list" | "create" | "queries";

const FREQUENCY_OPTIONS: { value: MonitoringFrequency; label: string; description: string }[] = [
  { value: "weekly", label: "Hebdomadaire", description: "Chaque lundi" },
  { value: "monthly", label: "Mensuel", description: "1x par mois" },
  { value: "quarterly", label: "Trimestriel", description: "1x par trimestre" },
  { value: "manual", label: "Manuel", description: "Sur demande uniquement" },
];

const FREQUENCY_LABELS: Record<MonitoringFrequency, string> = {
  weekly: "Hebdo",
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  manual: "Manuel",
};

const FREQUENCY_COLORS: Record<MonitoringFrequency, "default" | "secondary" | "outline" | "destructive"> = {
  weekly: "default",
  monthly: "secondary",
  quarterly: "outline",
  manual: "outline",
};

export default function LlmWatchAdminPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("list");
  const [clients, setClients] = useState<LlmWatchClient[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [queriesFr, setQueriesFr] = useState("");
  const [competitorsText, setCompetitorsText] = useState("");
  const [frequency, setFrequency] = useState<MonitoringFrequency>("manual");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual trigger state
  const [runningClientId, setRunningClientId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ clientId: string; message: string; success: boolean } | null>(null);

  // LW-008: Query editor state
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState("");
  const [existingQueries, setExistingQueries] = useState<{ id: string; text_fr: string; active: boolean }[]>([]);
  const [newQueriesText, setNewQueriesText] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importingQueries, setImportingQueries] = useState(false);
  const [queryMessage, setQueryMessage] = useState<{ text: string; success: boolean } | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/llmwatch/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const queries = queriesFr
      .split("\n")
      .filter((q) => q.trim())
      .map((q) => ({ text_fr: q.trim() }));

    const competitors = competitorsText
      .split("\n")
      .filter((c) => c.trim())
      .map((c) => ({
        name: c.trim(),
        keywords: c.trim().toLowerCase().split(/\s+/),
      }));

    try {
      const res = await fetch("/api/llmwatch/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sector,
          location,
          contact_email: contactEmail,
          monitoring_frequency: frequency,
          queries,
          competitors,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      // Reset and go back to list
      setName("");
      setSector("");
      setLocation("");
      setContactEmail("");
      setQueriesFr("");
      setCompetitorsText("");
      setFrequency("manual");
      setView("list");
      fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  };

  const handleRunMonitoring = async (clientId: string, clientName: string) => {
    setRunningClientId(clientId);
    setRunResult(null);

    try {
      const res = await fetch("/api/monitoring/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      const data = await res.json();

      if (data.success) {
        setRunResult({
          clientId,
          message: `Score GEO: ${data.scoreGeo}/100 (${data.duration})`,
          success: true,
        });
        // Refresh client list to show updated last_monitored_at
        fetchClients();
      } else {
        setRunResult({
          clientId,
          message: data.error || "Erreur inconnue",
          success: false,
        });
      }
    } catch (err) {
      setRunResult({
        clientId,
        message: err instanceof Error ? err.message : "Erreur reseau",
        success: false,
      });
    } finally {
      setRunningClientId(null);
    }
  };

  // LW-008: Open query editor for a client
  const openQueryEditor = async (clientId: string, clientName: string) => {
    setEditingClientId(clientId);
    setEditingClientName(clientName);
    setNewQueriesText("");
    setReplaceExisting(false);
    setQueryMessage(null);

    // Fetch existing queries
    try {
      const res = await fetch(`/api/llmwatch/queries?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setExistingQueries(data.queries || []);
      }
    } catch {
      setExistingQueries([]);
    }

    setView("queries");
  };

  const handleImportQueries = async () => {
    if (!editingClientId || !newQueriesText.trim()) return;
    setImportingQueries(true);
    setQueryMessage(null);

    const queries = newQueriesText
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    try {
      const res = await fetch("/api/llmwatch/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: editingClientId,
          queries,
          replaceExisting,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setQueryMessage({
          text: `${data.imported} requetes importees${data.replaced ? " (ancien set desactive)" : ""}`,
          success: true,
        });
        setNewQueriesText("");
        // Refresh queries list
        const refetch = await fetch(`/api/llmwatch/queries?clientId=${editingClientId}`);
        if (refetch.ok) {
          const d = await refetch.json();
          setExistingQueries(d.queries || []);
        }
      } else {
        setQueryMessage({ text: data.error || "Erreur", success: false });
      }
    } catch (err) {
      setQueryMessage({ text: err instanceof Error ? err.message : "Erreur", success: false });
    } finally {
      setImportingQueries(false);
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    try {
      await fetch("/api/llmwatch/queries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queryId }),
      });
      setExistingQueries((prev) => prev.filter((q) => q.id !== queryId));
    } catch {
      // ignore
    }
  };

  // LW-008: Query editor view
  if (view === "queries") {
    const activeQueries = existingQueries.filter((q) => q.active);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Requetes — {editingClientName}</h1>
          <Button variant="outline" onClick={() => setView("list")}>
            Retour
          </Button>
        </div>

        {/* Existing queries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Requetes actives ({activeQueries.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeQueries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune requete active.</p>
            ) : (
              <div className="space-y-2">
                {activeQueries.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground min-w-[24px]">{i + 1}.</span>
                    <span className="flex-1 font-mono text-xs">{q.text_fr}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-6 px-2"
                      onClick={() => handleDeleteQuery(q.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import new queries */}
        <Card>
          <CardHeader>
            <CardTitle>Importer des requetes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nouvelles requetes (une par ligne)</Label>
              <textarea
                className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={newQueriesText}
                onChange={(e) => setNewQueriesText(e.target.value)}
                placeholder={`Quelle est la meilleure fiduciaire a Lausanne ?\nA qui confier ma comptabilite en Suisse romande ?`}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="replaceExisting"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="replaceExisting" className="text-sm font-normal">
                Remplacer les requetes existantes (desactive l&apos;ancien set)
              </Label>
            </div>

            {queryMessage && (
              <p className={`text-sm font-medium ${queryMessage.success ? "text-green-600" : "text-destructive"}`}>
                {queryMessage.text}
              </p>
            )}

            <Button
              onClick={handleImportQueries}
              disabled={importingQueries || !newQueriesText.trim()}
            >
              {importingQueries ? "Import..." : `Importer ${newQueriesText.split("\n").filter((l) => l.trim()).length} requetes`}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nouveau client LLM Watch</h1>
          <Button variant="outline" onClick={() => setView("list")}>
            Retour
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de l&apos;entreprise</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Fiduciaire Rochat SA"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email de contact</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@rochat.ch"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Secteur</Label>
                  <Input
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="fiduciaire"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localisation</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lausanne, Suisse"
                  />
                </div>
              </div>

              {/* Frequency selector */}
              <div className="space-y-2">
                <Label>Frequence de monitoring</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFrequency(opt.value)}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${
                        frequency === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Requetes metier (une par ligne, en francais)</Label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={queriesFr}
                  onChange={(e) => setQueriesFr(e.target.value)}
                  placeholder={`Quelle est la meilleure fiduciaire a Lausanne ?\nA qui confier ma comptabilite en Suisse romande ?\nQuels sont les meilleurs experts-comptables du canton de Vaud ?`}
                />
              </div>

              <div className="space-y-2">
                <Label>Concurrents a surveiller (un par ligne)</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={competitorsText}
                  onChange={(e) => setCompetitorsText(e.target.value)}
                  placeholder={`Fidulex SA\nCompta Plus Lausanne\nBDO Suisse`}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}

              <Button type="submit" disabled={creating || !name || !contactEmail}>
                {creating ? "Creation..." : "Creer le client"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLM Watch — Administration</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des clients et suivi des collectes.
          </p>
        </div>
        <Button onClick={() => setView("create")}>Nouveau client</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">Aucun client LLM Watch.</p>
            <Button onClick={() => setView("create")}>
              Ajouter votre premier client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <Card
              key={c.id}
              className="hover:border-primary/30 transition-colors"
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => router.push(`/llmwatch/dashboard/${c.id}`)}
                  >
                    <h3 className="font-semibold">{c.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {c.sector} — {c.location}
                    </p>
                    {c.last_monitored_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Dernier scan : {new Date(c.last_monitored_at).toLocaleDateString("fr-CH")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={FREQUENCY_COLORS[c.monitoring_frequency || "monthly"]}>
                      {FREQUENCY_LABELS[c.monitoring_frequency || "monthly"]}
                    </Badge>
                    <Badge variant={c.active ? "default" : "secondary"}>
                      {c.active ? "Actif" : "Inactif"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openQueryEditor(c.id, c.name);
                      }}
                    >
                      Requetes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={runningClientId === c.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunMonitoring(c.id, c.name);
                      }}
                    >
                      {runningClientId === c.id ? "Analyse..." : "Lancer maintenant"}
                    </Button>
                  </div>
                </div>
                {/* Show run result for this client */}
                {runResult && runResult.clientId === c.id && (
                  <div
                    className={`mt-2 text-sm px-3 py-2 rounded-md ${
                      runResult.success
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {runResult.message}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

```


## `src/app/(dashboard)/llmwatch/dashboard/[clientId]/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreCard } from "@/components/llmwatch/ScoreCard";
import { ScoreChart } from "@/components/llmwatch/ScoreChart";
import { LlmBreakdown } from "@/components/llmwatch/LlmBreakdown";
import { LanguageBreakdown } from "@/components/llmwatch/LanguageBreakdown";
import { BenchmarkTable } from "@/components/llmwatch/BenchmarkTable";
import { CompetitiveGap } from "@/components/llmwatch/CompetitiveGap";
import { CitationBlock } from "@/components/llmwatch/CitationBlock";
import { AlertBadge } from "@/components/llmwatch/AlertBadge";
import { RecommendationCard } from "@/components/llmwatch/RecommendationCard";
import { QueryResultsTable } from "@/components/llmwatch/QueryResultsTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  LlmWatchScore,
  LlmWatchCitation,
  LlmWatchAlert,
  LlmWatchRecommendation,
  MonitoringFrequency,
} from "@/lib/llmwatch/types";

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
  const [recommendations, setRecommendations] = useState<LlmWatchRecommendation[]>([]);
  const [detailedResults, setDetailedResults] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<{
    current: number;
    total: number;
    currentQuery: string;
    errors: string[];
  } | null>(null);
  const [runMessage, setRunMessage] = useState<{ text: string; success: boolean } | null>(null);

  const handleRunMonitoring = async () => {
    setRunning(true);
    setRunMessage(null);
    setRunProgress(null);

    const startedAt = new Date().toISOString();

    try {
      // Step 1: Fetch queries list
      const queriesRes = await fetch(`/api/monitoring/queries?clientId=${clientId}`);
      if (!queriesRes.ok) {
        throw new Error("Impossible de charger les requetes");
      }
      const { queries: queryList, client: clientInfo, competitors: clientCompetitors, knownFacts: clientFacts } = await queriesRes.json();

      if (!queryList?.length) {
        setRunMessage({ text: "Aucune requete active pour ce client", success: false });
        setRunning(false);
        return;
      }

      const brandKeywords = clientInfo.brand_keywords || [clientInfo.name, clientInfo.domain];
      const brandName = clientInfo.name;
      const errors: string[] = [];

      // Step 2: Run each query sequentially (each call ~5-10s, 4 LLMs in parallel)
      for (let i = 0; i < queryList.length; i++) {
        const q = queryList[i];
        setRunProgress({
          current: i + 1,
          total: queryList.length,
          currentQuery: q.text_fr.length > 60 ? q.text_fr.slice(0, 57) + "..." : q.text_fr,
          errors,
        });

        try {
          const res = await fetch("/api/monitoring/run-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId,
              queryId: q.id,
              queryText: q.text_fr,
              brandName,
              brandKeywords,
              competitors: clientCompetitors || [],
              knownFacts: clientFacts || {},
              language: "fr",
            }),
            signal: AbortSignal.timeout(45000), // 45s safety timeout
          });

          const data = await res.json();
          if (!data.success) {
            errors.push(`Q${i + 1}: ${data.error}`);
          }
        } catch (err) {
          errors.push(`Q${i + 1}: ${err instanceof Error ? err.message : "Erreur"}`);
        }

        // Small delay between queries to respect rate limits
        if (i < queryList.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Step 3: Finalize — aggregate scores
      setRunProgress((prev) => prev ? { ...prev, currentQuery: "Calcul du Score GEO..." } : null);

      const finalRes = await fetch("/api/monitoring/finalize-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, startedAt }),
      });

      const finalData = await finalRes.json();

      if (finalData.success) {
        const errText = errors.length > 0 ? ` (${errors.length} erreur${errors.length > 1 ? "s" : ""})` : "";
        setRunMessage({
          text: `Score GEO : ${finalData.scoreGeo}/100 — Presence ${finalData.breakdown.presence} | Exactitude ${finalData.breakdown.exactitude} | Sentiment ${finalData.breakdown.sentiment} | Recommandation ${finalData.breakdown.recommendation}${errText}`,
          success: true,
        });
        fetchData(); // refresh dashboard
      } else {
        setRunMessage({ text: finalData.error || "Erreur de finalisation", success: false });
      }
    } catch (err) {
      setRunMessage({ text: err instanceof Error ? err.message : "Erreur reseau", success: false });
    } finally {
      setRunning(false);
      setRunProgress(null);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [clientRes, scoresRes, citationsRes, benchmarkRes, recoRes, resultsRes] =
        await Promise.all([
          fetch(`/api/llmwatch/clients?id=${clientId}`),
          fetch(`/api/llmwatch/scores?clientId=${clientId}&limit=12`),
          fetch(`/api/llmwatch/citations?clientId=${clientId}&cited=true&limit=10`),
          fetch(`/api/llmwatch/benchmark?clientId=${clientId}`),
          fetch(`/api/llmwatch/recommendations?clientId=${clientId}`),
          fetch(`/api/llmwatch/results?clientId=${clientId}`),
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
      if (recoRes.ok) {
        const data = await recoRes.json();
        setRecommendations(data.recommendations || []);
      }
      if (resultsRes.ok) {
        const data = await resultsRes.json();
        setDetailedResults(data.results || []);
        setQueries(data.queries || []);
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
  const delta =
    latestScore && previousScore
      ? Math.round(Number(latestScore.score) - Number(previousScore.score))
      : undefined;

  // Chart data (oldest first)
  const chartData = [...scores]
    .reverse()
    .map((s) => ({ week: s.week_start, score: Number(s.score) }));

  // Benchmark entries
  const benchmarkEntries = [
    ...(latestScore
      ? [
          {
            name: client?.name || "Vous",
            score: Number(latestScore.score),
            isClient: true,
          },
        ]
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

  // Score by lang (parse if string)
  const scoreByLang = latestScore?.score_by_lang
    ? typeof latestScore.score_by_lang === "string"
      ? JSON.parse(latestScore.score_by_lang)
      : latestScore.score_by_lang
    : null;

  // Score by LLM (parse if string)
  const scoreByLlm = latestScore?.score_by_llm
    ? typeof latestScore.score_by_llm === "string"
      ? JSON.parse(latestScore.score_by_llm)
      : latestScore.score_by_llm
    : null;

  // Citation stats
  const totalResults = detailedResults.length;
  const citedResults = detailedResults.filter((r: any) => r.cited).length;
  const rankedResults = detailedResults.filter((r: any) => r.rank && r.rank <= 3).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {client?.name || "Client"} — LLM Watch
          </h1>
          <p className="text-muted-foreground mt-1">
            {client?.sector} / GEO — {client?.location}
          </p>
          {client?.last_monitored_at && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Dernier scan : {new Date(client.last_monitored_at).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {({ weekly: "Hebdo", monthly: "Mensuel", quarterly: "Trimestriel", manual: "Manuel" } as Record<string, string>)[client?.monitoring_frequency || "manual"] || "Manuel"}
          </Badge>
          {latestScore && (
            <Button
              variant="outline"
              onClick={() => window.open(`/api/llmwatch/pdf?clientId=${clientId}&format=pdf`, "_blank")}
            >
              Exporter PDF
            </Button>
          )}
          <Button
            onClick={handleRunMonitoring}
            disabled={running}
          >
            {running ? "Analyse en cours..." : "Lancer l'analyse"}
          </Button>
        </div>
      </div>

      {/* Progress bar during analysis */}
      {runProgress && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Requete {runProgress.current}/{runProgress.total}
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round((runProgress.current / runProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 mb-2">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${(runProgress.current / runProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {runProgress.currentQuery}
            </p>
            {runProgress.errors.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                {runProgress.errors.length} erreur{runProgress.errors.length > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Run result feedback */}
      {runMessage && !runProgress && (
        <div className={`text-sm px-4 py-3 rounded-md ${
          runMessage.success
            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
        }`}>
          {runMessage.text}
        </div>
      )}

      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ScoreCard
          label="Score global"
          value={latestScore ? Math.round(Number(latestScore.score)) : "-"}
          delta={delta}
          size="lg"
        />
        <ScoreCard
          label="Taux de citation"
          value={
            latestScore
              ? `${Math.round(Number(latestScore.citation_rate))}%`
              : "-"
          }
        />
        <ScoreCard label="Top 3" value={rankedResults} />
        <ScoreCard label="Semaines suivies" value={scores.length} />
        <ScoreCard label="Alertes actives" value={alerts.length} />
      </div>

      {/* Recommendations — the most valuable section */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Actions recommandées</span>
              <span className="text-xs font-normal text-muted-foreground">
                Générées par IA
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations.map((r) => (
                <RecommendationCard key={r.id} recommendation={r} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart + LLM Breakdown + Language Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Évolution du score</CardTitle>
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
            {scoreByLlm ? (
              <LlmBreakdown scoreByLlm={scoreByLlm} />
            ) : (
              <p className="text-sm text-muted-foreground">Pas de données</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score par langue</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreByLang ? (
              <LanguageBreakdown scoreByLang={scoreByLang} />
            ) : (
              <p className="text-sm text-muted-foreground">Pas de données</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Competitive Gap Analysis */}
      {benchmarkEntries.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse concurrentielle</CardTitle>
            </CardHeader>
            <CardContent>
              <CompetitiveGap
                entries={benchmarkEntries}
                clientName={client?.name || ""}
              />
            </CardContent>
          </Card>

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
        </div>
      )}

      {/* Detailed Query Results Matrix */}
      {detailedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Détail par requête</span>
              <span className="text-xs font-normal text-muted-foreground">
                {citedResults}/{totalResults} citations
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QueryResultsTable results={detailedResults} queries={queries} />
          </CardContent>
        </Card>
      )}

      {/* Citations */}
      <Card>
        <CardHeader>
          <CardTitle>Dernières citations</CardTitle>
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
              Aucune citation détectée pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertes récentes</CardTitle>
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

```


## `src/app/(dashboard)/llmwatch/page.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LlmWatchLandingPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LLM Watch</h1>
        <p className="text-muted-foreground mt-1">
          Monitoring continu de votre visibilite dans les IA generatives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4 LLM surveilles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ChatGPT, Perplexity, Claude et Gemini interroges chaque semaine
              avec vos requetes metier en FR, DE et EN.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score 0-100</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Un score composite pondere par LLM, par langue, avec suivi de
              l&apos;evolution et benchmark concurrents.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alertes automatiques</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Email automatique si un concurrent gagne ou perd plus de 10
              points en une semaine.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => router.push("/llmwatch/admin")}>
          Administration
        </Button>
      </div>
    </div>
  );
}

```


## `src/app/(dashboard)/nouveau-audit/page.tsx`

```tsx
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

type AuditLevel = "pre_audit" | "full" | "ultra" | "dryrun";

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
  {
    value: "dryrun",
    label: "Dry Run (test)",
    description: "Donnees fictives, 0 token API — pour tester le pipeline",
    price: "Gratuit",
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

const MAX_RETRIES = 2;

async function fetchStep(
  url: string,
  body: Record<string, unknown>,
  stepLabel?: string,
  retries = MAX_RETRIES,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const label = stepLabel || url;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(310_000), // 310s browser-side timeout (above server 300s max)
      });
    } catch (networkErr) {
      // Network error or browser timeout (TypeError: Failed to fetch)
      if (attempt < retries) {
        console.warn(`[audit] Network error on ${label}, retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 2000)); // wait 2s before retry
        continue;
      }
      throw new Error(`Erreur reseau a l\u2019etape "${label}". Verifiez votre connexion et reessayez.`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if ((res.status === 504 || res.status === 502) && attempt < retries) {
        console.warn(`[audit] Timeout on ${label}, retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 2000));
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
    if (newLevel === "ultra" || newLevel === "dryrun") {
      setSelectedThemes([...ALL_THEMES]);
    } else {
      // Keep first selected or default to seo
      setSelectedThemes((prev) => (prev.length > 0 ? [prev[0]] : ["seo"]));
    }
  };

  // --- Computed ---
  const effectiveThemes = (level === "ultra" || level === "dryrun") ? ALL_THEMES : selectedThemes;
  const hasUpload = semrushFile !== null || qwairyFile !== null;
  const dataMode = hasUpload ? "B" : "A";

  const totalPrice =
    level === "pre_audit" || level === "dryrun"
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

      // All levels use the same step-by-step flow.
      // Ultra: quality="ultra" (Sonnet, 50k HTML, detailed notes, per-dimension scoring)
      const effectiveQuality = level === "dryrun" ? "dryrun" : level === "ultra" ? "ultra" : quality;

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

        // Vercel Hobby = 60s max per function call.
        // CORE-EEAT scoring via Sonnet takes ~20-30s per dimension in ultra mode,
        // so we cap batches at 2 dimensions/call regardless of quality level.
        // Upgrade to Vercel Pro (300s) to unlock 4 dimensions/call.
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

          // Always batch CITE 2 dimensions/call — safe for Vercel Hobby (60s).
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
      // All quality levels: score all dimensions of a theme in one call (300s maxDuration)
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
          await fetchStep("/api/audit-direct/score-theme", {
            auditId: id,
            theme,
            quality: effectiveQuality,
          }, `Theme ${theme}`);

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

      // --- Finalize (scores + DB + action plan) ---
      setGlobalProgress(80);
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
                      Donnees externes SEO (CSV — legacy Semrush / AWT)
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Depuis v2.1: preferer le Wizard Ultra (6 blocs A-F)
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
                        ? "Audit ultra en cours..."
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

```


## `src/app/(dashboard)/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/audit/score-gauge";
import type { Audit, AuditScores } from "@/types/audit";
import { AUDIT_LEVEL_LABELS } from "@/types/audit";

interface AuditWithScores {
  audit: Audit;
  scores: AuditScores | null;
}

export default function DashboardPage() {
  const [recentAudits, setRecentAudits] = useState<AuditWithScores[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudits() {
      try {
        const res = await fetch("/api/audit");
        if (res.ok) {
          const data = await res.json();
          setRecentAudits(data.audits || []);
        }
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    }
    fetchAudits();
  }, []);

  const completedAudits = recentAudits.filter(
    (a) => a.audit.status === "completed"
  );
  const avgSeo =
    completedAudits.length > 0
      ? Math.round(
          completedAudits.reduce(
            (sum, a) => sum + (a.scores?.score_seo || 0),
            0
          ) / completedAudits.length
        )
      : 0;
  const avgGeo =
    completedAudits.length > 0
      ? Math.round(
          completedAudits.reduce(
            (sum, a) => sum + (a.scores?.score_geo || 0),
            0
          ) / completedAudits.length
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0808] via-[#1A0F0F] to-[#2A1515] p-8 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #A53535 0%, transparent 50%), radial-gradient(circle at 80% 50%, #8B2C2C 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-white/60 mt-2 max-w-xl">
            Vue d&apos;ensemble de vos audits SEO/GEO. Lancez un audit pour
            evaluer la visibilite de votre site sur les moteurs de recherche et les IA generatives.
          </p>
        </div>
      </div>

      {/* Quick actions — 3-level audit system */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pre-Audit */}
        <Card className="group relative overflow-hidden border-transparent bg-gradient-to-br from-[#FFFFFF] to-white hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#8B2C2C] to-[#A53535]" />
          <CardContent className="pt-6 pl-6">
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-heading font-bold text-lg">Pre-Audit</h3>
                <p className="text-xs font-medium text-[#8B2C2C] mt-0.5">Score rapide &middot; Gratuit</p>
                <p className="text-sm text-muted-foreground mt-1">
                  1-2 pages &middot; 1 theme
                </p>
              </div>
              <Link href="/nouveau-audit?level=pre_audit">
                <Button className="w-full">Lancer</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        {/* Audit Complet */}
        <Card className="group relative overflow-hidden border-transparent bg-gradient-to-br from-[#FFFFFF] to-white hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#A53535] to-[#7A2525]" />
          <CardContent className="pt-6 pl-6">
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-heading font-bold text-lg">Audit Complet</h3>
                <p className="text-xs font-medium text-[#A53535] mt-0.5">490-1 490 CHF</p>
                <p className="text-sm text-muted-foreground mt-1">
                  8-12 pages &middot; 1 theme en profondeur
                </p>
              </div>
              <Link href="/nouveau-audit?level=full">
                <Button variant="outline" className="w-full">Lancer</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        {/* Ultra Audit */}
        <Card className="group relative overflow-hidden border-transparent bg-gradient-to-br from-[#FFFFFF] to-white hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#4A1515] to-[#8B2C2C]" />
          <CardContent className="pt-6 pl-6">
            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-heading font-bold text-lg">Ultra Audit</h3>
                <p className="text-xs font-medium text-[#4A1515] mt-0.5">4 900 CHF</p>
                <p className="text-sm text-muted-foreground mt-1">
                  20-25 pages &middot; 7 themes &middot; Benchmark croise
                </p>
              </div>
              <Link href="/nouveau-audit?level=ultra">
                <Button variant="outline" className="w-full">Lancer</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      {completedAudits.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value={recentAudits.length} label="Audits lances" />
          <StatCard value={completedAudits.length} label="Audits termines" />
          <StatCard value={avgSeo} label="Score SEO moyen" suffix="/100" />
          <StatCard value={avgGeo} label="Score GEO moyen" suffix="/100" />
        </div>
      )}

      {/* Recent audits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Audits recents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : recentAudits.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B2C2C]/10 to-[#A53535]/10 mx-auto mb-4 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#A53535]">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium">Aucun audit pour le moment.</p>
              <p className="text-sm text-muted-foreground mt-1">Lancez votre premier audit pour commencer.</p>
              <Link href="/nouveau-audit">
                <Button className="mt-4">Lancer votre premier audit</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAudits.map(({ audit, scores }) => (
                <Link
                  key={audit.id}
                  href={`/audit/${audit.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold group-hover:text-[#8B2C2C] transition-colors">{audit.domain}</span>
                        <Badge
                          variant={
                            audit.audit_type === "pre_audit" || audit.audit_type === "express"
                              ? "secondary"
                              : audit.audit_type === "ultra"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {AUDIT_LEVEL_LABELS[audit.audit_type] ?? audit.audit_type}
                        </Badge>
                        <StatusBadge status={audit.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(audit.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {audit.sector ? ` — ${audit.sector}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {scores && audit.status === "completed" && (
                      <>
                        <ScoreGauge
                          score={scores.score_seo}
                          label="SEO"
                          size="sm"
                        />
                        <ScoreGauge
                          score={scores.score_geo}
                          label="GEO"
                          size="sm"
                        />
                      </>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-muted-foreground/40 group-hover:text-[#A53535] transition-colors ml-2">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <p className="text-3xl font-heading font-bold tabular-nums">
          {value}<span className="text-lg text-muted-foreground font-normal">{suffix}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "En attente", variant: "outline" },
    processing: { label: "En cours", variant: "secondary" },
    completed: { label: "Termine", variant: "default" },
    error: { label: "Erreur", variant: "destructive" },
  };
  const { label, variant } = config[status] || config.pending;
  return <Badge variant={variant}>{label}</Badge>;
}

```


## `src/app/(dashboard)/settings/integrations/page.tsx`

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Page — Intégrations Google (GSC + GA4)
 * Phase 2B POLE-PERF v2.1
 */
export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    // No dedicated endpoint; we just try listing sites/properties
    const [gscRes, ga4Res] = await Promise.all([
      fetch("/api/integrations/google/fetch-gsc").then((r) => r.json()).catch(() => null),
      fetch("/api/integrations/google/fetch-ga4").then((r) => r.json()).catch(() => null),
    ]);
    setConnections({
      google_gsc: gscRes?.sites ? { connected: true, sites: gscRes.sites } : { connected: false },
      google_ga4: ga4Res?.properties ? { connected: true, properties: ga4Res.properties } : { connected: false },
    });
    setLoading(false);
  }

  async function disconnect(provider: string) {
    await fetch("/api/integrations/google/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    fetchStatus();
  }

  function connect(provider: string) {
    window.location.href = `/api/integrations/google/authorize?provider=${provider}`;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Intégrations — Google Search Console & Analytics 4</h1>
      <p className="text-sm text-muted-foreground">
        Connectez vos comptes Google pour auto-remplir les blocs B (GSC) et C (GA4) du Wizard Ultra.
        POLE-PERF v2.1 Phase 2B. Données officielles, gratuites, illimitées.
      </p>

      {connectedParam && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          ✓ Connecté : {connectedParam === "google_gsc" ? "Google Search Console" : "Google Analytics 4"}
        </div>
      )}
      {errorParam && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          ⚠️ Erreur OAuth : {errorParam}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Google Search Console
            {connections.google_gsc?.connected && (
              <Badge className="ml-2" variant="default">✓ Connecté</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Scope : <code>webmasters.readonly</code>. Fournit requêtes, pages, positions, CTR, impressions (16 mois).
          </p>
          {loading ? (
            <p className="text-xs">Chargement...</p>
          ) : connections.google_gsc?.connected ? (
            <div className="space-y-2">
              <p className="text-xs">Sites accessibles : <strong>{connections.google_gsc.sites?.length || 0}</strong></p>
              <Button variant="outline" onClick={() => disconnect("google_gsc")}>Déconnecter</Button>
            </div>
          ) : (
            <Button onClick={() => connect("google_gsc")}>Connecter GSC</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Google Analytics 4
            {connections.google_ga4?.connected && (
              <Badge className="ml-2" variant="default">✓ Connecté</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Scope : <code>analytics.readonly</code>. Fournit sessions, utilisateurs, engagement, conversions (12 mois, Organic Search).
          </p>
          {loading ? (
            <p className="text-xs">Chargement...</p>
          ) : connections.google_ga4?.connected ? (
            <div className="space-y-2">
              <p className="text-xs">Properties accessibles : <strong>{connections.google_ga4.properties?.length || 0}</strong></p>
              <Button variant="outline" onClick={() => disconnect("google_ga4")}>Déconnecter</Button>
            </div>
          ) : (
            <Button onClick={() => connect("google_ga4")}>Connecter GA4</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration requise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Variables d'environnement Vercel :
          </p>
          <ul className="list-disc pl-5 font-mono text-xs">
            <li>GOOGLE_OAUTH_CLIENT_ID</li>
            <li>GOOGLE_OAUTH_CLIENT_SECRET</li>
            <li>NEXT_PUBLIC_SITE_URL</li>
          </ul>
          <p>
            Créer un projet Google Cloud et activer Search Console API + GA Data API.
            Configurer l'URI de redirect : <code className="text-xs">{"{NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback"}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

```


## `src/app/(dashboard)/siteaudit/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuditScoreCard } from "@/components/siteaudit/AuditScoreCard";
import { AuditCheckList } from "@/components/siteaudit/AuditCheckList";
import { AuditRecommendationCard } from "@/components/siteaudit/AuditRecommendationCard";
import { ScoreGauge } from "@/components/siteaudit/ScoreGauge";
import type { SiteAuditResult } from "@/lib/siteaudit/types";

export default function SiteAuditPage() {
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SiteAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith("http")) {
        targetUrl = `https://${targetUrl}`;
      }

      const res = await fetch("/api/siteaudit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'audit");
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site Audit</h1>
        <p className="text-muted-foreground mt-1">
          Audit technique SEO, performance, accessibilité et lisibilité
        </p>
      </div>

      {/* Formulaire */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="https://www.example.ch"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
            />
            <Input
              placeholder="Mots-clés (optionnel, séparés par des virgules)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="flex-1"
            />
            <Button onClick={runAudit} disabled={loading || !url}>
              {loading ? "Analyse en cours..." : "Lancer l'audit"}
            </Button>
          </div>
          {loading && (
            <p className="text-sm text-muted-foreground mt-3">
              Crawl du site, analyse PageSpeed, vérifications SEO... Cela peut
              prendre 30 à 60 secondes.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Score global + gauges */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="pt-6 flex justify-center">
                <div className="relative">
                  <ScoreGauge
                    score={result.score_global}
                    label="Score global"
                    size={140}
                  />
                </div>
              </CardContent>
            </Card>
            <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <AuditScoreCard label="SEO Technique" score={result.score_seo} />
              <AuditScoreCard
                label="Performance"
                score={result.score_performance}
              />
              <AuditScoreCard
                label="Accessibilité"
                score={result.score_accessibility}
              />
              <AuditScoreCard
                label="Lisibilité"
                score={result.score_readability}
              />
            </div>
          </div>

          {/* Recommandations */}
          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Recommandations prioritaires ({result.recommendations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.recommendations.map((r) => (
                  <AuditRecommendationCard key={r.id} recommendation={r} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Vérifications SEO détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Vérifications SEO / GEO</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditCheckList checks={result.seo_checks} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Données structurées (Schema.org)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.schema_data.schemas_found.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium mb-2">Schemas trouvés :</p>
                    <div className="flex flex-wrap gap-1">
                      {result.schema_data.schemas_found.map((s, i) => (
                        <span
                          key={i}
                          className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">
                    Aucune donnée structurée trouvée
                  </p>
                )}
                {result.schema_data.issues.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Problèmes :</p>
                    {result.schema_data.issues.map((issue, i) => (
                      <p
                        key={i}
                        className="text-xs text-muted-foreground flex items-center gap-1"
                      >
                        <span className="text-red-500">!</span> {issue}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance détaillée */}
          <Card>
            <CardHeader>
              <CardTitle>Performance (PageSpeed Insights)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">
                    {(result.performance_data.lcp / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-muted-foreground">
                    LCP (Largest Contentful Paint)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.performance_data.cls.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    CLS (Layout Shift)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.performance_data.fid}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    FID (First Input Delay)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.performance_data.ttfb}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    TTFB (Time to First Byte)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {(result.performance_data.fcp / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-muted-foreground">
                    FCP (First Contentful Paint)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lisibilité */}
          <Card>
            <CardHeader>
              <CardTitle>Lisibilité du contenu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {result.readability_data.flesch_score}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Score Flesch
                  </div>
                  <div className="text-xs mt-0.5">
                    {result.readability_data.flesch_level}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.readability_data.word_count}
                  </div>
                  <div className="text-xs text-muted-foreground">Mots</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.readability_data.avg_sentence_length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mots / phrase (moy.)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold uppercase">
                    {result.readability_data.lang_detected}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Langue détectée
                  </div>
                </div>
              </div>
              {Object.keys(result.readability_data.keyword_density).length >
                0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    Densité mots-clés :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      result.readability_data.keyword_density
                    ).map(([kw, density]) => (
                      <span
                        key={kw}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {kw}: {density}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accessibilité */}
          {result.accessibility_data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Accessibilité ({result.accessibility_data.length} violation
                  {result.accessibility_data.length > 1 ? "s" : ""})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.accessibility_data.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-2 p-2 bg-red-50 rounded text-sm"
                  >
                    <span className="text-red-600 font-bold shrink-0">!</span>
                    <div>
                      <span className="font-medium">{v.description}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({v.wcag_criteria})
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <p className="text-xs text-muted-foreground text-right">
            Audit réalisé en {(result.crawl_duration_ms / 1000).toFixed(1)}s —{" "}
            {result.pages_crawled} page(s) analysée(s) —{" "}
            {new Date(result.audited_at).toLocaleString("fr-CH")}
          </p>
        </>
      )}
    </div>
  );
}

```


## `src/app/(auth)/login/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(`Erreur: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Aucun utilisateur retourné");
        setLoading(false);
        return;
      }

      router.push("/audit-express");
      router.refresh();
    } catch (err) {
      setError(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        {/* MCVA accent bar */}
        <div className="h-1 bg-primary rounded-t-lg" />
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">
                +
              </span>
            </div>
          </div>
          <CardTitle className="text-xl">MCVA Audit Platform</CardTitle>
          <p className="text-sm text-muted-foreground">
            Plateforme interne — Acces reserve aux collaborateurs Arneo
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="prenom.nom@arneo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

```

