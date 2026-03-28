import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { createGeoProvider } from "@/lib/providers/geo/geo-provider";
import { scoreOneDimension, scoreOneCiteDimension, getCoreEeatDimensions, getCiteDimensions, aggregateScores, calculateSeoScore } from "@/lib/scoring/scorer";
import { QUALITY_CONFIG } from "@/lib/constants";
import type { QualityLevel } from "@/types/audit";
import * as cheerio from "cheerio";

export const maxDuration = 60;

/**
 * POST /api/debug-audit — Diagnostic endpoint that runs audit steps one by one
 * WITHOUT Inngest, logging timing and errors for each step.
 *
 * Body: { url: string, sector?: string, quality?: string, step?: string }
 * step: "all" | "scrape" | "seo" | "geo" | "score-C" | "score-cite-C" | ...
 *
 * Returns detailed timing and error info for each step.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { url, sector = "général", quality: rawQuality = "standard", step = "all" } = body as {
    url: string;
    sector?: string;
    quality?: string;
    step?: string;
  };

  if (!url) {
    return NextResponse.json({ error: "URL requise" }, { status: 400 });
  }

  const quality = (rawQuality || "standard") as QualityLevel;
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = (() => {
    try {
      return new URL(fullUrl).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  const results: Record<string, { ok: boolean; durationMs: number; data?: unknown; error?: string }> = {};

  async function timedStep<T>(name: string, fn: () => Promise<T>): Promise<T | null> {
    const start = Date.now();
    try {
      const result = await fn();
      results[name] = { ok: true, durationMs: Date.now() - start, data: typeof result === "string" ? `${(result as string).length} chars` : result };
      return result;
    } catch (e: any) {
      results[name] = { ok: false, durationMs: Date.now() - start, error: e.message || String(e) };
      return null;
    }
  }

  // Step 1: Scrape HTML
  let html: string | null = null;
  if (step === "all" || step === "scrape") {
    html = await timedStep("scrape-html", async () => {
      const response = await fetch(fullUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (text.length < 100) throw new Error(`HTML too short: ${text.length} chars`);
      return text;
    });
  }

  if (step === "scrape") {
    return NextResponse.json({ results, html_length: html?.length ?? 0 });
  }

  // Step 2: SEO data
  if (step === "all" || step === "seo") {
    await timedStep("seo-data", async () => {
      const provider = await createSeoProvider();
      return provider.getDomainOverview(domain);
    });
  }

  // Step 3: GEO data
  if (step === "all" || step === "geo") {
    if (!html) {
      // Quick scrape if not done yet
      try {
        const r = await fetch(fullUrl, { headers: { "User-Agent": "MCVAAuditBot/1.0" }, signal: AbortSignal.timeout(10000) });
        html = await r.text();
      } catch { /* ignore */ }
    }
    const brandName = html ? extractBrandName(html, domain) : domain;

    await timedStep("geo-data", async () => {
      const provider = await createGeoProvider();
      return provider.getAIVisibility(brandName, sector, domain, quality);
    });
  }

  // Step 4: Score ONE CORE-EEAT dimension (to test LLM scoring)
  if (step === "all" || step.startsWith("score-") && !step.startsWith("score-cite")) {
    const targetDim = step.startsWith("score-") ? step.replace("score-", "") : "C";
    if (html) {
      await timedStep(`score-core-eeat-${targetDim}`, async () => {
        return scoreOneDimension(html!, url, targetDim, "full", quality);
      });
    } else {
      results[`score-core-eeat-${targetDim}`] = { ok: false, durationMs: 0, error: "No HTML available" };
    }
  }

  // Step 5: Score ONE CITE dimension
  if (step === "all" || step.startsWith("score-cite")) {
    const targetDim = step.startsWith("score-cite-") ? step.replace("score-cite-", "") : "C";
    if (html) {
      await timedStep(`score-cite-${targetDim}`, async () => {
        return scoreOneCiteDimension(html!, url, targetDim, "full", quality);
      });
    } else {
      results[`score-cite-${targetDim}`] = { ok: false, durationMs: 0, error: "No HTML available" };
    }
  }

  // Step 6: Env check
  results["env-check"] = {
    ok: true,
    durationMs: 0,
    data: {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY ? `set (${process.env.ANTHROPIC_API_KEY?.slice(0, 8)}...)` : "MISSING",
      INNGEST_EVENT_KEY: !!process.env.INNGEST_EVENT_KEY ? "set" : "MISSING",
      INNGEST_SIGNING_KEY: !!process.env.INNGEST_SIGNING_KEY ? "set" : "MISSING",
      SEO_PROVIDER: process.env.SEO_PROVIDER || "not set (defaults to free)",
      GEO_PROVIDER: process.env.GEO_PROVIDER || "not set (defaults to direct_ai)",
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL ? "true" : "false",
      VERCEL_ENV: process.env.VERCEL_ENV || "not set",
    },
  };

  // Summary
  const totalMs = Object.values(results).reduce((sum, r) => sum + r.durationMs, 0);
  const failedSteps = Object.entries(results).filter(([, r]) => !r.ok).map(([k]) => k);

  return NextResponse.json({
    summary: {
      totalMs,
      stepsRun: Object.keys(results).length,
      stepsFailed: failedSteps.length,
      failedSteps,
    },
    results,
  });
}

function extractBrandName(html: string, domain: string): string {
  const $ = cheerio.load(html);
  const siteName = $('meta[property="og:site_name"]').attr("content");
  if (siteName) return siteName;

  let orgName: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (orgName) return;
    try {
      const json = JSON.parse($(el).html() || "");
      if (json?.["@type"] === "Organization" && json.name) {
        orgName = json.name;
        return;
      }
      if (Array.isArray(json?.["@graph"])) {
        const org = json["@graph"].find((item: any) => item?.["@type"] === "Organization" && item.name);
        if (org) orgName = org.name;
      }
    } catch { /* ignore */ }
  });
  if (orgName) return orgName;

  const title = $("title").text();
  if (title) {
    const parts = title.split(/[|\-–—]/);
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return parts[0].trim();
  }

  return domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
}
