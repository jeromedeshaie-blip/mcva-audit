# 10 — Supabase, Inngest, utils

**Module** : 10 — Supabase, Inngest, utils
**Version** : 2.1 (tag `v2.1-release`)

Helpers Supabase client/service-role, jobs Inngest scheduled (LLM Watch cron), utilitaires, constantes sector/quality.

---

## `src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

```


## `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}

/**
 * Service role client for server-side operations (Inngest, API routes).
 * Bypasses RLS.
 */
export function createServiceClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

```


## `src/lib/inngest/client.ts`

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "mcva-audit",
  name: "MCVA Audit Platform",
});

```


## `src/lib/inngest/functions.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { createGeoProvider } from "@/lib/providers/geo/geo-provider";
import { scoreItems, scoreCiteItems, aggregateScores, calculateSeoScore, scoreOneDimension, scoreOneCiteDimension, getCoreEeatDimensions, getCiteDimensions } from "@/lib/scoring/scorer";
import { scoreTheme, scoreThemeDimension, getThemeDimensions } from "@/lib/scoring/theme-scorer";
import { QUALITY_CONFIG } from "@/lib/constants";
import { GLOBAL_SCORE_WEIGHTS } from "@/types/audit";
import type { AuditTheme, QualityLevel, GeoData, SeoData } from "@/types/audit";
import * as cheerio from "cheerio";

// Site Audit imports
import { crawlUrl, checkRobotsTxt } from "@/lib/siteaudit/crawler";
import { runSeoChecks } from "@/lib/siteaudit/seo-checker";
import { getPageSpeedScore } from "@/lib/siteaudit/performance";
import { analyzeReadability } from "@/lib/siteaudit/readability";
import { computeGlobalScore, accessibilityViolationsToScore, readabilityToScore } from "@/lib/siteaudit/scoring";
import { generateRecommendations } from "@/lib/siteaudit/recommendations";
import type { AccessibilityViolation } from "@/lib/siteaudit/types";

// --- Shared helpers ---

async function updateAuditStatus(auditId: string, status: string, extra?: Record<string, unknown>) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("audits")
    .update({ status, ...extra })
    .eq("id", auditId);
  if (error) {
    console.error(`[audit:${auditId}] Failed to update status to ${status}:`, error.message);
    throw new Error(`DB update failed: ${error.message}`);
  }
}

async function scrapeHtml(url: string): Promise<string> {
  const fullUrl = url.startsWith("https://") || url.startsWith("http://") ? url : `https://${url}`;

  const response = await fetch(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0; +https://mcva.ch)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${fullUrl}`);
  }

  const html = await response.text();

  if (!html || html.length < 100) {
    throw new Error(`Contenu HTML vide ou insuffisant pour ${fullUrl}`);
  }

  return html;
}

/**
 * Audit Express — Inngest function
 *
 * Steps exécutés séquentiellement pour garantir la durabilité Inngest :
 * 1. Update status → 2. Scrape HTML → 3-6. SEO/GEO/Scoring (parallel via Promise.allSettled in step) → 7. Save
 * Duration: ~2-3 minutes
 */
export const runExpressAudit = inngest.createFunction(
  {
    id: "run-express-audit",
    name: "Run Express Audit",
    triggers: [{ event: "audit/express.requested" }],
    retries: 2,
    onFailure: async ({ event }: { event: any }) => {
      const auditId = event.data?.event?.data?.auditId
        ?? event.data?.auditId;
      console.error(`[onFailure:run-express-audit] auditId=${auditId}, error=${event.data?.error?.message || "unknown"}`);
      if (auditId) {
        try {
          await updateAuditStatus(auditId, "error");
        } catch (e) {
          console.error(`[audit:${auditId}] Failed to set error status on failure:`, e);
        }
      }
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { auditId, url, domain, sector, quality: rawQuality } = event.data as {
      auditId: string;
      url: string;
      domain: string;
      sector: string;
      quality?: string;
    };
    const quality = (rawQuality || "standard") as QualityLevel;

    // Step 1: Update status to processing
    await step.run("update-status-processing", async () => {
      await updateAuditStatus(auditId, "processing");
    });

    // Step 2: Scrape HTML
    const html = await step.run("scrape-html", async () => {
      return scrapeHtml(url);
    });

    // Steps 3-6: Each step.run individually (Inngest memoization-safe)
    const seoData = await step.run("fetch-seo-data", async () => {
      const seoProvider = await createSeoProvider();
      return seoProvider.getDomainOverview(domain);
    });

    const geoData = await step.run("fetch-geo-data", async () => {
      const geoProvider = await createGeoProvider();
      const brandName = extractBrandName(html, domain);
      return geoProvider.getAIVisibility(brandName, sector || "général", domain, quality);
    });

    const scoredItems = await step.run("score-core-eeat-express", async () => {
      return scoreItems(html, url, "express", quality);
    });

    const citeItems = await step.run("score-cite-express", async () => {
      return scoreCiteItems(html, url, "express", quality);
    });

    // Step 7: Aggregate scores and save
    await step.run("save-results", async () => {
      const supabase = createServiceClient();

      const coreEeatScores = aggregateScores(scoredItems);
      const citeScores = aggregateScores(citeItems);
      const scoreSeo = calculateSeoScore(coreEeatScores);
      const scoreGeo = geoData.ai_visibility_score ?? 0;

      const seoProvider = await createSeoProvider();

      // Save scores
      const { error: scoresError } = await supabase.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_core_eeat: coreEeatScores,
        score_cite: citeScores,
        seo_provider: seoProvider.name,
        seo_data: seoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: geoData,
        competitors: null,
      });

      if (scoresError) {
        console.error(`[audit:${auditId}] Failed to insert scores:`, scoresError.message);
        throw new Error(`DB insert scores failed: ${scoresError.message}`);
      }

      // Save individual items (CORE-EEAT + CITE)
      const allItems = [...scoredItems, ...citeItems];
      if (allItems.length > 0) {
        const { error: itemsError } = await supabase.from("audit_items").insert(
          allItems.map((item: any) => ({
            audit_id: auditId,
            ...item,
          }))
        );
        if (itemsError) {
          console.error(`[audit:${auditId}] Failed to insert items:`, itemsError.message);
          throw new Error(`DB insert items failed: ${itemsError.message}`);
        }
      }

      // Update audit status
      const { error: updateError } = await supabase
        .from("audits")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", auditId);

      if (updateError) {
        console.error(`[audit:${auditId}] Failed to complete audit:`, updateError.message);
        throw new Error(`DB update status failed: ${updateError.message}`);
      }
    });

    // Emit completion event (used by benchmark batch to track progress)
    await step.run("emit-completion-event", async () => {
      await inngest.send({
        name: "audit/express.completed",
        data: { auditId },
      });
    });

    return { auditId, status: "completed" };
  }
);

/**
 * Audit Complet — Inngest function
 *
 * Extends express audit with: full CORE-EEAT (80 items) + CITE (40 items) + action plan + competitors
 * Duration: ~5-15 minutes
 */
