import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { aggregateScores, calculateSeoScore } from "@/lib/scoring/scorer";
import { generateActionPlan, generateUltraActionPlan } from "@/lib/scoring/action-plan";
import { mockActionPlan } from "@/lib/scoring/mock-scorer";
import type { SeoData, GeoData, QualityLevel, AuditTheme } from "@/types/audit";
import { GLOBAL_SCORE_WEIGHTS } from "@/types/audit";

export const maxDuration = 300;

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
  const coreEeatItems = items.filter((i: any) => i.framework === "core_eeat");
  const citeItems = items.filter((i: any) => i.framework === "cite");

  // Aggregate SEO/GEO scores (always present)
  const coreEeatScores = aggregateScores(coreEeatItems);
  const citeScores = aggregateScores(citeItems);
  const scoreSeo = calculateSeoScore(coreEeatScores);
  const scoreGeo = (geoData as any)?.ai_visibility_score ?? 0;

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
    geo_data: geoData || {},
    competitors: competitors || null,
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
  });
}
