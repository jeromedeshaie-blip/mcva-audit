import Anthropic from "@anthropic-ai/sdk";
import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { createGeoProvider } from "@/lib/providers/geo/geo-provider";
import { scoreItems, scoreCiteItems, aggregateScores, calculateSeoScore, scoreOneDimension, scoreOneCiteDimension, getCoreEeatDimensions, getCiteDimensions } from "@/lib/scoring/scorer";
import { QUALITY_CONFIG } from "@/lib/constants";
import type { QualityLevel, GeoData, SeoData } from "@/types/audit";
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
    onFailure: async ({ event }: { event: any }) => {
      const auditId = event.data?.event?.data?.auditId;
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
    onFailure: async ({ event }: { event: any }) => {
      const auditId = event.data?.event?.data?.auditId;
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

    // Step 1: Update status
    await step.run("update-status-processing", async () => {
      await updateAuditStatus(auditId, "processing");
    });

    // Step 2: Scrape HTML
    const html = await step.run("scrape-html", async () => {
      return scrapeHtml(url);
    });

    // Steps 3-5: Fetch external data (each is fast, < 10s)
    const seoData = await step.run("fetch-seo-data", async () => {
      const seoProvider = await createSeoProvider();
      return seoProvider.getDomainOverview(domain);
    });

    const geoData = await step.run("fetch-geo-data", async () => {
      const geoProvider = await createGeoProvider();
      const brandName = extractBrandName(html, domain);
      return geoProvider.getAIVisibility(brandName, sector || "général", domain, quality);
    });

    const competitors = await step.run("fetch-competitors", async () => {
      const seoProvider = await createSeoProvider();
      return seoProvider.getCompetitors(domain);
    });

    // Steps 6-13: Score CORE-EEAT — one step per dimension (8 dimensions)
    // Each step = 1 LLM call ≤ 10s, compatible with Vercel Hobby timeout
    const coreEeatDimensions = getCoreEeatDimensions("full");
    const scoredItems: any[] = [];
    for (const dim of coreEeatDimensions) {
      const dimItems = await step.run(`score-core-eeat-${dim}`, async () => {
        return scoreOneDimension(html, url, dim, "full", quality);
      });
      scoredItems.push(...dimItems);
    }

    // Steps 14-17: Score CITE — one step per dimension (4 dimensions)
    const citeDimensions = getCiteDimensions("full");
    const citeItems: any[] = [];
    for (const dim of citeDimensions) {
      const dimItems = await step.run(`score-cite-${dim}`, async () => {
        return scoreOneCiteDimension(html, url, dim, "full", quality);
      });
      citeItems.push(...dimItems);
    }

    // ── Site Audit Steps: Technical checks (no LLM, fast) ──

    // Step: Crawl page + robots.txt + SEO checks (single fetch, ~3-5s)
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const crawlAndSeoResult = await step.run("siteaudit-crawl-and-checks", async () => {
      try {
        const [crawl, robots] = await Promise.all([
          crawlUrl(fullUrl),
          checkRobotsTxt(fullUrl),
        ]);
        // Run SEO checks immediately while we still have the full crawl data
        const seoChecks = runSeoChecks(crawl, robots);
        // Strip HTML before returning (not serializable for large pages)
        const { html: _h, ...crawlData } = crawl;
        // Truncate bodyText to avoid Inngest payload limits (max ~4MB)
        const truncatedCrawlData = {
          ...crawlData,
          bodyText: crawlData.bodyText?.substring(0, 10000) || "",
          // Limit links/images arrays to avoid huge payloads
          links: crawlData.links?.slice(0, 50) || [],
          images: crawlData.images?.slice(0, 50) || [],
        };
        return { crawl: truncatedCrawlData, robots, seoChecks, error: null };
      } catch (e: any) {
        console.warn(`[audit:${auditId}] Site audit crawl failed:`, e.message);
        return {
          crawl: { url: fullUrl, bodyText: "", images: [], hreflang: [], schemaScripts: [], h1: [], h2: [], h3: [], links: [], title: null, metaDescription: null, canonicalUrl: null, hasViewport: false, statusCode: 0, loadTime: 0, robotsMeta: null, charset: null },
          robots: { exists: false, hasSitemap: false, sitemapUrl: null, blocksAll: false },
          seoChecks: { checks: [], score: 0, schemaData: { schemas_found: [], has_local_business: false, has_faq: false, has_breadcrumb: false, has_website: false, issues: [] } },
          error: e.message,
        };
      }
    });
    const crawlResult = crawlAndSeoResult;
    const seoTechResult = crawlAndSeoResult.seoChecks;

    // Step: PageSpeed Insights (external API, ~10-20s)
    const perfResult = await step.run("siteaudit-pagespeed", async () => {
      try {
        return await getPageSpeedScore(fullUrl);
      } catch (e: any) {
        console.warn(`[audit:${auditId}] PageSpeed failed:`, e.message);
        return { mobile: { score: 0, lcp: 0, cls: 0, fid: 0, ttfb: 0, fcp: 0, mobile_score: 0, desktop_score: 0 }, desktop: { score: 0, lcp: 0, cls: 0, fid: 0, ttfb: 0, fcp: 0, mobile_score: 0, desktop_score: 0 }, score: 0 };
      }
    });

    // Step: Readability + accessibility (pure computation)
    const readabilityResult = await step.run("siteaudit-readability", async () => {
      const readabilityData = analyzeReadability(crawlResult.crawl.bodyText || "");
      // Basic accessibility checks from crawl data
      const violations: AccessibilityViolation[] = [];
      const imagesWithoutAlt = (crawlResult.crawl.images || []).filter(
        (img: any) => !img.alt || img.alt.trim() === ""
      );
      if (imagesWithoutAlt.length > 0) {
        violations.push({
          id: "image-alt",
          impact: "serious",
          description: `${imagesWithoutAlt.length} image(s) sans attribut alt`,
          nodes_count: imagesWithoutAlt.length,
          wcag_criteria: "WCAG 2.1 AA 1.1.1",
        });
      }
      const accessibilityScore = accessibilityViolationsToScore(violations);
      const readabilityScore = readabilityToScore(readabilityData.flesch_score, readabilityData.word_count);
      return { readabilityData, violations, accessibilityScore, readabilityScore };
    });

    // Step: Compute Site Audit composite scores + generate technical recommendations
    const siteAuditData = await step.run("siteaudit-aggregate", async () => {
      const scores = {
        seo: seoTechResult.score,
        performance: perfResult.score,
        accessibility: readabilityResult.accessibilityScore,
        readability: readabilityResult.readabilityScore,
      };
      const globalTechScore = computeGlobalScore(scores);
      const techRecommendations = generateRecommendations(
        seoTechResult.checks as any,
        perfResult.mobile as any,
        readabilityResult.violations as any,
        scores
      );
      return { scores, globalTechScore, techRecommendations };
    });

    // ── Generate action plan (LLM) — now includes Site Audit context ──

    const allScoredItems = [...scoredItems, ...citeItems];
    const actions = await step.run("generate-action-plan", async () => {
      try {
        return await generateActionPlan(allScoredItems, seoData as SeoData, geoData as GeoData, url, quality);
      } catch (e: any) {
        console.error(`[audit:${auditId}] generate-action-plan failed (timeout or LLM error):`, e.message);
        return [];
      }
    });

    // ── Save results in separate steps for resilience ──

    // Step: Save scores
    await step.run("save-scores", async () => {
      const supabase = createServiceClient();
      const coreEeatScores = aggregateScores(scoredItems);
      const citeScores = aggregateScores(citeItems);
      const scoreSeo = calculateSeoScore(coreEeatScores);
      const scoreGeo = geoData.ai_visibility_score ?? 0;
      const seoProvider = await createSeoProvider();

      // Enrich seo_data with Site Audit technical checks
      // Strip large crawl data (bodyText, full link/image arrays) to keep JSONB payload small
      const enrichedSeoData = {
        ...(seoData as any),
        technical_checks: (seoTechResult as any)?.checks || [],
        schema_detail: (seoTechResult as any)?.schemaData || null,
        readability: readabilityResult?.readabilityData ? {
          flesch_score: readabilityResult.readabilityData.flesch_score,
          flesch_level: readabilityResult.readabilityData.flesch_level,
          lang_detected: readabilityResult.readabilityData.lang_detected,
          avg_sentence_length: readabilityResult.readabilityData.avg_sentence_length,
          avg_word_length: readabilityResult.readabilityData.avg_word_length,
          word_count: readabilityResult.readabilityData.word_count,
        } : null,
        has_https: crawlResult.crawl.url?.startsWith("https://") ?? false,
        has_viewport: crawlResult.crawl.hasViewport ?? false,
        has_canonical: !!crawlResult.crawl.canonicalUrl,
        canonical_url: crawlResult.crawl.canonicalUrl ?? null,
        has_robots_txt: crawlResult.robots.exists,
        has_sitemap: crawlResult.robots.hasSitemap,
        sitemap_url: crawlResult.robots.sitemapUrl ?? null,
        hreflang_tags: (crawlResult.crawl.hreflang || []).slice(0, 10),
        meta_title_length: crawlResult.crawl.title?.length ?? null,
        meta_description_length: crawlResult.crawl.metaDescription?.length ?? null,
        site_audit_scores: siteAuditData?.scores || null,
        site_audit_global: siteAuditData?.globalTechScore ?? null,
        performance_data: perfResult || null,
      };

      const { error } = await supabase.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_core_eeat: coreEeatScores,
        score_cite: citeScores,
        seo_provider: seoProvider.name,
        seo_data: enrichedSeoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: geoData,
        competitors,
      });

      if (error) {
        console.error(`[audit:${auditId}] save-scores failed:`, error.message);
        throw new Error(`DB insert scores: ${error.message}`);
      }
    });

    // Step: Save items (CORE-EEAT + CITE)
    await step.run("save-items", async () => {
      if (allScoredItems.length === 0) return;
      const supabase = createServiceClient();
      const { error } = await supabase.from("audit_items").insert(
        allScoredItems.map((item: any) => ({ audit_id: auditId, ...item }))
      );
      if (error) {
        console.error(`[audit:${auditId}] save-items failed:`, error.message);
        throw new Error(`DB insert items: ${error.message}`);
      }
    });

    // Step: Save actions (LLM + technical merged)
    await step.run("save-actions", async () => {
      const techActions = (siteAuditData?.techRecommendations || []).map((rec: any) => ({
        priority: rec.priority === "critical" ? "P1" : rec.priority === "high" ? "P2" : rec.priority === "medium" ? "P3" : "P4",
        title: rec.title,
        description: `${rec.description}\n\nAction : ${rec.action}`,
        impact_points: rec.impact_points,
        effort: rec.effort === "low" ? "< 1h" : rec.effort === "medium" ? "1-2 jours" : "1 semaine",
        category: rec.dimension === "geo" ? "GEO" : rec.dimension === "performance" ? "technique" : rec.dimension === "accessibility" ? "technique" : "SEO",
      }));
      const allActions = [...actions, ...techActions];
      if (allActions.length === 0) return;

      const supabase = createServiceClient();
      const { error } = await supabase.from("audit_actions").insert(
        allActions.map((action: any) => ({ audit_id: auditId, ...action }))
      );
      if (error) {
        console.error(`[audit:${auditId}] save-actions failed:`, error.message);
        // Don't throw — actions are nice-to-have, don't block the audit
      }
    });

    // Step: Mark audit as completed (always runs)
    await step.run("mark-completed", async () => {
      const supabase = createServiceClient();
      const { error } = await supabase
        .from("audits")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", auditId);
      if (error) {
        console.error(`[audit:${auditId}] mark-completed failed:`, error.message);
        throw new Error(`DB update status: ${error.message}`);
      }
    });

    return { auditId, status: "completed" };
  }
);

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let message;
    try {
      message = await anthropic.messages.create(
        {
          model: config.scoringModel,
          max_tokens: 4000,
          temperature: 0.2, // Slight creativity for better recommendations
          messages: [{ role: "user", content: prompt }],
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

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

export const functions = [runExpressAudit, runFullAudit, runBenchmarkBatch];