export const runFullAudit = inngest.createFunction(
  {
    id: "run-full-audit",
    name: "Run Full Audit",
    triggers: [{ event: "audit/full.requested" }],
    retries: 1,
    onFailure: async ({ event }: { event: any }) => {
      const auditId = event.data?.event?.data?.auditId
        ?? event.data?.auditId;
      console.error(`[onFailure:run-full-audit] auditId=${auditId}, error=${JSON.stringify(event.data?.error || "unknown")}`);
      if (auditId) {
        try {
          await updateAuditStatus(auditId, "error");
        } catch (e) {
          console.error(`[audit:${auditId}] onFailure: could not set error status:`, e);
        }
      }
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { auditId, url, domain, sector, quality: rawQuality } = event.data as {
      auditId: string;
      url: string;
      domain: string;
      sector: string;
      quality?: string;
    };
    const quality = (rawQuality || "standard") as QualityLevel;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;

    // ─── Step 1: Mark as processing ───
    await step.run("update-status", async () => {
      console.log(`[audit:${auditId}] Starting full audit for ${url} (quality=${quality})`);
      await updateAuditStatus(auditId, "processing");
    });

    // ─── Step 2: Scrape HTML (critical — audit cannot proceed without it) ───
    const html = await step.run("scrape-html", async () => {
      console.log(`[audit:${auditId}] Scraping HTML...`);
      const h = await scrapeHtml(url);
      console.log(`[audit:${auditId}] HTML scraped: ${h.length} chars`);
      return h;
    });

    // ─── Step 3: ALL data collection in ONE step (reduces Inngest step count) ───
    const collectedData = await step.run("collect-data", async () => {
      console.log(`[audit:${auditId}] Collecting SEO + GEO data...`);

      // Run all data collection in parallel with individual try/catch
      const [seoResult, geoResult, competitorsResult] = await Promise.allSettled([
        (async () => {
          const seoProvider = await createSeoProvider();
          return seoProvider.getDomainOverview(domain);
        })(),
        (async () => {
          const geoProvider = await createGeoProvider();
          const brandName = extractBrandName(html, domain);
          return geoProvider.getAIVisibility(brandName, sector || "général", domain, quality);
        })(),
        (async () => {
          const seoProvider = await createSeoProvider();
          return seoProvider.getCompetitors(domain);
        })(),
      ]);

      const seoData = seoResult.status === "fulfilled" ? seoResult.value : null;
      const geoData = geoResult.status === "fulfilled" ? geoResult.value : null;
      const competitors = competitorsResult.status === "fulfilled" ? competitorsResult.value : null;

      if (seoResult.status === "rejected") console.error(`[audit:${auditId}] SEO data failed:`, seoResult.reason?.message);
      if (geoResult.status === "rejected") console.error(`[audit:${auditId}] GEO data failed:`, geoResult.reason?.message);

      console.log(`[audit:${auditId}] Data collected: SEO=${!!seoData}, GEO=${!!geoData}`);

      return {
        seoData: seoData || getEmptySeoData(),
        geoData: geoData || getEmptyGeoData(),
        competitors,
      };
    });

    // ─── Step 4: CORE-EEAT scoring (ALL dimensions in ONE step) ───
    const scoredItems = await step.run("score-core-eeat-all", async () => {
      console.log(`[audit:${auditId}] Scoring CORE-EEAT...`);
      try {
        const items = await scoreItems(html, url, "full", quality);
        console.log(`[audit:${auditId}] CORE-EEAT: ${items.length} items scored`);
        return items;
      } catch (e: any) {
        console.error(`[audit:${auditId}] CORE-EEAT scoring failed:`, e.message);
        return [];
      }
    });

    // ─── Step 5: CITE scoring (ALL dimensions in ONE step) ───
    const citeItems = await step.run("score-cite-all", async () => {
      console.log(`[audit:${auditId}] Scoring CITE...`);
      try {
        const items = await scoreCiteItems(html, url, "full", quality);
        console.log(`[audit:${auditId}] CITE: ${items.length} items scored`);
        return items;
      } catch (e: any) {
        console.error(`[audit:${auditId}] CITE scoring failed:`, e.message);
        return [];
      }
    });

    // ─── Step 6: Site Audit technical checks (ALL in ONE step, no LLM) ───
    const siteAuditData = await step.run("siteaudit-all", async () => {
      console.log(`[audit:${auditId}] Running site audit...`);
      try {
        const [crawlData, robots] = await Promise.allSettled([
          crawlUrl(fullUrl),
          checkRobotsTxt(fullUrl),
        ]);

        const crawl = crawlData.status === "fulfilled" ? crawlData.value : null;
        const robotsResult = robots.status === "fulfilled" ? robots.value : { exists: false, hasSitemap: false, sitemapUrl: null, blocksAll: false };

        let seoChecks = { checks: [] as any[], score: 0, schemaData: null as any };
        if (crawl) {
          seoChecks = runSeoChecks(crawl, robotsResult);
        }

        // PageSpeed (with short timeout)
        let perf = { score: 0, mobile: null as any, desktop: null as any };
        try {
          perf = await getPageSpeedScore(fullUrl) as any;
        } catch (e: any) {
          console.warn(`[audit:${auditId}] PageSpeed failed:`, e.message);
        }

        // Readability
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
          performance: perf.score || 0,
          accessibility: accessibilityViolationsToScore(violations),
          readability: readabilityToScore(readabilityData.flesch_score, readabilityData.word_count),
        };
        const globalTechScore = computeGlobalScore(scores);
        const techRecommendations = generateRecommendations(
          seoChecks.checks as any, perf.mobile as any, violations as any, scores
        );

        console.log(`[audit:${auditId}] Site audit done: global=${globalTechScore}`);

        return {
          scores,
          globalTechScore,
          techRecommendations,
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
      } catch (e: any) {
        console.error(`[audit:${auditId}] Site audit failed entirely:`, e.message);
        return null;
      }
    });

    // ─── Step 7: Generate action plan (LLM, optional) ───
    const allScoredItems = [...scoredItems, ...citeItems];
    const actions = await step.run("generate-action-plan", async () => {
      if (allScoredItems.length === 0) {
        console.warn(`[audit:${auditId}] No scored items, skipping action plan`);
        return [];
      }
      try {
        console.log(`[audit:${auditId}] Generating action plan...`);
        return await generateActionPlan(
          allScoredItems, collectedData.seoData as SeoData, collectedData.geoData as GeoData, url, quality
        );
      } catch (e: any) {
        console.error(`[audit:${auditId}] Action plan failed:`, e.message);
        return [];
      }
    });

    // ─── Step 8: SAVE EVERYTHING in one step (atomic, reliable) ───
    await step.run("save-all-results", async () => {
      console.log(`[audit:${auditId}] Saving all results...`);
      const supabase = createServiceClient();

      const coreEeatScores = aggregateScores(scoredItems);
      const citeScores = aggregateScores(citeItems);
      const scoreSeo = calculateSeoScore(coreEeatScores);
      const scoreGeo = (collectedData.geoData as any).ai_visibility_score ?? 0;
      const seoProvider = await createSeoProvider();

      // Build enriched SEO data
      const enrichedSeoData = {
        ...(collectedData.seoData as any),
        technical_checks: siteAuditData?.seoChecks?.checks || [],
        schema_detail: siteAuditData?.seoChecks?.schemaData || null,
        readability: siteAuditData?.readabilityData ? {
          flesch_score: siteAuditData.readabilityData.flesch_score,
          flesch_level: siteAuditData.readabilityData.flesch_level,
          lang_detected: siteAuditData.readabilityData.lang_detected,
          avg_sentence_length: siteAuditData.readabilityData.avg_sentence_length,
          avg_word_length: siteAuditData.readabilityData.avg_word_length,
          word_count: siteAuditData.readabilityData.word_count,
        } : null,
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

      // 1. Save scores
      const { error: scoresErr } = await supabase.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_core_eeat: coreEeatScores,
        score_cite: citeScores,
        seo_provider: seoProvider.name,
        seo_data: enrichedSeoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: collectedData.geoData,
        competitors: collectedData.competitors,
      });
      if (scoresErr) {
        console.error(`[audit:${auditId}] save scores failed:`, scoresErr.message);
        throw new Error(`DB scores: ${scoresErr.message}`);
      }

      // 2. Save items
      if (allScoredItems.length > 0) {
        const { error: itemsErr } = await supabase.from("audit_items").insert(
          allScoredItems.map((item: any) => ({ audit_id: auditId, ...item }))
        );
        if (itemsErr) console.error(`[audit:${auditId}] save items failed:`, itemsErr.message);
      }

      // 3. Save actions (technical + LLM)
      const techActions = (siteAuditData?.techRecommendations || []).map((rec: any) => ({
        priority: rec.priority === "critical" ? "P1" : rec.priority === "high" ? "P2" : rec.priority === "medium" ? "P3" : "P4",
        title: rec.title,
        description: `${rec.description}\n\nAction : ${rec.action}`,
        impact_points: rec.impact_points,
        effort: rec.effort === "low" ? "< 1h" : rec.effort === "medium" ? "1-2 jours" : "1 semaine",
        category: rec.dimension === "geo" ? "GEO" : rec.dimension === "performance" ? "technique" : rec.dimension === "accessibility" ? "technique" : "SEO",
      }));
      const allActions = [...actions, ...techActions];
      if (allActions.length > 0) {
        const { error: actErr } = await supabase.from("audit_actions").insert(
          allActions.map((a: any) => ({ audit_id: auditId, ...a }))
        );
        if (actErr) console.error(`[audit:${auditId}] save actions failed:`, actErr.message);
      }

      // 4. Mark completed
      const { error: completeErr } = await supabase
        .from("audits")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", auditId);
      if (completeErr) {
        throw new Error(`DB complete: ${completeErr.message}`);
      }

      console.log(`[audit:${auditId}] COMPLETED — SEO=${scoreSeo}, GEO=${scoreGeo}, items=${allScoredItems.length}, actions=${allActions.length}`);
    });

    return { auditId, status: "completed" };
  }
);

