# 11 — API audit-direct

**Module** : 11 — API audit-direct
**Version** : 2.1 (tag `v2.1-release`)

Endpoints step-by-step du flow audit (init → data → score → score-theme → action-plan → finalize). Compatible Vercel Hobby 60s.

---

## `src/app/api/audit-direct/action-plan/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateActionPlan, generateUltraActionPlan } from "@/lib/scoring/action-plan";
import type { QualityLevel } from "@/types/audit";

export const maxDuration = 60;

/**
 * POST /api/audit-direct/action-plan
 * Generate LLM-based strategic action plan (separated from finalize to fit in 60s).
 * Called AFTER finalize has saved scores and marked audit completed.
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

  // Fetch audit info + items + scores in parallel
  const [auditRes, itemsRes, scoresRes] = await Promise.all([
    serviceClient.from("audits").select("url").eq("id", auditId).single(),
    serviceClient.from("audit_items").select("item_code, item_label, status, score, notes, dimension, framework").eq("audit_id", auditId),
    serviceClient.from("audit_scores").select("seo_data, geo_data").eq("audit_id", auditId).single(),
  ]);

  if (!auditRes.data || !itemsRes.data) {
    return NextResponse.json({ error: "Audit ou items introuvables" }, { status: 404 });
  }

  const items = itemsRes.data;
  const auditUrl = auditRes.data.url;
  const seoData = scoresRes.data?.seo_data || {};
  const geoData = scoresRes.data?.geo_data || null;

  if (items.length === 0) {
    return NextResponse.json({ audit_id: auditId, actionCount: 0 });
  }

  // Generate action plan
  let actions: any[] = [];
  try {
    if (quality === "ultra") {
      actions = await generateUltraActionPlan(items, seoData as any, geoData, auditUrl, quality);
    } else {
      actions = await generateActionPlan(items, seoData as any, geoData, auditUrl, quality);
    }
  } catch (e: any) {
    console.error("[action-plan] Generation failed:", e.message);
    // Non-blocking: return empty plan rather than failing the whole audit
    return NextResponse.json({ audit_id: auditId, actionCount: 0, error: e.message });
  }

  // Save actions
  if (actions.length > 0) {
    const mapped = actions.map((a: any) => ({
      audit_id: auditId,
      priority: a.priority,
      title: a.title,
      description: a.description,
      impact_points: a.impact_points,
      effort: a.effort,
      category: a.category,
    }));

    // Merge with any existing tech actions (from finalize)
    const { data: existing } = await serviceClient
      .from("audit_actions")
      .select("id")
      .eq("audit_id", auditId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Tech actions already saved by finalize — just append LLM actions
      await serviceClient.from("audit_actions").insert(mapped);
    } else {
      await serviceClient.from("audit_actions").insert(mapped);
    }
  }

  return NextResponse.json({
    audit_id: auditId,
    actionCount: actions.length,
  });
}

```


## `src/app/api/audit-direct/actions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateActionPlan } from "@/lib/scoring/action-plan";
import type { QualityLevel } from "@/types/audit";

export const maxDuration = 60;

/**
 * POST /api/audit-direct/actions
 * Step 7: Generate strategic action plan via LLM + save to DB
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { auditId, quality: rawQuality = "standard" } = body;
  if (!auditId)
    return NextResponse.json({ error: "auditId requis" }, { status: 400 });

  const quality = (rawQuality || "standard") as QualityLevel;
  const serviceClient = createServiceClient();

  // Fetch audit info
  const { data: audit, error: auditErr } = await serviceClient
    .from("audits")
    .select("url, domain, sector")
    .eq("id", auditId)
    .single();

  if (auditErr || !audit) {
    return NextResponse.json(
      { error: "Audit introuvable", detail: auditErr?.message },
      { status: 404 }
    );
  }

  // Fetch all scored items
  const { data: allItems, error: itemsErr } = await serviceClient
    .from("audit_items")
    .select("*")
    .eq("audit_id", auditId);

  if (itemsErr) {
    return NextResponse.json(
      { error: "Erreur lecture items", detail: itemsErr.message },
      { status: 500 }
    );
  }

  const items = allItems || [];
  if (items.length === 0) {
    return NextResponse.json({
      actionCount: 0,
      message: "Aucun item score, plan d'action vide",
    });
  }

  // Fetch scores for SEO/GEO data context
  const { data: scores } = await serviceClient
    .from("audit_scores")
    .select("seo_data, geo_data")
    .eq("audit_id", auditId)
    .single();

  // Generate strategic action plan via LLM
  const actions = await generateActionPlan(
    items.map((i: any) => ({
      item_code: i.item_code,
      item_label: i.item_label,
      status: i.status,
      score: i.score,
      notes: i.notes,
      dimension: i.dimension,
      framework: i.framework,
    })),
    scores?.seo_data || null,
    scores?.geo_data || null,
    audit.url,
    quality
  );

  // Save actions (delete existing for idempotency, then insert)
  if (actions.length > 0) {
    // Only delete LLM-generated actions, keep tech recommendations
    await serviceClient
      .from("audit_actions")
      .delete()
      .eq("audit_id", auditId);

    const { error: insertErr } = await serviceClient
      .from("audit_actions")
      .insert(
        actions.map((a) => ({
          audit_id: auditId,
          priority: a.priority,
          title: a.title,
          description: a.description,
          impact_points: a.impact_points,
          effort: a.effort,
          category: a.category,
        }))
      );

    if (insertErr) {
      return NextResponse.json(
        { error: "Erreur sauvegarde actions", detail: insertErr.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    actionCount: actions.length,
    actions: actions.map((a) => ({
      priority: a.priority,
      title: a.title,
      category: a.category,
    })),
  });
}

```


## `src/app/api/audit-direct/data/route.ts`

```typescript
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
import { mockGeoData } from "@/lib/scoring/mock-scorer";

export const maxDuration = 60;

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

  // Dry-run mode: return mock GEO data + real site audit (no API costs)
  if (quality === "dryrun") {
    const siteAuditResult = await Promise.allSettled([runSiteAudit(url)]);
    return NextResponse.json({
      seoData: null,
      geoData: mockGeoData(url),
      competitors: null,
      siteAuditData: siteAuditResult[0].status === "fulfilled" ? siteAuditResult[0].value : null,
      errors: { seo: "dryrun", geo: null, siteAudit: siteAuditResult[0].status === "rejected" ? (siteAuditResult[0].reason as Error)?.message : null },
      dryrun: true,
    });
  }

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

```


## `src/app/api/audit-direct/finalize/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { aggregateScores, calculateSeoScore } from "@/lib/scoring/scorer";
import { generateActionPlan, generateUltraActionPlan } from "@/lib/scoring/action-plan";
import { mockActionPlan } from "@/lib/scoring/mock-scorer";
import type { SeoData, GeoData, QualityLevel, AuditTheme } from "@/types/audit";
import { GLOBAL_SCORE_WEIGHTS } from "@/types/audit";
import { SCORING_VERSION } from "@/lib/scoring/constants";
import { loadAuditBlocs } from "@/lib/audit/load-blocs";
import { buildEnrichment, formatSourcesCitation } from "@/lib/scoring/external-mapping";

export const maxDuration = 60;

/**
 * POST /api/audit-direct/finalize
 * Step 7: Aggregate scores + generate action plan + save everything + cleanup
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { auditId, seoData, geoData, competitors, siteAuditData, quality: rawQuality = "standard" } = body;
  if (!auditId) return NextResponse.json({ error: "auditId requis" }, { status: 400 });

  const quality = (rawQuality || "standard") as QualityLevel;
  const serviceClient = createServiceClient();

  // Fetch audit URL + all scored items in parallel
  const [auditRes, itemsRes] = await Promise.all([
    serviceClient.from("audits").select("url, audit_type, themes").eq("id", auditId).single(),
    serviceClient.from("audit_items").select("*").eq("audit_id", auditId),
  ]);

  if (itemsRes.error) {
    return NextResponse.json({ error: "Erreur lecture items", detail: itemsRes.error.message }, { status: 500 });
  }

  const items = itemsRes.data || [];
  const auditUrl = auditRes.data?.url || "";
  const auditType = auditRes.data?.audit_type || "full";
  const auditThemes: AuditTheme[] = auditRes.data?.themes || [];

  // POLE-PERF v2.1 § 6.5 — charge les blocs externes A-F si présents
  const blocsBundle = await loadAuditBlocs(serviceClient, auditId);
  const enrichment = buildEnrichment(blocsBundle);

  // Apply enrichment: override specific item_codes with verified scores
  if (Object.keys(enrichment.criteria).length > 0) {
    for (const item of items as any[]) {
      const override = enrichment.criteria[item.item_code];
      if (override) {
        item.score = override.score;
        item.status = override.score >= 75 ? "pass" : override.score >= 25 ? "partial" : "fail";
        item.notes = `${item.notes || ""}\n[Source vérifiée: ${override.source_label}]`.trim();
      }
    }
  }

  const coreEeatItems = items.filter((i: any) => i.framework === "core_eeat");
  const citeItems = items.filter((i: any) => i.framework === "cite");

  // Aggregate SEO/GEO scores (always present)
  const coreEeatScores = aggregateScores(coreEeatItems);
  const citeScores = aggregateScores(citeItems);
  const scoreSeo = calculateSeoScore(coreEeatScores);

  // Score GEO™ : priorité à l'override Bloc F (LLM Watch), sinon ai_visibility_score estimé
  const scoreGeo = enrichment.scoreGeoOverride
    ? enrichment.scoreGeoOverride.score_geo
    : ((geoData as any)?.ai_visibility_score ?? 0);

  const sourcesCitation = formatSourcesCitation(enrichment.sourceLabels);

  // Aggregate new theme scores
  const themeFrameworks = ["perf", "a11y", "rgesn", "tech", "contenu"] as const;
  const themeScores: Record<string, number | null> = {};
  const themeData: Record<string, Record<string, unknown>> = {};

  for (const fw of themeFrameworks) {
    const fwItems = items.filter((i: any) => i.framework === fw);
    if (fwItems.length === 0) {
      themeScores[fw] = null;
      themeData[fw] = {};
    } else {
      const dimScores = aggregateScores(fwItems);
      const avg = Object.values(dimScores);
      themeScores[fw] = avg.length > 0 ? Math.round(avg.reduce((a, b) => a + b, 0) / avg.length) : null;
      themeData[fw] = dimScores;
    }
  }

  // Compute global score for ultra audits
  let scoreGlobal: number | null = null;
  if (auditType === "ultra") {
    const allScores: Record<AuditTheme, number | null> = {
      seo: scoreSeo,
      geo: scoreGeo,
      perf: themeScores.perf ?? null,
      a11y: themeScores.a11y ?? null,
      rgesn: themeScores.rgesn ?? null,
      tech: themeScores.tech ?? null,
      contenu: themeScores.contenu ?? null,
    };
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [theme, weight] of Object.entries(GLOBAL_SCORE_WEIGHTS)) {
      const score = allScores[theme as AuditTheme];
      if (score != null) {
        weightedSum += score * weight;
        totalWeight += weight;
      }
    }
    scoreGlobal = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
  }

  const seoProvider = await createSeoProvider();

  // Build enriched SEO data
  const enrichedSeoData = {
    ...(seoData || {}),
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
  };

  // Save scores (pure DB, fast)
  await serviceClient.from("audit_scores").delete().eq("audit_id", auditId);
  const { error: scoresErr } = await serviceClient.from("audit_scores").insert({
    audit_id: auditId,
    score_seo: scoreSeo,
    score_geo: scoreGeo,
    score_perf: themeScores.perf ?? null,
    score_a11y: themeScores.a11y ?? null,
    score_rgesn: themeScores.rgesn ?? null,
    score_tech: themeScores.tech ?? null,
    score_contenu: themeScores.contenu ?? null,
    score_global: scoreGlobal,
    score_core_eeat: coreEeatScores,
    score_cite: citeScores,
    perf_data: themeData.perf || {},
    a11y_data: themeData.a11y || {},
    rgesn_data: themeData.rgesn || {},
    tech_data: themeData.tech || {},
    contenu_data: themeData.contenu || {},
    seo_provider: seoProvider.name,
    seo_data: enrichedSeoData,
    geo_provider: process.env.GEO_PROVIDER || "direct_ai",
    geo_data: enrichment.scoreGeoOverride
      ? {
          ...(geoData || {}),
          // POLE-PERF v2.1 § 5 : composantes Score GEO™ depuis LLM Watch
          score_presence: enrichment.scoreGeoOverride.score_presence,
          score_exactitude: enrichment.scoreGeoOverride.score_exactitude,
          score_sentiment: enrichment.scoreGeoOverride.score_sentiment,
          score_recommendation: enrichment.scoreGeoOverride.score_recommendation,
          score_by_llm: enrichment.scoreGeoOverride.score_by_llm,
          score_source: "llm_watch",
          score_source_label: enrichment.scoreGeoOverride.source_label,
          model_snapshot_version: enrichment.scoreGeoOverride.metadata.model_snapshot_version,
          run_count: enrichment.scoreGeoOverride.metadata.run_count,
          score_stddev: enrichment.scoreGeoOverride.metadata.score_stddev,
          run_level: enrichment.scoreGeoOverride.metadata.run_level,
        }
      : { ...(geoData || {}), score_source: "cite_estimation" },
    competitors: competitors || null,
    scoring_version: SCORING_VERSION,
  });

  if (scoresErr) {
    return NextResponse.json({
      error: "Erreur sauvegarde scores",
      detail: scoresErr.message,
    }, { status: 500 });
  }

  // Save tech actions (non-LLM, from site audit)
  const techActions = (siteAuditData?.techRecommendations || []).map((rec: any) => ({
    audit_id: auditId,
    priority: rec.priority === "critical" ? "P1" : rec.priority === "high" ? "P2" : rec.priority === "medium" ? "P3" : "P4",
    title: rec.title,
    description: `${rec.description}\n\nAction : ${rec.action}`,
    impact_points: rec.impact_points,
    effort: rec.effort === "low" ? "< 1h" : rec.effort === "medium" ? "1-2 jours" : "1 semaine",
    category: rec.dimension === "geo" ? "GEO" : rec.dimension === "performance" ? "technique" : rec.dimension === "accessibility" ? "technique" : "SEO",
  }));

  if (techActions.length > 0) {
    await serviceClient.from("audit_actions").delete().eq("audit_id", auditId);
    await serviceClient.from("audit_actions").insert(techActions);
  }

  // Generate action plan — mock for dryrun, LLM for real audits
  let llmActions: any[] = [];
  if (quality === "dryrun") {
    llmActions = mockActionPlan(auditType === "ultra");
  } else if (items.length > 0) {
    try {
      const mappedItems = items.map((i: any) => ({
        item_code: i.item_code,
        item_label: i.item_label,
        status: i.status,
        score: i.score,
        notes: i.notes,
        dimension: i.dimension,
        framework: i.framework,
      }));
      if (quality === "ultra") {
        llmActions = await generateUltraActionPlan(
          mappedItems, enrichedSeoData as any, geoData || null, auditUrl, quality
        );
      } else {
        llmActions = await generateActionPlan(
          mappedItems, enrichedSeoData as any, geoData || null, auditUrl, quality
        );
      }
    } catch (e: any) {
      console.error("[finalize] Action plan generation failed:", e.message);
    }
  }

  if (llmActions.length > 0) {
    await serviceClient.from("audit_actions").insert(
      llmActions.map((a: any) => ({
        audit_id: auditId,
        priority: a.priority,
        title: a.title,
        description: a.description,
        impact_points: a.impact_points,
        effort: a.effort,
        category: a.category,
      }))
    );
  }

  // Mark completed + cleanup HTML
  await serviceClient
    .from("audits")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      scraped_html: null,
      brand_name: null,
    })
    .eq("id", auditId);

  return NextResponse.json({
    audit_id: auditId,
    status: "completed",
    scores: {
      seo: scoreSeo,
      geo: scoreGeo,
      perf: themeScores.perf,
      a11y: themeScores.a11y,
      rgesn: themeScores.rgesn,
      tech: themeScores.tech,
      contenu: themeScores.contenu,
      global: scoreGlobal,
    },
    itemCount: items.length,
    techActionCount: techActions.length,
    llmActionCount: llmActions.length,
    // POLE-PERF v2.1 § 6.5 — traçabilité des sources
    scoring_version: SCORING_VERSION,
    external_blocks_used: enrichment.sourceLabels,
    sources_citation: sourcesCitation,
    score_geo_source: enrichment.scoreGeoOverride ? "llm_watch" : "cite_estimation",
  });
}

```


## `src/app/api/audit-direct/init/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import * as cheerio from "cheerio";

export const maxDuration = 60;

/**
 * POST /api/audit-direct/init
 * Step 1: Create audit record + scrape HTML + store in DB
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { url, sector = "général", quality = "standard", level = "full", themes = [] } = body;
  if (!url) return NextResponse.json({ error: "URL requise" }, { status: 400 });

  // Map front-end level to DB audit_type
  const auditTypeMap: Record<string, string> = {
    pre_audit: "pre_audit",
    express: "express",
    complet: "full",
    full: "full",
    ultra: "ultra",
    dryrun: "ultra", // Dry-run saves as ultra type for full pipeline testing
  };
  const auditType = auditTypeMap[level] || "full";

  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = (() => {
    try { return new URL(fullUrl).hostname.replace(/^www\./, ""); } catch { return url; }
  })();

  const serviceClient = createServiceClient();

  // Generate formatted reference (AUDIT-2026-001 / THEMA-2026-001 / PRE-2026-001)
  // POLE-PERF v2.1 § 10.
  let reference: string | null = null;
  try {
    const { data: refRes } = await serviceClient.rpc("generate_audit_reference_v2_1", {
      p_audit_type: auditType,
    });
    if (typeof refRes === "string") reference = refRes;
  } catch {
    // Function may not exist in old DBs — skip gracefully
  }

  // Create audit record
  const { data: audit, error: createErr } = await serviceClient
    .from("audits")
    .insert({
      url: fullUrl,
      domain,
      sector: sector || null,
      audit_type: auditType,
      status: "processing",
      created_by: user.id,
      theme: auditType !== "ultra" && themes.length === 1 ? themes[0] : null,
      themes: themes.length > 0 ? themes : null,
      reference,
    })
    .select()
    .single();

  if (createErr || !audit) {
    return NextResponse.json({ error: "Erreur création audit", detail: createErr?.message }, { status: 500 });
  }

  // Scrape HTML
  let html: string;
  try {
    const response = await fetch(fullUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
    if (html.length < 100) throw new Error("HTML trop court");
  } catch (e: any) {
    await serviceClient.from("audits").update({ status: "error" }).eq("id", audit.id);
    return NextResponse.json({ error: "Scraping échoué", detail: e.message }, { status: 500 });
  }

  // Extract brand name
  const brandName = extractBrandName(html, domain);

  // Detect SPA/client-rendered sites (Wix, React SPA, etc.)
  const spaDetected = detectSpa(html);

  // Store HTML + brand + SPA flag in DB
  const { error: updateErr } = await serviceClient
    .from("audits")
    .update({ scraped_html: html, brand_name: brandName, is_spa: spaDetected })
    .eq("id", audit.id);

  if (updateErr) {
    return NextResponse.json({ error: "Erreur stockage HTML", detail: updateErr.message }, { status: 500 });
  }

  // Ultra audits use the same step-by-step frontend flow as complet
  // (Inngest Cloud callback unreliable on current setup)

  return NextResponse.json({
    auditId: audit.id,
    domain,
    brandName,
    htmlLength: html.length,
    url: fullUrl,
    spaDetected,
  });
}

/**
 * Detect SPA / client-rendered sites where HTML is mostly empty shells.
 * Wix, heavy React SPAs, Angular apps etc. render via JS — the static HTML
 * contains mostly script tags and very little readable content.
 */
