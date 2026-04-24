import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateActionPlan, generateUltraActionPlan } from "@/lib/scoring/action-plan";
import { verifyUserOrApiKey } from "@/lib/auth/user-or-api-key";
import type { QualityLevel } from "@/types/audit";

export const maxDuration = 60;

/**
 * POST /api/audit-direct/action-plan
 * Generate LLM-based strategic action plan (separated from finalize to fit in 60s).
 * Auth : cookie user OU X-MCVA-Import-Key
 */
export async function POST(request: NextRequest) {
  const auth = await verifyUserOrApiKey(request, "audit-import");
  if (!auth.ok) return NextResponse.json({ error: auth.reason || "Non authentifié" }, { status: 401 });

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
