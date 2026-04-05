import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { scoreThemeDimension, getThemeDimensions } from "@/lib/scoring/theme-scorer";
import type { QualityLevel } from "@/types/audit";

export const maxDuration = 300;

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

  return NextResponse.json({
    theme,
    dimensions,
    itemCount: items.length,
    failed: failed.length > 0 ? failed : undefined,
  });
}
