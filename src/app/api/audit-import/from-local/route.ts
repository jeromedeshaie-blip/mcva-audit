/**
 * POST /api/audit-import/from-local
 *
 * Reçoit un payload d'audit pré-crawlé depuis le Mac Studio local (Phase 3).
 * Crée un audit dans la DB, stocke l'extraction brute, et retourne l'audit_id
 * pour que le client redirige vers le dashboard.
 *
 * Auth : header `X-MCVA-Import-Key` (API key scope "audit-import" ou "full").
 *
 * POLE-PERFORMANCE v3 Phase 3A.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyApiKey, hasScope } from "@/lib/auth/api-key";
import {
  validateLocalImportPayload,
  type LocalImportPayload,
  type LocalImportResponse,
} from "@/types/local-import";
import { SCORING_VERSION } from "@/lib/scoring/constants";
import { assertNotParkedDomain } from "@/lib/siteaudit/crawler";
import { createHash } from "crypto";

export const maxDuration = 60;

const SCHEMA_VERSION_SUPPORTED = ["3.0"];
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mcva-audit.vercel.app";

export async function POST(request: NextRequest): Promise<NextResponse<LocalImportResponse>> {
  // 1. Auth — API key
  const apiKeyHeader = request.headers.get("x-mcva-import-key");
  const auth = await verifyApiKey(apiKeyHeader);
  if (!auth.valid) {
    return NextResponse.json(
      { success: false, errors: [`Auth failed: ${auth.reason}`] },
      { status: 401 }
    );
  }
  if (!hasScope(auth.scope, "audit-import")) {
    return NextResponse.json(
      { success: false, errors: ["API key scope insufficient (need 'audit-import' or 'full')"] },
      { status: 403 }
    );
  }

  // 2. Parse body
  let payload: LocalImportPayload;
  try {
    payload = (await request.json()) as LocalImportPayload;
  } catch (e: any) {
    return NextResponse.json(
      { success: false, errors: [`Invalid JSON: ${e.message}`] },
      { status: 400 }
    );
  }

  // 3. Schema version check
  if (!SCHEMA_VERSION_SUPPORTED.includes(payload.schema_version)) {
    return NextResponse.json(
      {
        success: false,
        errors: [
          `Unsupported schema_version "${payload.schema_version}". Supported: ${SCHEMA_VERSION_SUPPORTED.join(", ")}`,
        ],
      },
      { status: 400 }
    );
  }

  // 4. Structural validation
  const validationErrors = validateLocalImportPayload(payload);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { success: false, errors: validationErrors },
      { status: 422 }
    );
  }

  const warnings: string[] = [];

  // 5. Parked domain detection on concatenated HTML (règle 10 POLE-PERF)
  const allHtml = payload.pages.map((p) => p.html_truncated || "").join("\n");
  try {
    const mainUrl = payload.pages.find((p) => p.is_homepage)?.url || payload.url;
    assertNotParkedDomain(allHtml, mainUrl);
  } catch (e: any) {
    // Accept the warning but flag it — the local crawler may have wanted audit to proceed anyway
    if (payload.crawl_meta.parked_domain_detected) {
      warnings.push("Parked domain confirmed by server check");
    } else {
      return NextResponse.json(
        {
          success: false,
          errors: [
            `Parked domain detected (${e.code}): ${e.message}. Abort to avoid wasting LLM tokens.`,
          ],
        },
        { status: 400 }
      );
    }
  }

  // 6. Map audit_type
  const auditTypeMap: Record<string, string> = {
    pre_audit: "pre_audit",
    express: "express",
    full: "full",
    ultra: "ultra",
  };
  const auditType = auditTypeMap[payload.audit_type] || "full";

  const fullUrl = payload.url.startsWith("http") ? payload.url : `https://${payload.url}`;
  const domain = (() => {
    try { return new URL(fullUrl).hostname.replace(/^www\./, ""); } catch { return payload.url; }
  })();

  const service = createServiceClient();

  // 7. Generate reference (AUDIT-2026-NNN / THEMA-2026-NNN / PRE-2026-NNN)
  let reference: string | null = null;
  try {
    const { data: refRes } = await service.rpc("generate_audit_reference_v2_1", {
      p_audit_type: auditType,
    });
    if (typeof refRes === "string") reference = refRes;
  } catch {
    // Function may not exist — skip gracefully
  }

  // 8. Create audit record
  const { data: audit, error: createErr } = await service
    .from("audits")
    .insert({
      url: fullUrl,
      domain,
      sector: payload.sector || null,
      audit_type: auditType,
      status: "processing",
      created_by: auth.user_id,
      theme: auditType !== "ultra" && payload.themes?.length === 1 ? payload.themes[0] : null,
      themes: payload.themes && payload.themes.length > 0 ? payload.themes : null,
      reference,
      brand_name: payload.brand_name || null,
      is_spa: payload.crawl_meta.spa_detected || false,
      // Stock le HTML concaténé des homepages pour le scoring downstream (backward compat)
      scraped_html: payload.pages.find((p) => p.is_homepage)?.html_truncated
        || payload.pages[0]?.html_truncated
        || null,
    })
    .select()
    .single();

  if (createErr || !audit) {
    return NextResponse.json(
      { success: false, errors: [`DB insert failed: ${createErr?.message}`] },
      { status: 500 }
    );
  }

  // 9. Compute aggregate HTML hash for dedup
  const aggregateHash = createHash("sha256")
    .update(payload.pages.map((p) => p.html_hash).sort().join("|"), "utf8")
    .digest("hex");

  // 10. Store extraction payload
  const extractionDurationMs =
    new Date(payload.crawl_meta.finished_at).getTime() -
    new Date(payload.crawl_meta.started_at).getTime();

  const { error: extractionErr } = await service
    .from("audit_local_extractions")
    .insert({
      audit_id: audit.id,
      source: "mac_studio_local",
      extractor_model: payload.crawl_meta.extractor_model,
      extractor_version: payload.schema_version,
      crawler_version: payload.crawl_meta.crawler_version || "unknown",
      pages_count: payload.pages.length,
      spa_detected: payload.crawl_meta.spa_detected || false,
      payload_json: payload,
      html_hash: aggregateHash,
      extraction_duration_ms: Math.max(0, extractionDurationMs),
      uploaded_by_api_key: auth.api_key_id,
    });

  if (extractionErr) {
    // Rollback audit creation to keep things clean
    await service.from("audits").delete().eq("id", audit.id);
    return NextResponse.json(
      { success: false, errors: [`Extraction DB insert failed: ${extractionErr.message}`] },
      { status: 500 }
    );
  }

  // 11. Log the scoring_version used (stored alongside audit_scores during scoring phase)
  //     Note: actual scoring happens via the existing /api/audit-direct/score* chain,
  //     which the frontend will trigger. We don't block here to keep maxDuration safe.

  return NextResponse.json({
    success: true,
    audit_id: audit.id,
    reference: audit.reference || undefined,
    dashboard_url: `${BASE_URL}/audit/${audit.id}`,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/audit-import/from-local",
    schema_version: "3.0",
    scoring_version: SCORING_VERSION,
    auth: "Header X-MCVA-Import-Key required (scope: audit-import|full)",
    docs: `${BASE_URL}/docs/local-crawler-setup.md`,
  });
}
