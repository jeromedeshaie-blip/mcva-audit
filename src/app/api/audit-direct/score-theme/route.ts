import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { scoreThemeDimension, getThemeDimensions } from "@/lib/scoring/theme-scorer";
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

  // Get all dimensions for this theme
  const dimensions = getThemeDimensions(theme, effectiveMode as "express" | "full");
  if (dimensions.length === 0) {
    return NextResponse.json({ theme, dimensions: [], itemCount: 0 });
  }

  // Score all dimensions in parallel
  const results = await Promise.allSettled(
    dimensions.map((dim) =>
      scoreThemeDimension(theme, dim, html, url, effectiveMode as "express" | "full", quality)
    )
  );

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

  // Save items (delete existing for this theme first for idempotency)
  if (items.length > 0) {
    await serviceClient
      .from("audit_items")
      .delete()
      .eq("audit_id", auditId)
      .eq("framework", theme);

    const { error: insertErr } = await serviceClient
      .from("audit_items")
      .insert(items.map((item) => ({ audit_id: auditId, ...item })));

    if (insertErr) {
      return NextResponse.json({
        error: "Erreur sauvegarde items",
        detail: insertErr.message,
        itemCount: items.length,
        failed,
      }, { status: 500 });
    }
  }

  return NextResponse.json({
    theme,
    dimensions,
    itemCount: items.length,
    failed: failed.length > 0 ? failed : undefined,
  });
}
