import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { createGeoProvider } from "@/lib/providers/geo/geo-provider";
import {
  scoreOneDimension,
  scoreOneCiteDimension,
  getCoreEeatDimensions,
  getCiteDimensions,
  aggregateScores,
  calculateSeoScore,
} from "@/lib/scoring/scorer";
import { QUALITY_CONFIG } from "@/lib/constants";
import type { QualityLevel, GeoData, SeoData, AuditItem } from "@/types/audit";
import * as cheerio from "cheerio";

// Site Audit imports
import { crawlUrl, checkRobotsTxt } from "@/lib/siteaudit/crawler";
import { runSeoChecks } from "@/lib/siteaudit/seo-checker";
import { getPageSpeedScore } from "@/lib/siteaudit/performance";
import { analyzeReadability } from "@/lib/siteaudit/readability";
import {
  computeGlobalScore,
  accessibilityViolationsToScore,
  readabilityToScore,
} from "@/lib/siteaudit/scoring";
import { generateRecommendations } from "@/lib/siteaudit/recommendations";
import type { AccessibilityViolation } from "@/lib/siteaudit/types";

// Allow up to 60s on Vercel Hobby (max for Hobby plan)
export const maxDuration = 60;

/**
 * POST /api/audit-direct — Run a full audit WITHOUT Inngest.
 * All steps execute synchronously in a single request.
 * Uses eco quality by default for speed. Falls back gracefully on any error.
 *
 * Body: { auditId: string, url: string, domain: string, sector?: string, quality?: string }
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

  const { auditId, url, domain, sector = "général", quality: rawQuality } = body as {
    auditId?: string;
    url: string;
    domain?: string;
    sector?: string;
    quality?: string;
  };

  if (!url) {
    return NextResponse.json({ error: "URL requise" }, { status: 400 });
  }

  const quality = (rawQuality || "standard") as QualityLevel;
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const parsedDomain = domain || (() => {
    try { return new URL(fullUrl).hostname.replace(/^www\./, ""); } catch { return url; }
  })();

  const serviceClient = createServiceClient();
  const log: string[] = [];
  const startTime = Date.now();

  function elapsed() { return `${Date.now() - startTime}ms`; }

  // --- Create or use existing audit record ---
  let finalAuditId: string = auditId || "";
  if (!finalAuditId) {
    const { data: audit, error } = await serviceClient
      .from("audits")
      .insert({
        url: fullUrl,
        domain: parsedDomain,
        sector: sector || null,
        audit_type: "full",
        status: "processing",
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !audit) {
      return NextResponse.json({ error: "Failed to create audit", detail: error?.message }, { status: 500 });
    }
    finalAuditId = audit.id;
    log.push(`[${elapsed()}] Created audit ${finalAuditId}`);
  } else {
    // Update existing audit to processing
    await serviceClient
      .from("audits")
      .update({ status: "processing" })
      .eq("id", finalAuditId);
    log.push(`[${elapsed()}] Resuming audit ${finalAuditId}`);
  }

  try {
    // --- Step 1: Scrape HTML ---
    log.push(`[${elapsed()}] Scraping ${fullUrl}...`);
    let html: string;
    try {
      const response = await fetch(fullUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0)" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      html = await response.text();
      if (html.length < 100) throw new Error("HTML too short");
      log.push(`[${elapsed()}] HTML: ${html.length} chars`);
    } catch (e: any) {
      log.push(`[${elapsed()}] Scrape FAILED: ${e.message}`);
      await markError(serviceClient, finalAuditId, log);
      return NextResponse.json({ error: "Scrape failed", detail: e.message, log }, { status: 500 });
    }

    // --- Step 2: EVERYTHING in parallel (data + scoring) to fit in 60s ---
    log.push(`[${elapsed()}] Starting all tasks in parallel...`);

    const brandName = extractBrandName(html, parsedDomain);
    const coreEeatDims = getCoreEeatDimensions("full");
    const citeDims = getCiteDimensions("full");

    // Run data collection AND all scoring in one massive Promise.allSettled
    // This is safe: the earlier "credits exhausted" error was the real issue, not rate limits
    const allResults = await Promise.allSettled([
      // [0] SEO data
      (async () => {
        const provider = await createSeoProvider();
        return provider.getDomainOverview(parsedDomain);
      })(),
      // [1] GEO data
      (async () => {
        const provider = await createGeoProvider();
        return provider.getAIVisibility(brandName, sector, parsedDomain, quality);
      })(),
      // [2] Competitors
      (async () => {
        const provider = await createSeoProvider();
        return provider.getCompetitors(parsedDomain);
      })(),
      // [3..3+N-1] CORE-EEAT dimensions (all in parallel)
      ...coreEeatDims.map((dim) =>
        scoreOneDimension(html, url, dim, "full", quality)
      ),
      // [3+N..end] CITE dimensions (all in parallel)
      ...citeDims.map((dim) =>
        scoreOneCiteDimension(html, url, dim, "full", quality)
      ),
    ]);

    // Extract data results
    const seoResult = allResults[0];
    const geoResult = allResults[1];
    const competitorsResult = allResults[2];
    const scoringResults = allResults.slice(3);

    const seoData = seoResult.status === "fulfilled" ? seoResult.value : getEmptySeoData();
    const geoData = geoResult.status === "fulfilled" ? geoResult.value : getEmptyGeoData();
    const competitors = competitorsResult.status === "fulfilled" ? competitorsResult.value : null;

    if (seoResult.status === "rejected") log.push(`[${elapsed()}] SEO data failed: ${seoResult.reason?.message}`);
    if (geoResult.status === "rejected") log.push(`[${elapsed()}] GEO data failed: ${geoResult.reason?.message}`);

    // Collect scored items with detailed error logging
    const allScoredItems: Omit<AuditItem, "id" | "audit_id">[] = [];
    const allDims = [...coreEeatDims, ...citeDims];
    for (let i = 0; i < scoringResults.length; i++) {
      const result = scoringResults[i];
      const dimName = allDims[i] || `dim-${i}`;
      const framework = i < coreEeatDims.length ? "CORE-EEAT" : "CITE";
      if (result.status === "fulfilled" && Array.isArray(result.value)) {
        allScoredItems.push(...(result.value as Omit<AuditItem, "id" | "audit_id">[]));
        log.push(`[${elapsed()}] ${framework} ${dimName}: ${(result.value as any[]).length} items`);
      } else if (result.status === "rejected") {
        log.push(`[${elapsed()}] ${framework} ${dimName} FAILED: ${result.reason?.message || result.reason}`);
      }
    }

    log.push(`[${elapsed()}] Total scored items: ${allScoredItems.length}`);

    // Separate CORE-EEAT and CITE items
    const coreEeatItems = allScoredItems.filter((i: any) => i.framework === "core_eeat");
    const citeItems = allScoredItems.filter((i: any) => i.framework === "cite");

    // Aggregate scores
    const coreEeatScores = aggregateScores(coreEeatItems as any);
    const citeScores = aggregateScores(citeItems as any);
    const scoreSeo = calculateSeoScore(coreEeatScores);
    const scoreGeo = (geoData as any).ai_visibility_score ?? 0;

    log.push(`[${elapsed()}] Scores: SEO=${scoreSeo}, GEO=${scoreGeo}`);

    // --- Step 3: Site audit (quick, no LLM) ---
    let siteAuditData: any = null;
    try {
      const [crawlData, robots] = await Promise.allSettled([
        crawlUrl(fullUrl),
        checkRobotsTxt(fullUrl),
      ]);

      const crawl = crawlData.status === "fulfilled" ? crawlData.value : null;
      const robotsResult = robots.status === "fulfilled"
        ? robots.value
        : { exists: false, hasSitemap: false, sitemapUrl: null, blocksAll: false };

      let seoChecks = { checks: [] as any[], score: 0, schemaData: null as any };
      if (crawl) seoChecks = runSeoChecks(crawl, robotsResult);

      let perf = { score: 0, mobile: null as any, desktop: null as any };
      try {
        perf = await getPageSpeedScore(fullUrl) as any;
      } catch (e: any) {
        log.push(`[${elapsed()}] PageSpeed failed: ${e.message}`);
      }

      const bodyText = crawl?.bodyText?.substring(0, 10000) || "";
      const readabilityData = analyzeReadability(bodyText);
      const violations: AccessibilityViolation[] = [];
      const noAltImages = (crawl?.images || []).filter((img: any) => !img.alt || img.alt.trim() === "");
      if (noAltImages.length > 0) {
        violations.push({
          id: "image-alt",
          impact: "serious",
          description: `${noAltImages.length} image(s) sans attribut alt`,
          nodes_count: noAltImages.length,
          wcag_criteria: "WCAG 2.1 AA 1.1.1",
        });
      }

      const scores = {
        seo: seoChecks.score,
        performance: perf.score || 0,
        accessibility: accessibilityViolationsToScore(violations),
        readability: readabilityToScore(readabilityData.flesch_score, readabilityData.word_count),
      };

      siteAuditData = {
        scores,
        globalTechScore: computeGlobalScore(scores),
        techRecommendations: generateRecommendations(seoChecks.checks as any, perf.mobile as any, violations as any, scores),
        seoChecks,
        readabilityData,
        crawlMeta: {
          url: crawl?.url || fullUrl,
          hasViewport: crawl?.hasViewport ?? false,
          canonicalUrl: crawl?.canonicalUrl ?? null,
          title: crawl?.title ?? null,
          metaDescription: crawl?.metaDescription ?? null,
          hreflang: (crawl?.hreflang || []).slice(0, 10),
        },
        robots: robotsResult,
        performanceData: perf,
      };
      log.push(`[${elapsed()}] Site audit done: global=${siteAuditData.globalTechScore}`);
    } catch (e: any) {
      log.push(`[${elapsed()}] Site audit failed: ${e.message}`);
    }

    // --- Step 4: Save everything ---
    log.push(`[${elapsed()}] Saving results...`);
    const seoProvider = await createSeoProvider();

    const enrichedSeoData = {
      ...(seoData as any),
      technical_checks: siteAuditData?.seoChecks?.checks || [],
      schema_detail: siteAuditData?.seoChecks?.schemaData || null,
      readability: siteAuditData?.readabilityData
        ? {
            flesch_score: siteAuditData.readabilityData.flesch_score,
            flesch_level: siteAuditData.readabilityData.flesch_level,
            lang_detected: siteAuditData.readabilityData.lang_detected,
            avg_sentence_length: siteAuditData.readabilityData.avg_sentence_length,
            avg_word_length: siteAuditData.readabilityData.avg_word_length,
            word_count: siteAuditData.readabilityData.word_count,
          }
        : null,
      has_https: siteAuditData?.crawlMeta?.url?.startsWith("https://") ?? false,
      has_viewport: siteAuditData?.crawlMeta?.hasViewport ?? false,
      has_canonical: !!siteAuditData?.crawlMeta?.canonicalUrl,
      canonical_url: siteAuditData?.crawlMeta?.canonicalUrl ?? null,
      has_robots_txt: siteAuditData?.robots?.exists ?? false,
      has_sitemap: siteAuditData?.robots?.hasSitemap ?? false,
      sitemap_url: siteAuditData?.robots?.sitemapUrl ?? null,
      hreflang_tags: siteAuditData?.crawlMeta?.hreflang || [],
      meta_title_length: siteAuditData?.crawlMeta?.title?.length ?? null,
      meta_description_length: siteAuditData?.crawlMeta?.metaDescription?.length ?? null,
      site_audit_scores: siteAuditData?.scores || null,
      site_audit_global: siteAuditData?.globalTechScore ?? null,
      performance_data: siteAuditData?.performanceData || null,
    };

    // Save scores
    const { error: scoresErr } = await serviceClient.from("audit_scores").insert({
      audit_id: finalAuditId,
      score_seo: scoreSeo,
      score_geo: scoreGeo,
      score_core_eeat: coreEeatScores,
      score_cite: citeScores,
      seo_provider: seoProvider.name,
      seo_data: { ...enrichedSeoData, _debug_log: log },
      geo_provider: process.env.GEO_PROVIDER || "direct_ai",
      geo_data: geoData,
      competitors,
    });

    if (scoresErr) {
      log.push(`[${elapsed()}] Save scores FAILED: ${scoresErr.message}`);
      await markError(serviceClient, finalAuditId, log);
      return NextResponse.json({ error: "Save scores failed", detail: scoresErr.message, log }, { status: 500 });
    }

    // Save items
    if (allScoredItems.length > 0) {
      const { error: itemsErr } = await serviceClient.from("audit_items").insert(
        allScoredItems.map((item: any) => ({ audit_id: finalAuditId, ...item }))
      );
      if (itemsErr) log.push(`[${elapsed()}] Save items warning: ${itemsErr.message}`);
    }

    // Save actions (technical recommendations)
    const techActions = (siteAuditData?.techRecommendations || []).map((rec: any) => ({
      priority: rec.priority === "critical" ? "P1" : rec.priority === "high" ? "P2" : rec.priority === "medium" ? "P3" : "P4",
      title: rec.title,
      description: `${rec.description}\n\nAction : ${rec.action}`,
      impact_points: rec.impact_points,
      effort: rec.effort === "low" ? "< 1h" : rec.effort === "medium" ? "1-2 jours" : "1 semaine",
      category: rec.dimension === "geo" ? "GEO" : rec.dimension === "performance" ? "technique" : rec.dimension === "accessibility" ? "technique" : "SEO",
    }));
    if (techActions.length > 0) {
      const { error: actErr } = await serviceClient.from("audit_actions").insert(
        techActions.map((a: any) => ({ audit_id: finalAuditId, ...a }))
      );
      if (actErr) log.push(`[${elapsed()}] Save actions warning: ${actErr.message}`);
    }

    // Mark completed
    const { error: completeErr } = await serviceClient
      .from("audits")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", finalAuditId);

    if (completeErr) {
      log.push(`[${elapsed()}] Mark complete FAILED: ${completeErr.message}`);
    }

    log.push(`[${elapsed()}] DONE — SEO=${scoreSeo}, GEO=${scoreGeo}, items=${allScoredItems.length}, actions=${techActions.length}`);

    return NextResponse.json({
      audit_id: finalAuditId,
      status: "completed",
      scores: { seo: scoreSeo, geo: scoreGeo },
      items_count: allScoredItems.length,
      actions_count: techActions.length,
      duration_ms: Date.now() - startTime,
      log,
    });
  } catch (e: any) {
    log.push(`[${elapsed()}] FATAL: ${e.message}`);
    await markError(serviceClient, finalAuditId, log);
    return NextResponse.json({
      error: "Audit failed",
      detail: e.message,
      audit_id: finalAuditId,
      log,
    }, { status: 500 });
  }
}

// --- Helpers ---

async function markError(supabase: any, auditId: string, log: string[]) {
  try {
    await supabase
      .from("audits")
      .update({ status: "error" })
      .eq("id", auditId);
  } catch (e: any) {
    log.push(`Failed to mark error: ${e.message}`);
  }
}

function getEmptySeoData(): SeoData {
  return {
    meta_title: null, meta_description: null, h1_count: 0, h2_count: 0,
    has_schema_org: false, schema_types: [], internal_links_count: 0,
    external_links_count: 0, images_without_alt: 0, page_speed_score: null,
    core_web_vitals: null, organic_traffic: null, organic_keywords: null,
    authority_score: null, backlinks_total: null, referring_domains: null,
    top_keywords: null,
  } as SeoData;
}

function getEmptyGeoData(): GeoData {
  return {
    ai_visibility_score: 0, brand_mentioned: false, brand_sentiment: "not_mentioned",
    citation_count: 0, models_coverage: 0, models_tested: [],
  } as GeoData;
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
      if (json?.["@type"] === "Organization" && json.name) { orgName = json.name; return; }
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
