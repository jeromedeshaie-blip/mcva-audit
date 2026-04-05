import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { createGeoProvider } from "@/lib/providers/geo/geo-provider";
import { crawlUrl, checkRobotsTxt } from "@/lib/siteaudit/crawler";
import { runSeoChecks } from "@/lib/siteaudit/seo-checker";
import { analyzeReadability } from "@/lib/siteaudit/readability";
import { computeGlobalScore, accessibilityViolationsToScore, readabilityToScore } from "@/lib/siteaudit/scoring";
import { generateRecommendations } from "@/lib/siteaudit/recommendations";
import type { AccessibilityViolation } from "@/lib/siteaudit/types";
import type { QualityLevel } from "@/types/audit";

export const maxDuration = 300;

/**
 * POST /api/audit-direct/data
 * Step 5: Collect SEO + GEO + site audit data (all in parallel)
 * Returns data to the client for finalization.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { auditId, quality: rawQuality = "standard" } = body;
  if (!auditId) return NextResponse.json({ error: "auditId requis" }, { status: 400 });

  const quality = (rawQuality || "standard") as QualityLevel;
  const serviceClient = createServiceClient();

  const { data: audit, error: fetchErr } = await serviceClient
    .from("audits")
    .select("url, domain, sector, brand_name")
    .eq("id", auditId)
    .single();

  if (fetchErr || !audit) {
    return NextResponse.json({ error: "Audit introuvable", detail: fetchErr?.message }, { status: 404 });
  }

  const { url, domain, sector, brand_name: brandName } = audit;

  // Run ALL data collection in parallel
  const [seoResult, geoResult, competitorsResult, siteAuditResult] = await Promise.allSettled([
    (async () => {
      const provider = await createSeoProvider();
      return provider.getDomainOverview(domain);
    })(),
    (async () => {
      const provider = await createGeoProvider();
      return provider.getAIVisibility(brandName || domain, sector || "général", domain, quality);
    })(),
    (async () => {
      const provider = await createSeoProvider();
      return provider.getCompetitors(domain);
    })(),
    runSiteAudit(url),
  ]);

  return NextResponse.json({
    seoData: seoResult.status === "fulfilled" ? seoResult.value : null,
    geoData: geoResult.status === "fulfilled" ? geoResult.value : null,
    competitors: competitorsResult.status === "fulfilled" ? competitorsResult.value : null,
    siteAuditData: siteAuditResult.status === "fulfilled" ? siteAuditResult.value : null,
    errors: {
      seo: seoResult.status === "rejected" ? seoResult.reason?.message : null,
      geo: geoResult.status === "rejected" ? geoResult.reason?.message : null,
      siteAudit: siteAuditResult.status === "rejected" ? siteAuditResult.reason?.message : null,
    },
  });
}

async function runSiteAudit(url: string) {
  const [crawlData, robots] = await Promise.allSettled([
    crawlUrl(url),
    checkRobotsTxt(url),
  ]);

  const crawl = crawlData.status === "fulfilled" ? crawlData.value : null;
  const robotsResult = robots.status === "fulfilled"
    ? robots.value
    : { exists: false, hasSitemap: false, sitemapUrl: null, blocksAll: false };

  let seoChecks = { checks: [] as any[], score: 0, schemaData: null as any };
  if (crawl) seoChecks = runSeoChecks(crawl, robotsResult);

  const bodyText = crawl?.bodyText?.substring(0, 10000) || "";
  const readabilityData = analyzeReadability(bodyText);

  const violations: AccessibilityViolation[] = [];
  const noAltImages = (crawl?.images || []).filter((img: any) => !img.alt || img.alt.trim() === "");
  if (noAltImages.length > 0) {
    violations.push({
      id: "image-alt", impact: "serious",
      description: `${noAltImages.length} image(s) sans attribut alt`,
      nodes_count: noAltImages.length, wcag_criteria: "WCAG 2.1 AA 1.1.1",
    });
  }

  const scores = {
    seo: seoChecks.score,
    performance: 0,
    accessibility: accessibilityViolationsToScore(violations),
    readability: readabilityToScore(readabilityData.flesch_score, readabilityData.word_count),
  };

  return {
    scores,
    globalTechScore: computeGlobalScore(scores),
    techRecommendations: generateRecommendations(seoChecks.checks as any, null as any, violations as any, scores),
    seoChecks,
    readabilityData,
    crawlMeta: {
      url: crawl?.url || url,
      hasViewport: crawl?.hasViewport ?? false,
      canonicalUrl: crawl?.canonicalUrl ?? null,
      title: crawl?.title ?? null,
      metaDescription: crawl?.metaDescription ?? null,
      hreflang: (crawl?.hreflang || []).slice(0, 10),
    },
    robots: robotsResult,
  };
}