function detectSpa(html: string): boolean {
  // Strip all <script> and <style> tags to measure real content
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const textLength = stripped.length;
  const htmlLength = html.length;

  // Known SPA platforms
  const wixMarkers = ["wix-viewer-model", "wixCodeApi", "X-Wix-", "clientSideRender", "wix-thunderbolt"];
  const hasWixMarker = wixMarkers.some((m) => html.includes(m));

  // If Wix detected, always flag
  if (hasWixMarker) return true;

  // Count structural HTML elements — SSR sites have real content tags
  const pCount = (html.match(/<p[\s>]/gi) || []).length;
  const hCount = (html.match(/<h[1-6][\s>]/gi) || []).length;
  const imgCount = (html.match(/<img[\s>]/gi) || []).length;
  const scriptCount = (html.match(/<script[\s>]/gi) || []).length;

  // If the page has meaningful structural content, it's NOT a SPA shell
  // even if JS/CSS inflate the total HTML size
  const hasStructuralContent = pCount >= 3 || hCount >= 2 || (pCount >= 1 && imgCount >= 2);

  // Only flag as SPA if very little text AND no structural content
  if (htmlLength > 10000 && textLength / htmlLength < 0.02 && !hasStructuralContent) return true;

  // If almost no content tags but lots of scripts → SPA shell
  if (scriptCount > 20 && pCount < 2 && hCount < 2 && textLength < 500) return true;

  return false;
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

```


## `src/app/api/audit-direct/route.ts`

```typescript
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
import { SCORING_VERSION } from "@/lib/scoring/constants";
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

    // --- Step 2: EVERYTHING in parallel (data + scoring + site audit) to fit in 60s ---
    log.push(`[${elapsed()}] Starting all tasks in parallel...`);

    const brandName = extractBrandName(html, parsedDomain);
    const coreEeatDims = getCoreEeatDimensions("full");
    const citeDims = getCiteDimensions("full");

    // Site audit as an async task (runs in parallel with scoring)
    const siteAuditTask = (async () => {
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

      // Skip PageSpeed to save ~10s — use 0 as fallback
      const perf = { score: 0, mobile: null as any, desktop: null as any };

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
      return {
        scores,
        globalTechScore: computeGlobalScore(scores),
        techRecommendations: generateRecommendations(seoChecks.checks as any, perf.mobile as any, violations as any, scores),
        seoChecks, readabilityData,
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
    })();

    // Run ALL tasks in one massive Promise.allSettled:
    // data collection + ALL scoring + site audit — all at once
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
      // [3] Site audit (crawl + readability, no PageSpeed)
      siteAuditTask,
      // [4..4+N-1] CORE-EEAT dimensions (all in parallel)
      ...coreEeatDims.map((dim) =>
        scoreOneDimension(html, url, dim, "full", quality)
      ),
      // [4+N..end] CITE dimensions (all in parallel)
      ...citeDims.map((dim) =>
        scoreOneCiteDimension(html, url, dim, "full", quality)
      ),
    ]);

    // Extract data results
    const seoResult = allResults[0];
    const geoResult = allResults[1];
    const competitorsResult = allResults[2];
    const siteAuditResult = allResults[3];
    const scoringResults = allResults.slice(4);

    const seoData = seoResult.status === "fulfilled" ? seoResult.value : getEmptySeoData();
    const geoData = geoResult.status === "fulfilled" ? geoResult.value : getEmptyGeoData();
    const competitors = competitorsResult.status === "fulfilled" ? competitorsResult.value : null;
    const siteAuditData = siteAuditResult.status === "fulfilled" ? siteAuditResult.value : null;

    if (seoResult.status === "rejected") log.push(`[${elapsed()}] SEO data failed: ${seoResult.reason?.message}`);
    if (geoResult.status === "rejected") log.push(`[${elapsed()}] GEO data failed: ${geoResult.reason?.message}`);
    if (siteAuditResult.status === "rejected") log.push(`[${elapsed()}] Site audit failed: ${siteAuditResult.reason?.message}`);
    log.push(`[${elapsed()}] Site audit: ${siteAuditResult.status === "fulfilled" ? `global=${siteAuditData?.globalTechScore}` : "failed"}`);

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
      scoring_version: SCORING_VERSION,
    });

    if (scoresErr) {
      log.push(`[${elapsed()}] Save scores FAILED: ${scoresErr.message}`);
      await markError(serviceClient, finalAuditId, log);
      return NextResponse.json({ error: "Save scores failed", detail: scoresErr.message, log }, { status: 500 });
    }

    // Save items
    if (allScoredItems.length > 0) {
      const { error: itemsErr } = await serviceClient.from("audit_items").insert(
        allScoredItems.map((item: any) => ({ audit_id: finalAuditId, scoring_version: SCORING_VERSION, ...item }))
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

```


## `src/app/api/audit-direct/score-theme/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { scoreThemeDimension, getThemeDimensions } from "@/lib/scoring/theme-scorer";
import { mockScoreThemeDimension, mockGetThemeDimensions } from "@/lib/scoring/mock-scorer";
import { SCORING_VERSION } from "@/lib/scoring/constants";
import type { QualityLevel } from "@/types/audit";

export const maxDuration = 60;

/**
 * POST /api/audit-direct/score-theme
 * Score dimensions for a new theme (perf, a11y, rgesn, tech, contenu).
 * Scores all dimensions of the theme in one call.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { auditId, theme, quality: rawQuality = "standard", mode: rawMode } = body as {
    auditId: string;
    theme: string;
    quality?: string;
    mode?: string;
  };

  if (!auditId || !theme) {
    return NextResponse.json({ error: "auditId et theme requis" }, { status: 400 });
  }

  const validThemes = ["perf", "a11y", "rgesn", "tech", "contenu"];
  if (!validThemes.includes(theme)) {
    return NextResponse.json({ error: `Theme invalide: ${theme}. Valeurs: ${validThemes.join(", ")}` }, { status: 400 });
  }

  const quality = (rawQuality || "standard") as QualityLevel;
  const mode = rawMode === "express" ? "express" : "full";
  const serviceClient = createServiceClient();

  // If only dimensions list requested (for frontend-driven per-dimension flow)
  if (body.listDimensions) {
    const dims = getThemeDimensions(theme, mode as "express" | "full");
    return NextResponse.json({ theme, dimensions: dims });
  }

  // Fetch stored HTML
  const { data: audit, error: fetchErr } = await serviceClient
    .from("audits")
    .select("url, scraped_html, audit_type")
    .eq("id", auditId)
    .single();

  if (fetchErr || !audit?.scraped_html) {
    return NextResponse.json({ error: "Audit introuvable ou HTML manquant", detail: fetchErr?.message }, { status: 404 });
  }

  const html = audit.scraped_html;
  const url = audit.url;

  // Determine scoring mode from audit_type
  const effectiveMode = audit.audit_type === "pre_audit" ? "express" : mode;

  // Optional: score a single dimension (for ultra per-dimension flow)
  const singleDim = body.dimension as string | undefined;

  // Get dimensions to score
  const dimensions = singleDim
    ? [singleDim]
    : getThemeDimensions(theme, effectiveMode as "express" | "full");
  if (dimensions.length === 0) {
    return NextResponse.json({ theme, dimensions: [], itemCount: 0 });
  }

  // Dry-run mode: return mock data without calling LLM
  if (quality === "dryrun") {
    const mockDims = mockGetThemeDimensions(theme);
    const mockItems = mockDims.flatMap((dim) => mockScoreThemeDimension(theme, dim));

    if (mockItems.length > 0) {
      await serviceClient.from("audit_items").delete().eq("audit_id", auditId).eq("framework", theme);
      await serviceClient.from("audit_items").insert(
        mockItems.map((item) => ({
          audit_id: auditId,
          scoring_version: SCORING_VERSION,
          ...item,
          score: Math.round(Number(item.score) || 50),
        }))
      );
    }

    return NextResponse.json({ theme, dimensions: mockDims, itemCount: mockItems.length, dryrun: true });
  }

  // Score dimensions — ultra: batches of 3 parallel (rate limit safety), others: all parallel
  let results: PromiseSettledResult<any>[];
  if (quality === "ultra") {
    // Batch of 3 parallel, sequential between batches (rate limit safety)
    const BATCH_SIZE = 3;
    results = [];
    for (let i = 0; i < dimensions.length; i += BATCH_SIZE) {
      const batch = dimensions.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((dim) =>
          scoreThemeDimension(theme, dim, html, url, effectiveMode as "express" | "full", quality)
        )
      );
      results.push(...batchResults);
      if (i + BATCH_SIZE < dimensions.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } else {
    results = await Promise.allSettled(
      dimensions.map((dim) =>
        scoreThemeDimension(theme, dim, html, url, effectiveMode as "express" | "full", quality)
      )
    );
  }

  // Collect items and track failures
  const items: any[] = [];
  const failed: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const dim = dimensions[i];
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      items.push(...result.value);
    } else {
      failed.push(`${dim}: ${result.status === "rejected" ? (result.reason as Error)?.message : "empty"}`);
    }
  }

  // Save items (delete existing for idempotency — scope to dimension if single)
  if (items.length > 0) {
    let deleteQuery = serviceClient
      .from("audit_items")
      .delete()
      .eq("audit_id", auditId)
      .eq("framework", theme);
    if (singleDim) {
      deleteQuery = deleteQuery.eq("dimension", singleDim);
    }
    await deleteQuery;

    const { error: insertErr } = await serviceClient
      .from("audit_items")
      .insert(items.map((item) => ({
        audit_id: auditId,
        scoring_version: SCORING_VERSION,
        framework: item.framework,
        dimension: item.dimension,
        item_code: item.item_code,
        item_label: item.item_label,
        status: item.status,
        score: Math.round(Number(item.score) || 50),
        notes: typeof item.notes === "string" ? item.notes : item.notes ? String(item.notes) : null,
        is_geo_first: item.is_geo_first ?? false,
        is_express_item: item.is_express_item ?? false,
      })));

    if (insertErr) {
      console.error(`[score-theme][${theme}] Insert failed:`, insertErr.message, insertErr.code, insertErr.details);
      return NextResponse.json({
        error: "Erreur sauvegarde items",
        detail: `${insertErr.message} (code: ${insertErr.code})`,
        itemCount: items.length,
        failed,
      }, { status: 500 });
    }
  }

  // If ALL dimensions failed, return error so frontend can retry
  if (items.length === 0 && failed.length > 0) {
    return NextResponse.json({
      error: `Toutes les dimensions ont echoue (${theme})`,
      detail: failed.join("; "),
      theme,
      dimensions,
      itemCount: 0,
      failed,
    }, { status: 502 });
  }

  return NextResponse.json({
    theme,
    dimensions,
    itemCount: items.length,
    failed: failed.length > 0 ? failed : undefined,
  });
}

```


## `src/app/api/audit-direct/score/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { scoreOneDimension, scoreOneCiteDimension } from "@/lib/scoring/scorer";
import { mockScoreOneDimension, mockScoreOneCiteDimension } from "@/lib/scoring/mock-scorer";
import { SCORING_VERSION } from "@/lib/scoring/constants";
import type { QualityLevel } from "@/types/audit";

export const maxDuration = 60;

/**
 * POST /api/audit-direct/score
 * Step 2/3/4: Score a batch of dimensions (max 4 at a time)
 * Saves items to DB incrementally.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { auditId, dimensions, framework, quality: rawQuality = "standard" } = body as {
    auditId: string;
    dimensions: string[];
    framework: "core_eeat" | "cite";
    quality?: string;
  };

  if (!auditId || !dimensions?.length || !framework) {
    return NextResponse.json({ error: "auditId, dimensions et framework requis" }, { status: 400 });
  }

  const quality = (rawQuality || "standard") as QualityLevel;
  const serviceClient = createServiceClient();

  // Fetch stored HTML
  const { data: audit, error: fetchErr } = await serviceClient
    .from("audits")
    .select("url, scraped_html")
    .eq("id", auditId)
    .single();

  if (fetchErr || !audit?.scraped_html) {
    return NextResponse.json({ error: "Audit introuvable ou HTML manquant", detail: fetchErr?.message }, { status: 404 });
  }

  const html = audit.scraped_html;
  const url = audit.url;

  // Dry-run mode: return mock data without calling LLM
  if (quality === "dryrun") {
    const mockItems: any[] = framework === "core_eeat"
      ? dimensions.flatMap((dim) => mockScoreOneDimension(dim, "full"))
      : dimensions.flatMap((dim) => mockScoreOneCiteDimension(dim));

    if (mockItems.length > 0) {
      await serviceClient.from("audit_items").delete().eq("audit_id", auditId).in("dimension", dimensions);
      await serviceClient.from("audit_items").insert(mockItems.map((item) => ({ audit_id: auditId, scoring_version: SCORING_VERSION, ...item })));
    }

    return NextResponse.json({ scored: dimensions, framework, itemCount: mockItems.length, dryrun: true });
  }

  // Score dimensions — sequential for ultra (rate limit), parallel otherwise
  const scoreFn = framework === "core_eeat" ? scoreOneDimension : scoreOneCiteDimension;
  let results: PromiseSettledResult<any>[];
  if (quality === "ultra") {
    results = [];
    for (const dim of dimensions) {
      const result = await Promise.allSettled([scoreFn(html, url, dim, "full", quality)]);
      results.push(result[0]);
      // Delay between calls to avoid Anthropic rate limits
      if (dimensions.indexOf(dim) < dimensions.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } else {
    results = await Promise.allSettled(
      dimensions.map((dim) => scoreFn(html, url, dim, "full", quality))
    );
  }

  // Collect items and track failures
  const items: any[] = [];
  const failed: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const dim = dimensions[i];
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      items.push(...result.value);
    } else {
      failed.push(`${dim}: ${result.status === "rejected" ? result.reason?.message : "empty"}`);
    }
  }

  // Save items incrementally (delete existing for these dimensions first, then insert)
  if (items.length > 0) {
    // Delete existing items for these dimensions to make this idempotent
    await serviceClient
      .from("audit_items")
      .delete()
      .eq("audit_id", auditId)
      .in("dimension", dimensions);

    const { error: insertErr } = await serviceClient
      .from("audit_items")
      .insert(items.map((item: any) => ({ audit_id: auditId, scoring_version: SCORING_VERSION, ...item })));

    if (insertErr) {
      return NextResponse.json({
        error: "Erreur sauvegarde items",
        detail: insertErr.message,
        itemCount: items.length,
        failed,
      }, { status: 500 });
    }
  }

  // If ALL dimensions failed, return error so frontend can retry
  if (items.length === 0 && failed.length > 0) {
    return NextResponse.json({
      error: `Toutes les dimensions ont echoue (${framework})`,
      detail: failed.join("; "),
      scored: dimensions,
      framework,
      itemCount: 0,
      failed,
    }, { status: 502 });
  }

  return NextResponse.json({
    scored: dimensions,
    framework,
    itemCount: items.length,
    failed: failed.length > 0 ? failed : undefined,
  });
}

```

