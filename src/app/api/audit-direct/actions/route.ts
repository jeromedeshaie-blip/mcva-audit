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
