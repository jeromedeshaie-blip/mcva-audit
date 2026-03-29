import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { aggregateScores, calculateSeoScore } from "@/lib/scoring/scorer";
import { generateActionPlan } from "@/lib/scoring/action-plan";
import type { SeoData, GeoData, QualityLevel } from "@/types/audit";

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
    serviceClient.from("audits").select("url").eq("id", auditId).single(),
    serviceClient.from("audit_items").select("*").eq("audit_id", auditId),
  ]);

  if (itemsRes.error) {
    return NextResponse.json({ error: "Erreur lecture items", detail: itemsRes.error.message }, { status: 500 });
  }

  const items = itemsRes.data || [];
  const auditUrl = auditRes.data?.url || "";
  const coreEeatItems = items.filter((i: any) => i.framework === "core_eeat");
  const citeItems = items.filter((i: any) => i.framework === "cite");

  // Aggregate scores
  const coreEeatScores = aggregateScores(coreEeatItems);
  const citeScores = aggregateScores(citeItems);
  const scoreSeo = calculateSeoScore(coreEeatScores);
  const scoreGeo = (geoData as any)?.ai_visibility_score ?? 0;

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

  // Run score save and action plan generation IN PARALLEL
  // Score save is pure DB (~2s), action plan is Haiku call (~5-10s)
  const [scoresSaveResult, actionPlanResult] = await Promise.allSettled([
    // Save scores
    (async () => {
      await serviceClient.from("audit_scores").delete().eq("audit_id", auditId);
      const { error: scoresErr } = await serviceClient.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_core_eeat: coreEeatScores,
        score_cite: citeScores,
        seo_provider: seoProvider.name,
        seo_data: enrichedSeoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: geoData || {},
        competitors: competitors || null,
      });
      if (scoresErr) throw scoresErr;
    })(),

    // Generate strategic action plan via LLM (Haiku = fast)
    (async () => {
      if (items.length === 0) return [];
      try {
        return await generateActionPlan(
          items.map((i: any) => ({
            item_code: i.item_code,
            item_label: i.item_label,
            status: i.status,
            score: i.score,
            notes: i.notes,
            dimension: i.dimension,
            framework: i.framework,
          })),
          enrichedSeoData as any,
          geoData || null,
          auditUrl,
          quality
        );
      } catch (e: any) {
        console.error("[finalize] Action plan generation failed:", e.message);
        return [];
      }
    })(),
  ]);

  if (scoresSaveResult.status === "rejected") {
    return NextResponse.json({
      error: "Erreur sauvegarde scores",
      detail: (scoresSaveResult.reason as any)?.message,
    }, { status: 500 });
  }

  // Collect all actions: tech recommendations + LLM strategic actions
  const techActions = (siteAuditData?.techRecommendations || []).map((rec: any) => ({
    audit_id: auditId,
    priority: rec.priority === "critical" ? "P1" : rec.priority === "high" ? "P2" : rec.priority === "medium" ? "P3" : "P4",
    title: rec.title,
    description: `${rec.description}\n\nAction : ${rec.action}`,
    impact_points: rec.impact_points,
    effort: rec.effort === "low" ? "< 1h" : rec.effort === "medium" ? "1-2 jours" : "1 semaine",
    category: rec.dimension === "geo" ? "GEO" : rec.dimension === "performance" ? "technique" : rec.dimension === "accessibility" ? "technique" : "SEO",
  }));

  const llmActions = actionPlanResult.status === "fulfilled"
    ? (actionPlanResult.value as any[]).map((a: any) => ({
        audit_id: auditId,
        priority: a.priority,
        title: a.title,
        description: a.description,
        impact_points: a.impact_points,
        effort: a.effort,
        category: a.category,
      }))
    : [];

  const allActions = [...llmActions, ...techActions];

  // Save all actions
  if (allActions.length > 0) {
    await serviceClient.from("audit_actions").delete().eq("audit_id", auditId);
    await serviceClient.from("audit_actions").insert(allActions);
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
    scores: { seo: scoreSeo, geo: scoreGeo },
    itemCount: items.length,
    actionCount: allActions.length,
    llmActionsGenerated: llmActions.length,
  });
}