// Helper: empty fallback data structures
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

// --- Helpers ---

function extractBrandName(html: string, domain: string): string {
  const $ = cheerio.load(html);

  // Try og:site_name first
  const siteName = $('meta[property="og:site_name"]').attr("content");
  if (siteName) return siteName;

  // Try Organization schema (including @graph arrays)
  let orgName: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (orgName) return;
    try {
      const json = JSON.parse($(el).html() || "");
      // Direct Organization
      if (json?.["@type"] === "Organization" && json.name) {
        orgName = json.name;
        return;
      }
      // @graph array
      if (Array.isArray(json?.["@graph"])) {
        const org = json["@graph"].find((item: any) => item?.["@type"] === "Organization" && item.name);
        if (org) {
          orgName = org.name;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  if (orgName) return orgName;

  // Fallback: domain without TLD (improved regex for more TLDs)
  return domain
    .replace(/\.(com|fr|ch|io|org|net|de|co\.uk|co|tech|ai|dev|app|info|biz)$/i, "")
    .replace(/\./g, " ")
    .trim();
}

async function generateActionPlan(
  items: Array<{ item_code: string; item_label: string; status: string; score: number; notes: string | null; dimension?: string; framework?: string }>,
  seoData: SeoData,
  geoData: GeoData,
  url: string,
  quality: QualityLevel = "standard"
): Promise<Array<{
  priority: "P1" | "P2" | "P3" | "P4";
  title: string;
  description: string;
  impact_points: number;
  effort: string;
  category: string;
}>> {
  const config = QUALITY_CONFIG[quality];

  // Build context for the LLM
  const failedItems = items
    .filter((item) => item.status !== "pass")
    .sort((a, b) => a.score - b.score);

  const passedItems = items.filter((item) => item.status === "pass");

  const coreEeatFails = failedItems.filter((i) => !i.item_code.startsWith("CI-"));
  const citeFails = failedItems.filter((i) => i.item_code.startsWith("CI-"));

  // Summarize SEO data context
  const seoContext = [
    seoData.meta_title ? `Title: "${seoData.meta_title}"` : "Title: manquant",
    seoData.meta_description ? `Meta desc: "${seoData.meta_description}"` : "Meta desc: manquante",
    `H1: ${seoData.h1_count}, H2: ${seoData.h2_count}`,
    `Schema.org: ${seoData.has_schema_org ? seoData.schema_types.join(", ") : "aucun"}`,
    `Liens internes: ${seoData.internal_links_count}, externes: ${seoData.external_links_count}`,
    `Images sans alt: ${seoData.images_without_alt}`,
    seoData.page_speed_score !== null ? `PageSpeed: ${seoData.page_speed_score}/100` : null,
    seoData.core_web_vitals?.lcp ? `LCP: ${seoData.core_web_vitals.lcp}ms` : null,
    seoData.core_web_vitals?.cls !== null ? `CLS: ${seoData.core_web_vitals?.cls}` : null,
  ].filter(Boolean).join("\n");

  // Summarize GEO data context
  const geoContext = [
    `Score visibilité IA: ${geoData.ai_visibility_score}/100`,
    `Marque mentionnée: ${geoData.brand_mentioned ? "oui" : "non"}`,
    `Sentiment: ${geoData.brand_sentiment}`,
    `Citations: ${geoData.citation_count} sur ${geoData.models_coverage} modèles testés`,
    ...geoData.models_tested
      .filter((m) => m._actually_tested !== false)
      .map((m) => `  - ${m.model}: ${m.mentioned ? `mentionné (position: ${m.mention_position}, score: ${m.quality_score}/100)` : "non mentionné"}`),
  ].join("\n");

  const itemsSummary = failedItems
    .slice(0, 30) // Most critical 30
    .map((i) => `[${i.item_code}] ${i.item_label} — score: ${i.score}/100 — ${i.notes || "pas de notes"}`)
    .join("\n");

  const prompt = `Tu es un consultant SEO/GEO senior chez MCVA Consulting, spécialisé en stratégie de visibilité digitale et IA. Tu rédiges le plan d'action d'un audit complet pour un client.

URL auditée : ${url}

## SCORES DE L'AUDIT
- Items réussis : ${passedItems.length}/${items.length}
- Items en échec ou partiels : ${failedItems.length}/${items.length}
- CORE-EEAT en échec : ${coreEeatFails.length} items
- CITE en échec : ${citeFails.length} items

## DONNÉES SEO
${seoContext}

## DONNÉES GEO (Visibilité IA)
${geoContext}

## CRITÈRES EN ÉCHEC (les plus critiques)
${itemsSummary}

---

Génère un plan d'action stratégique de 10 à 15 recommandations. Chaque recommandation doit être :

1. **Stratégique** : regroupe plusieurs critères liés en une action cohérente (ne répète PAS chaque critère individuellement)
2. **Concrète** : donne des instructions précises et actionnables (pas de généralités)
3. **Priorisée** : commence par les quick wins à fort impact

Pour chaque action, réponds en JSON strict :
[
  {
    "priority": "P1",
    "title": "Titre concis et professionnel (max 60 chars)",
    "description": "Description détaillée en 2-4 phrases. Explique le problème constaté, la solution recommandée avec des étapes concrètes, et l'impact attendu sur le SEO et/ou la visibilité IA.",
    "impact_points": 15,
    "effort": "2-3 jours",
    "category": "technique"
  }
]

Règles :
- priority : P1 = critique (faire immédiatement), P2 = important (cette semaine), P3 = recommandé (ce mois), P4 = optimisation (ce trimestre)
- impact_points : estimation réaliste de l'amélioration du score global (1-25 pts)
- effort : durée réaliste ("< 1h", "1-2h", "1 jour", "2-3 jours", "1 semaine", "2-4 semaines")
- category : "technique", "contenu", "GEO", "notoriete", ou "SEO"
- Inclus obligatoirement au moins 2 actions spécifiques GEO (visibilité dans les moteurs IA)
- Les titres doivent être professionnels (style cabinet de conseil), pas "Améliorer X"
- Commence par les quick wins P1, termine par les actions P4 long terme

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ni après.`;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: config.scoringModel,
      max_tokens: 4000,
      temperature: 0.2, // Slight creativity for better recommendations
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content[0];
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (!text) {
      console.warn("[action-plan] Empty LLM response, falling back to basic plan");
      return generateFallbackActionPlan(failedItems);
    }

    // Parse JSON
    const parsed = safeParseJsonActions(text);
    if (!parsed || parsed.length === 0) {
      console.warn("[action-plan] Failed to parse LLM response, falling back");
      return generateFallbackActionPlan(failedItems);
    }

    // Validate and sanitize
    const validPriorities = ["P1", "P2", "P3", "P4"];
    const validCategories = ["technique", "contenu", "GEO", "notoriete", "SEO"];

    return parsed.slice(0, 15).map((action: any) => ({
      priority: validPriorities.includes(action.priority) ? action.priority : "P3",
      title: typeof action.title === "string" ? action.title.slice(0, 120) : "Action recommandée",
      description: typeof action.description === "string" ? action.description.slice(0, 600) : "",
      impact_points: typeof action.impact_points === "number" ? Math.min(25, Math.max(1, Math.round(action.impact_points))) : 5,
      effort: typeof action.effort === "string" ? action.effort.slice(0, 30) : "1-2 jours",
      category: validCategories.includes(action.category) ? action.category : "SEO",
    }));
  } catch (error) {
    console.error("[action-plan] LLM generation failed:", error);
    return generateFallbackActionPlan(failedItems);
  }
}

function safeParseJsonActions(text: string): any[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* fall through */ }

  const match = text.match(/\[[\s\S]*?\](?=[^[\]]*$)/);
  if (!match) {
    const greedyMatch = text.match(/\[[\s\S]*\]/);
    if (!greedyMatch) return null;
    try {
      const parsed = JSON.parse(greedyMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { return null; }
  }

  try {
    const parsed = JSON.parse(match![0]);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* fall through */ }

  return null;
}

/** Fallback when LLM is unavailable */
function generateFallbackActionPlan(
  failedItems: Array<{ item_code: string; item_label: string; status: string; score: number; notes: string | null }>
): Array<{
  priority: "P1" | "P2" | "P3" | "P4";
  title: string;
  description: string;
  impact_points: number;
  effort: string;
  category: string;
}> {
  return failedItems
    .sort((a, b) => a.score - b.score)
    .slice(0, 15)
    .map((item, idx) => ({
      priority: (idx < 3 ? "P1" : idx < 7 ? "P2" : idx < 12 ? "P3" : "P4") as "P1" | "P2" | "P3" | "P4",
      title: `Améliorer : ${item.item_label}`,
      description: item.notes || `Le critère ${item.item_code} nécessite une amélioration.`,
      impact_points: Math.max(1, Math.round((100 - item.score) / 5)),
      effort: item.score < 25 ? "2-3 jours" : "1-2h",
      category: categorizeItem(item.item_code),
    }));
}

function categorizeItem(code: string): string {
  // CITE items: CI-C01, CI-I01, CI-T01, CI-E01
  if (code.startsWith("CI-")) {
    const citeDim = code.charAt(3);
    const citeMap: Record<string, string> = {
      C: "notoriete",
      I: "notoriete",
      T: "contenu",
      E: "contenu",
    };
    return citeMap[citeDim] || "SEO";
  }
  // CORE-EEAT items
  const prefix = code.replace(/\d+$/, "");
  const map: Record<string, string> = {
    C: "contenu",
    O: "technique",
    R: "notoriete",
    E: "contenu",
    Exp: "contenu",
    Ept: "contenu",
    A: "notoriete",
    T: "technique",
  };
  return map[prefix] || "SEO";
}

/**
 * Benchmark Batch — Inngest function
 *
 * Lance N audits eco en parallèle pour tous les domaines d'un benchmark,
 * puis calcule les classements SEO/GEO une fois tous les audits terminés.
 */
export const runBenchmarkBatch = inngest.createFunction(
  {
    id: "run-benchmark-batch",
    name: "Run Benchmark Batch",
    triggers: [{ event: "benchmark/batch.requested" }],
    onFailure: async ({ event }: { event: any }) => {
      const benchmarkId = event.data?.event?.data?.benchmarkId;
      if (benchmarkId) {
        try {
          const supabase = createServiceClient();
          await supabase
            .from("benchmarks")
            .update({ status: "error" })
            .eq("id", benchmarkId);
        } catch (e) {
          console.error(`[benchmark:${benchmarkId}] Failed to set error status:`, e);
        }
      }
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { benchmarkId } = event.data as { benchmarkId: string };
    const supabase = createServiceClient();

    // Step 1: Set benchmark to running
    await step.run("update-status-running", async () => {
      await supabase
        .from("benchmarks")
        .update({ status: "running" })
        .eq("id", benchmarkId);
    });

    // Step 2: Fetch all domains
    const domains = await step.run("fetch-domains", async () => {
      const { data, error } = await supabase
        .from("benchmark_domains")
        .select("*")
        .eq("benchmark_id", benchmarkId);
      if (error) throw new Error(`Failed to fetch domains: ${error.message}`);
      return data || [];
    });

    // Step 3: Fetch benchmark info for sector
    const benchmark = await step.run("fetch-benchmark", async () => {
      const { data, error } = await supabase
        .from("benchmarks")
        .select("*")
        .eq("id", benchmarkId)
        .single();
      if (error) throw new Error(`Failed to fetch benchmark: ${error.message}`);
      return data;
    });

    // Step 4: Launch eco audits for each domain
    const auditIds: Array<{ domainId: string; auditId: string }> = [];

    for (const domain of domains) {
      const result = await step.run(`launch-audit-${domain.domain}`, async () => {
        // Create audit row
        const { data: audit, error: auditError } = await supabase
          .from("audits")
          .insert({
            url: domain.url,
            domain: domain.domain,
            sector: benchmark.sub_category,
            audit_type: "express",
            status: "pending",
            parent_audit_id: null,
            created_by: benchmark.created_by,
          })
          .select()
          .single();

        if (auditError) throw new Error(`Failed to create audit for ${domain.domain}: ${auditError.message}`);

        // Link audit to benchmark_domain
        await supabase
          .from("benchmark_domains")
          .update({ audit_id: audit.id })
          .eq("id", domain.id);

        // Send express audit event with eco quality
        await inngest.send({
          name: "audit/express.requested",
          data: {
            auditId: audit.id,
            url: audit.url,
            domain: audit.domain,
            sector: audit.sector,
            quality: "eco",
          },
        });

        return { domainId: domain.id, auditId: audit.id };
      });

      auditIds.push(result);
    }

    // Step 5: Wait for all audits to complete (poll every 15s, max 25 min)
    await step.run("wait-for-audits", async () => {
      const maxWaitMs = 25 * 60 * 1000;
      const pollIntervalMs = 15000;
      const startTime = Date.now();
      const allAuditIds = auditIds.map((a) => a.auditId);

      while (Date.now() - startTime < maxWaitMs) {
        const { data: audits } = await supabase
          .from("audits")
          .select("id, status")
          .in("id", allAuditIds);

        if (!audits) {
          await new Promise((r) => setTimeout(r, pollIntervalMs));
          continue;
        }

        const completed = audits.filter((a: any) => a.status === "completed" || a.status === "error");

        // Update progress
        await supabase
          .from("benchmarks")
          .update({ completed_count: completed.length })
          .eq("id", benchmarkId);

        if (completed.length >= allAuditIds.length) break;

        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }
    });

    // Step 6: Compute rankings
    await step.run("compute-rankings", async () => {
      const allAuditIds = auditIds.map((a) => a.auditId);

      // Fetch scores for all audits
      const { data: allScores } = await supabase
        .from("audit_scores")
        .select("audit_id, score_seo, score_geo")
        .in("audit_id", allAuditIds);

      const scoresMap = new Map((allScores || []).map((s: any) => [s.audit_id, s]));

      // Build ranking data
      const rankingData = auditIds.map(({ domainId, auditId }) => {
        const scores: any = scoresMap.get(auditId);
        return {
          domainId,
          auditId,
          score_seo: scores?.score_seo ?? 0,
          score_geo: scores?.score_geo ?? 0,
        };
      });

      // Sort by SEO score desc → assign ranks
      const bySeo = [...rankingData].sort((a, b) => b.score_seo - a.score_seo);
      const byGeo = [...rankingData].sort((a, b) => b.score_geo - a.score_geo);

      const seoRanks = new Map(bySeo.map((item, idx) => [item.domainId, idx + 1]));
      const geoRanks = new Map(byGeo.map((item, idx) => [item.domainId, idx + 1]));

      // Update each benchmark_domain with scores and ranks
      for (const item of rankingData) {
        await supabase
          .from("benchmark_domains")
          .update({
            score_seo: item.score_seo,
            score_geo: item.score_geo,
            rank_seo: seoRanks.get(item.domainId),
            rank_geo: geoRanks.get(item.domainId),
          })
          .eq("id", item.domainId);
      }

      // Mark benchmark as completed
      await supabase
        .from("benchmarks")
        .update({
          status: "completed",
          completed_count: rankingData.length,
          completed_at: new Date().toISOString(),
        })
        .eq("id", benchmarkId);
    });

    return { benchmarkId, status: "completed", domains: domains.length };
  }
);

// --- Ultra Audit helpers ---

/** Average of an array of numbers */
function avgScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Compute weighted global score from per-theme scores using GLOBAL_SCORE_WEIGHTS */
function computeWeightedGlobal(themeScores: Partial<Record<AuditTheme, number>>): number {
  let weighted = 0;
  let totalWeight = 0;
  for (const [theme, weight] of Object.entries(GLOBAL_SCORE_WEIGHTS)) {
    const score = themeScores[theme as AuditTheme];
    if (score !== undefined && score !== null) {
      weighted += score * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
}

/**
 * Ultra Audit — Inngest function
 *
 * Full 7-theme audit with detailed notes, step-per-dimension pattern:
 * 1. Update status
 * 2. Scrape HTML
 * 3. Collect SEO/GEO data in parallel
 * 4. Score CORE-EEAT (1 step per dimension)
 * 5. Score CITE (1 step per dimension)
 * 6. Score 5 theme dimensions (perf, a11y, rgesn, tech, contenu) — 1 step per theme
 * 7. Generate action plan
 * 8. Aggregate & save everything
 * Duration: ~10-20 minutes
 */
export const runUltraAudit = inngest.createFunction(
  {
    id: "run-ultra-audit",
    name: "Run Ultra Audit",
    triggers: [{ event: "audit/ultra.requested" }],
    retries: 1,
    onFailure: async ({ event }: { event: any }) => {
      const auditId = event.data?.event?.data?.auditId
        ?? event.data?.auditId;
      console.error(`[onFailure:run-ultra-audit] auditId=${auditId}, error=${JSON.stringify(event.data?.error || "unknown")}`);
      if (auditId) {
        try {
          await updateAuditStatus(auditId, "error");
        } catch (e) {
          console.error(`[audit:${auditId}] onFailure: could not set error status:`, e);
        }
      }
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { auditId, url, domain, sector, quality: rawQuality } = event.data as {
      auditId: string;
      url: string;
      domain: string;
      sector: string;
      quality?: string;
    };
    const quality = "ultra" as const;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;

    // ─── Step 1: Mark as processing ───
    await step.run("update-status", async () => {
      console.log(`[audit:${auditId}] Starting ultra audit for ${url}`);
      await updateAuditStatus(auditId, "processing");
    });

    // ─── Step 2: Scrape HTML ───
    const html = await step.run("scrape-html", async () => {
      console.log(`[audit:${auditId}] Scraping HTML...`);
      const h = await scrapeHtml(url);
      console.log(`[audit:${auditId}] HTML scraped: ${h.length} chars`);
      return h;
    });

    // ─── Step 3: Collect SEO + GEO data in parallel ───
    const collectedData = await step.run("collect-data", async () => {
      console.log(`[audit:${auditId}] Collecting SEO + GEO data...`);

      const [seoResult, geoResult, competitorsResult] = await Promise.allSettled([
        (async () => {
          const seoProvider = await createSeoProvider();
          return seoProvider.getDomainOverview(domain);
        })(),
        (async () => {
          const geoProvider = await createGeoProvider();
          const brandName = extractBrandName(html, domain);
          return geoProvider.getAIVisibility(brandName, sector || "général", domain, quality);
        })(),
        (async () => {
          const seoProvider = await createSeoProvider();
          return seoProvider.getCompetitors(domain);
        })(),
      ]);

      const seoData = seoResult.status === "fulfilled" ? seoResult.value : null;
      const geoData = geoResult.status === "fulfilled" ? geoResult.value : null;
      const competitors = competitorsResult.status === "fulfilled" ? competitorsResult.value : null;

      if (seoResult.status === "rejected") console.error(`[audit:${auditId}] SEO data failed:`, seoResult.reason?.message);
      if (geoResult.status === "rejected") console.error(`[audit:${auditId}] GEO data failed:`, geoResult.reason?.message);

      return {
        seoData: seoData || getEmptySeoData(),
        geoData: geoData || getEmptyGeoData(),
        competitors,
      };
    });

    // ─── Step 4: CORE-EEAT scoring — 1 step per dimension ───
    const coreEeatDims = getCoreEeatDimensions("full");
    const coreEeatAllItems: Array<any> = [];

    for (const dim of coreEeatDims) {
      const dimItems = await step.run(`score-core-eeat-${dim}`, async () => {
        console.log(`[audit:${auditId}] Scoring CORE-EEAT dimension ${dim}...`);
        try {
          return await scoreOneDimension(html, url, dim, "full", quality);
        } catch (e: any) {
          console.error(`[audit:${auditId}] CORE-EEAT ${dim} failed:`, e.message);
          return [];
        }
      });
      coreEeatAllItems.push(...dimItems);
    }

    // ─── Step 5: CITE scoring — 1 step per dimension ───
    const citeDims = getCiteDimensions("full");
    const citeAllItems: Array<any> = [];

    for (const dim of citeDims) {
      const dimItems = await step.run(`score-cite-${dim}`, async () => {
        console.log(`[audit:${auditId}] Scoring CITE dimension ${dim}...`);
        try {
          return await scoreOneCiteDimension(html, url, dim, "full", quality);
        } catch (e: any) {
          console.error(`[audit:${auditId}] CITE ${dim} failed:`, e.message);
          return [];
        }
      });
      citeAllItems.push(...dimItems);
    }

    // ─── Step 6: Score 5 themes — 1 step per DIMENSION (not per theme) ───
    // Each step = 1 dimension = 1-5 items = 1 LLM call → fits in 60s
    const ultraThemes = ["perf", "a11y", "rgesn", "tech", "contenu"] as const;
    const themeAllItems: Array<any> = [];

    for (const theme of ultraThemes) {
      const dims = getThemeDimensions(theme, "full");
      for (const dim of dims) {
        const dimItems = await step.run(`score-${theme}-${dim}`, async () => {
          console.log(`[audit:${auditId}] Scoring ${theme}/${dim}...`);
          try {
            return await scoreThemeDimension(theme, dim, html, url, "full", quality);
          } catch (e: any) {
            console.error(`[audit:${auditId}] ${theme}/${dim} failed:`, e.message);
            return [];
          }
        });
        themeAllItems.push(...dimItems);
      }
    }

    // ─── Step 7: Generate action plan ───
    const allScoredItems = [...coreEeatAllItems, ...citeAllItems, ...themeAllItems];

    const actions = await step.run("generate-action-plan", async () => {
      if (allScoredItems.length === 0) {
        console.warn(`[audit:${auditId}] No scored items, skipping action plan`);
        return [];
      }
      try {
        console.log(`[audit:${auditId}] Generating ultra action plan...`);
        return await generateActionPlan(
          allScoredItems, collectedData.seoData as SeoData, collectedData.geoData as GeoData, url, quality
        );
      } catch (e: any) {
        console.error(`[audit:${auditId}] Action plan failed:`, e.message);
        return [];
      }
    });

    // ─── Step 8: Aggregate all scores & save everything ───
    await step.run("save-all-results", async () => {
      console.log(`[audit:${auditId}] Saving all ultra results...`);
      const supabase = createServiceClient();

      // CORE-EEAT & CITE aggregate scores
      const coreEeatScores = aggregateScores(coreEeatAllItems);
      const citeScores = aggregateScores(citeAllItems);
      const scoreSeo = calculateSeoScore(coreEeatScores);
      const scoreGeo = (collectedData.geoData as any).ai_visibility_score ?? 0;

      // Theme scores — compute from themeAllItems
      function themeAvg(fw: string): number {
        const items = themeAllItems.filter((i: any) => i.framework === fw);
        if (items.length === 0) return 0;
        return Math.round(items.reduce((s: number, i: any) => s + (i.score || 0), 0) / items.length);
      }
      const scorePerf = themeAvg("perf");
      const scoreA11y = themeAvg("a11y");
      const scoreRgesn = themeAvg("rgesn");
      const scoreTech = themeAvg("tech");
      const scoreContenu = themeAvg("contenu");

      // Weighted global score
      const themeScoresMap: Partial<Record<AuditTheme, number>> = {
        seo: scoreSeo,
        geo: scoreGeo,
        perf: scorePerf,
        a11y: scoreA11y,
        rgesn: scoreRgesn,
        tech: scoreTech,
        contenu: scoreContenu,
      };
      const scoreGlobal = computeWeightedGlobal(themeScoresMap);

      const seoProvider = await createSeoProvider();

      // 1. Save scores (all 7 + global)
      const { error: scoresErr } = await supabase.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_perf: scorePerf,
        score_a11y: scoreA11y,
        score_rgesn: scoreRgesn,
        score_tech: scoreTech,
        score_contenu: scoreContenu,
        score_global: scoreGlobal,
        score_core_eeat: coreEeatScores,
        score_cite: citeScores,
        seo_provider: seoProvider.name,
        seo_data: collectedData.seoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: collectedData.geoData,
        competitors: collectedData.competitors,
      });
      if (scoresErr) {
        console.error(`[audit:${auditId}] save scores failed:`, scoresErr.message);
        throw new Error(`DB scores: ${scoresErr.message}`);
      }

      // 2. Save all items (CORE-EEAT + CITE + themes)
      if (allScoredItems.length > 0) {
        const { error: itemsErr } = await supabase.from("audit_items").insert(
          allScoredItems.map((item: any) => ({ audit_id: auditId, ...item }))
        );
        if (itemsErr) console.error(`[audit:${auditId}] save items failed:`, itemsErr.message);
      }

      // 3. Save actions
      if (actions.length > 0) {
        const { error: actErr } = await supabase.from("audit_actions").insert(
          actions.map((a: any) => ({ audit_id: auditId, ...a }))
        );
        if (actErr) console.error(`[audit:${auditId}] save actions failed:`, actErr.message);
      }

      // 4. Mark completed
      const { error: completeErr } = await supabase
        .from("audits")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", auditId);
      if (completeErr) {
        throw new Error(`DB complete: ${completeErr.message}`);
      }

      console.log(
        `[audit:${auditId}] ULTRA COMPLETED — SEO=${scoreSeo}, GEO=${scoreGeo}, ` +
        `perf=${scorePerf}, a11y=${scoreA11y}, rgesn=${scoreRgesn}, tech=${scoreTech}, ` +
        `contenu=${scoreContenu}, global=${scoreGlobal}, items=${allScoredItems.length}, actions=${actions.length}`
      );
    });

    return { auditId, status: "completed" };
  }
);

// ============================================================
// LLM Watch — Scheduled monitoring
// ============================================================

/**
 * LLM Watch scheduler — runs every Monday at 06:00 UTC.
 * Iterates all active clients with non-manual frequency,
 * checks if they are due for monitoring, and triggers runs.
 */
export const runLlmWatchScheduler = inngest.createFunction(
  {
    id: "llmwatch-scheduler",
    name: "LLM Watch Scheduler",
    triggers: [
      { cron: "0 6 * * 1" }, // Every Monday at 06:00 UTC
      { event: "llmwatch/scheduler.trigger" }, // Manual trigger via event
    ],
  },
  async ({ step }) => {
    const results = await step.run("run-all-monitoring", async () => {
      // Dynamic import to avoid circular deps
      const { runAllMonitoring } = await import("@/lib/monitor");
      return runAllMonitoring();
    });

    return {
      status: "completed",
      clientsProcessed: results.length,
      results: results.map((r) => ({
        client: r.clientName,
        score: r.score.scoreGeo,
        status: r.status,
      })),
    };
  }
);

/**
 * LLM Watch — single client monitoring triggered via event.
 * Used by the admin UI "Lancer maintenant" button.
 */
export const runLlmWatchClient = inngest.createFunction(
  {
    id: "llmwatch-run-client",
    name: "LLM Watch Run Client",
    triggers: [{ event: "llmwatch/client.run" }],
  },
  async ({ event, step }) => {
    const { clientId, level } = event.data as { clientId: string; level?: string };

    const result = await step.run("run-monitoring", async () => {
      const { runMonitoring } = await import("@/lib/monitor");
      const { QualityLevel } = await import("@/lib/constants") as any;
      return runMonitoring(clientId, (level || "standard") as any);
    });

    return {
      status: result.status,
      clientName: result.clientName,
      scoreGeo: result.score.scoreGeo,
      duration: result.duration,
      totalCost: result.totalCost,
    };
  }
);

export const functions = [runExpressAudit, runFullAudit, runUltraAudit, runBenchmarkBatch, runLlmWatchScheduler, runLlmWatchClient];

```


## `src/lib/constants.ts`

```typescript
/**
 * Shared constants for the MCVA Audit Platform.
 *
 * NOTE: Scoring weights (CORE-EEAT, CITE, themes) and versioning live in
 * src/lib/scoring/constants.ts — aligned with POLE-PERFORMANCE.md v2.1.
 * This file covers sector taxonomy, quality config, and LLM Watch run config.
 */

export interface SectorGroup {
  value: string;
  label: string;
  subSectors: { value: string; label: string }[];
}

export const SECTOR_GROUPS: SectorGroup[] = [
  {
    value: "agriculture",
    label: "Agriculture & viticulture",
    subSectors: [
      { value: "agri-montagne", label: "Agriculture de montagne & elevage" },
      { value: "agri-arboriculture", label: "Cultures maraicheres & arboriculture" },
      { value: "agri-foresterie", label: "Foresterie & bois" },
      { value: "agri-viticulture", label: "Viticulture & oenologie" },
    ],
  },
  {
    value: "commerce",
    label: "Commerce & distribution",
    subSectors: [
      { value: "commerce-ecommerce", label: "E-commerce" },
      { value: "commerce-gros", label: "Commerce de gros & negoce international" },
      { value: "commerce-distribution", label: "Grande distribution & retail" },
      { value: "commerce-luxe", label: "Luxe & mode" },
    ],
  },
  {
    value: "construction",
    label: "Construction & immobilier",
    subSectors: [
      { value: "construction-archi", label: "Architecture & bureaux d'etudes" },
      { value: "construction-gc", label: "Construction & genie civil" },
      { value: "construction-facility", label: "Facility management" },
      { value: "construction-promotion", label: "Promotion immobiliere" },
      { value: "construction-regie", label: "Regie & gestion immobiliere" },
    ],
  },
  {
    value: "energie",
    label: "Energie & environnement",
    subSectors: [
      { value: "energie-cleantech", label: "Cleantech & gestion des dechets" },
      { value: "energie-hydro", label: "Hydroelectricite" },
      { value: "energie-ingenierie", label: "Ingenierie environnementale" },
      { value: "energie-solaire", label: "Solaire & eolien" },
      { value: "energie-utilities", label: "Utilities & distribution (gaz, eau, electricite)" },
    ],
  },
  {
    value: "finance",
    label: "Finance & assurances",
    subSectors: [
      { value: "finance-assurance", label: "Assurances (vie, non-vie, reassurance)" },
      { value: "finance-banque", label: "Banque de detail & privee" },
      { value: "finance-fintech", label: "Fintech & crypto" },
      { value: "finance-gestion", label: "Gestion d'actifs & wealth management" },
      { value: "finance-fiduciaire", label: "Services fiduciaires & audit" },
    ],
  },
  {
    value: "formation",
    label: "Formation & recherche",
    subSectors: [
      { value: "formation-edtech", label: "EdTech" },
      { value: "formation-pro", label: "Formation professionnelle & continue" },
      { value: "formation-hes", label: "Hautes ecoles & universites" },
      { value: "formation-recherche", label: "Recherche publique & privee (EPFL, ETHZ, instituts)" },
    ],
  },
  {
    value: "horlogerie",
    label: "Horlogerie & joaillerie",
    subSectors: [
      { value: "horlogerie-composants", label: "Composants & sous-traitance horlogere" },
      { value: "horlogerie-haute", label: "Haute horlogerie" },
      { value: "horlogerie-moyenne", label: "Horlogerie de gamme moyenne" },
      { value: "horlogerie-joaillerie", label: "Joaillerie & pierres precieuses" },
    ],
  },
  {
    value: "industrie",
    label: "Industrie & manufacturing",
    subSectors: [
      { value: "industrie-agroalimentaire", label: "Agroalimentaire & transformation" },
      { value: "industrie-chimie", label: "Chimie & materiaux" },
      { value: "industrie-machines", label: "Machines-outils & equipements industriels" },
      { value: "industrie-metallurgie", label: "Metallurgie & traitement de surface" },
      { value: "industrie-microtech", label: "Microtechnique & precision" },
    ],
  },
  {
    value: "pharma",
    label: "Pharma, biotech & medtech",
    subSectors: [
      { value: "pharma-biotech", label: "Biotechnologie" },
      { value: "pharma-cro", label: "CRO & services cliniques" },
      { value: "pharma-medtech", label: "Dispositifs medicaux & medtech" },
      { value: "pharma-rd", label: "Pharma (R&D, production, distribution)" },
    ],
  },
  {
    value: "sante",
    label: "Sante & social",
    subSectors: [
      { value: "sante-dentaire", label: "Cabinets medicaux & dentaires" },
      { value: "sante-ems", label: "EMS & soins a domicile" },
      { value: "sante-hopital", label: "Hopitaux & cliniques privees" },
      { value: "sante-pharma", label: "Pharmacies" },
      { value: "sante-bienetre", label: "Sante mentale & bien-etre" },
    ],
  },
  {
    value: "secteur-public",
    label: "Secteur public & organisations internationales",
    subSectors: [
      { value: "public-admin", label: "Administrations federales, cantonales, communales" },
      { value: "public-ong", label: "ONG & associations" },
      { value: "public-oi", label: "Organisations internationales (ONU, CICR, OMC)" },
      { value: "public-para", label: "Parapublic (CFF, La Poste, Swisscom)" },
    ],
  },
  {
    value: "services",
    label: "Services aux entreprises",
    subSectors: [
      { value: "services-com", label: "Communication, marketing & RP" },
      { value: "services-conseil", label: "Conseil en management & strategie" },
      { value: "services-juridique", label: "Juridique & notariat" },
      { value: "services-recrutement", label: "Recrutement & travail temporaire" },
      { value: "services-traduction", label: "Traduction & services linguistiques" },
    ],
  },
  {
    value: "tech",
    label: "Technologies & digital",
    subSectors: [
      { value: "tech-cybersecurite", label: "Cybersecurite" },
      { value: "tech-data-ia", label: "Data & intelligence artificielle" },
      { value: "tech-saas", label: "Editeurs de logiciels / SaaS" },
      { value: "tech-esn", label: "ESN & conseil IT" },
      { value: "tech-telecom", label: "Telecommunications" },
    ],
  },
  {
    value: "tourisme",
    label: "Tourisme & hospitality",
    subSectors: [
      { value: "tourisme-agence", label: "Agences & tour-operateurs" },
      { value: "tourisme-evenementiel", label: "Evenementiel & congres" },
      { value: "tourisme-hotel", label: "Hotellerie & resorts" },
      { value: "tourisme-ski", label: "Remontees mecaniques & domaines skiables" },
      { value: "tourisme-restaurant", label: "Restauration & gastronomie" },
    ],
  },
  {
    value: "transport",
    label: "Transport & logistique",
    subSectors: [
      { value: "transport-aviation", label: "Aviation & aeroportuaire" },
      { value: "transport-fret", label: "Fret & logistique internationale" },
      { value: "transport-ferroviaire", label: "Transport ferroviaire" },
      { value: "transport-routier", label: "Transport routier" },
      { value: "transport-shipping", label: "Shipping & transit" },
    ],
  },
] as const;

/** Flat list of all sectors (groups + sub-sectors) for backward compatibility */
export const SECTORS = SECTOR_GROUPS.flatMap((group) => [
  { value: group.value, label: group.label },
  ...group.subSectors,
]);

export type SectorValue = string;

/** Max polling duration before timeout */
export const POLLING_TIMEOUT_MS = {
  express: 5 * 60 * 1000,
  full: 20 * 60 * 1000,
  benchmark: 30 * 60 * 1000,
} as const;

/** Geographic scopes for benchmarks */
export const GEOGRAPHIC_SCOPES = [
  { value: "local", label: "Local (ville/commune)" },
  { value: "canton", label: "Canton" },
  { value: "suisse-romande", label: "Suisse romande" },
  { value: "suisse", label: "Suisse" },
  { value: "europe", label: "Europe" },
  { value: "monde", label: "Monde" },
] as const;

/** Number of items per audit type */
export const AUDIT_ITEM_COUNTS = {
  express: { core_eeat: 20, cite: 10, total: 30 },
  full: { core_eeat: 80, cite: 40, total: 120 },
  ultra: { core_eeat: 80, cite: 40, perf: 15, a11y: 20, rgesn: 20, tech: 15, contenu: 15, total: 205 },
} as const;

/** Quality levels for audit */
export const QUALITY_LEVELS = [
  { value: "eco", label: "Eco (test)", description: "Haiku + 1 modele GEO — ~$0.03", icon: "" },
  { value: "standard", label: "Standard", description: "Sonnet + 2 modeles GEO — ~$0.30", icon: "" },
  { value: "premium", label: "Premium (client)", description: "Sonnet + 4 modeles GEO — ~$0.50", icon: "" },
  { value: "ultra", label: "Ultra (7 themes)", description: "Sonnet + 4 modeles GEO + notes detaillees — ~$3.00", icon: "" },
] as const;

/** Quality level configuration */
export const QUALITY_CONFIG = {
  eco: {
    scoringModel: "claude-haiku-4-20250404" as const,
    htmlMaxChars: 20000,
    geoModels: ["claude"] as const,
    maxTokensScoring: 1500,
    actionPlanModel: "claude-haiku-4-20250404" as const,
    actionPlanMaxTokens: 2500,
    actionPlanCount: 15,
    notesDepth: "concise" as const,
  },
  standard: {
    scoringModel: "claude-sonnet-4-6" as const,
    htmlMaxChars: 30000,
    geoModels: ["claude", "openai"] as const,
    maxTokensScoring: 2000,
    actionPlanModel: "claude-sonnet-4-6" as const,
    actionPlanMaxTokens: 2500,
    actionPlanCount: 15,
    notesDepth: "concise" as const,
  },
  premium: {
    scoringModel: "claude-sonnet-4-6" as const,
    htmlMaxChars: 30000,
    geoModels: ["claude", "openai", "perplexity", "gemini"] as const,
    maxTokensScoring: 2000,
    actionPlanModel: "claude-sonnet-4-6" as const,
    actionPlanMaxTokens: 2500,
    actionPlanCount: 15,
    notesDepth: "concise" as const,
  },
  ultra: {
    scoringModel: "claude-sonnet-4-6" as const,
    htmlMaxChars: 50000,
    geoModels: ["claude", "openai", "perplexity", "gemini"] as const,
    maxTokensScoring: 4000,
    actionPlanModel: "claude-sonnet-4-6" as const,
    actionPlanMaxTokens: 8000,
    actionPlanCount: 25,
    notesDepth: "detailed" as const,
  },
  dryrun: {
    scoringModel: "mock" as const,
    htmlMaxChars: 50000,
    geoModels: ["mock"] as const,
    maxTokensScoring: 0,
    actionPlanModel: "mock" as const,
    actionPlanMaxTokens: 0,
    actionPlanCount: 25,
    notesDepth: "detailed" as const,
  },
} as const;

export type QualityLevel = keyof typeof QUALITY_CONFIG;
export type QualityConfig = typeof QUALITY_CONFIG[QualityLevel];

// ============================================================
// LLM WATCH — Run level config per quality level
// ============================================================

export const LLMWATCH_RUN_CONFIG = {
  eco: {
    maxQueries: 10,
    llmCount: 4,
    repetitions: 1,
    estimatedCostUsd: 0.5,
    label: "Eco — 10 prompts × 1 run (~$0.50)",
  },
  standard: {
    maxQueries: 20,
    llmCount: 4,
    repetitions: 1,
    estimatedCostUsd: 1.5,
    label: "Standard — 20 prompts × 1 run (~$1.50)",
  },
  premium: {
    maxQueries: 30,
    llmCount: 4,
    repetitions: 3,
    estimatedCostUsd: 6.0,
    label: "Premium — 30 prompts × 3 runs (~$6.00)",
  },
  ultra: {
    maxQueries: 50,
    llmCount: 4,
    repetitions: 3,
    estimatedCostUsd: 12.0,
    label: "Ultra — 50 prompts × 3 runs (~$12.00)",
  },
  dryrun: {
    maxQueries: 5,
    llmCount: 0,
    repetitions: 1,
    estimatedCostUsd: 0,
    label: "Dry Run — mock",
  },
} as const;

export type LlmWatchRunConfig = typeof LLMWATCH_RUN_CONFIG[QualityLevel];

```


## `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

