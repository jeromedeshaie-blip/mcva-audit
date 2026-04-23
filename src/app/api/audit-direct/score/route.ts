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
