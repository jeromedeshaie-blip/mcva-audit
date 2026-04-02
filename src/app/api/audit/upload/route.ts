import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { parseSemrushCsv } from "@/lib/parsers/semrush-parser";
import { parseQwairyCsv } from "@/lib/parsers/qwairy-parser";

export const maxDuration = 30;

const VALID_SOURCES = ["semrush", "qwairy"] as const;
type UploadSource = (typeof VALID_SOURCES)[number];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/audit/upload
 * Upload a Semrush or Qwairy CSV file for an audit.
 *
 * Multipart form data:
 *   - auditId: string (required)
 *   - source: "semrush" | "qwairy" (required)
 *   - file: CSV file (required)
 */
export async function POST(request: NextRequest) {
  // --- Auth check ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // --- Parse multipart form data ---
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Requête invalide — multipart/form-data attendu" },
      { status: 400 }
    );
  }

  const auditId = formData.get("auditId") as string | null;
  const source = formData.get("source") as string | null;
  const file = formData.get("file") as File | null;

  // --- Validate inputs ---
  if (!auditId) {
    return NextResponse.json({ error: "auditId requis" }, { status: 400 });
  }
  if (!source || !VALID_SOURCES.includes(source as UploadSource)) {
    return NextResponse.json(
      { error: `source invalide — attendu: ${VALID_SOURCES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!file) {
    return NextResponse.json({ error: "Fichier CSV requis" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024} Mo)` },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  // --- Verify audit exists and belongs to user ---
  const { data: audit, error: auditErr } = await serviceClient
    .from("audits")
    .select("id, created_by")
    .eq("id", auditId)
    .single();

  if (auditErr || !audit) {
    return NextResponse.json({ error: "Audit introuvable" }, { status: 404 });
  }
  if (audit.created_by !== user.id) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  // --- Read file content ---
  let csvContent: string;
  try {
    const buffer = await file.arrayBuffer();
    // Try UTF-8 first, fallback to latin-1 for European exports
    csvContent = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    try {
      const buffer = await file.arrayBuffer();
      csvContent = new TextDecoder("iso-8859-1").decode(buffer);
    } catch {
      return NextResponse.json(
        { error: "Impossible de lire le fichier — encodage non supporté" },
        { status: 400 }
      );
    }
  }

  // --- Parse CSV ---
  let parsedData: Record<string, unknown>;
  let status: "parsed" | "error" = "parsed";
  let errorMessage: string | null = null;

  try {
    if (source === "semrush") {
      parsedData = parseSemrushCsv(csvContent) as unknown as Record<string, unknown>;
    } else {
      parsedData = parseQwairyCsv(csvContent) as unknown as Record<string, unknown>;
    }
  } catch (e: any) {
    status = "error";
    errorMessage = e.message || "Erreur de parsing CSV";
    parsedData = {};
  }

  // --- Store in audit_uploads table ---
  const { data: upload, error: insertErr } = await serviceClient
    .from("audit_uploads")
    .insert({
      audit_id: auditId,
      source,
      file_name: file.name,
      file_type: file.type || "text/csv",
      file_size: file.size,
      parsed_data: parsedData,
      status,
      error_message: errorMessage,
      uploaded_by: user.id,
    })
    .select("id, source, status, error_message")
    .single();

  if (insertErr || !upload) {
    return NextResponse.json(
      { error: "Erreur sauvegarde upload", detail: insertErr?.message },
      { status: 500 }
    );
  }

  // --- Build summary for response ---
  const summary = buildSummary(source as UploadSource, parsedData);

  return NextResponse.json({
    uploadId: upload.id,
    source: upload.source,
    status: upload.status,
    errorMessage: upload.error_message,
    parsedData: summary,
  });
}

/**
 * Build a lightweight summary of parsed data for the API response.
 * Avoids returning the full parsed payload (which may be large).
 */
function buildSummary(
  source: UploadSource,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (source === "semrush") {
    return {
      organic_traffic: data.organic_traffic ?? null,
      organic_keywords: data.organic_keywords ?? null,
      authority_score: data.authority_score ?? null,
      backlinks_total: data.backlinks_total ?? null,
      referring_domains: data.referring_domains ?? null,
      rank_ch: data.rank_ch ?? null,
      top_keywords_count: Array.isArray(data.top_keywords) ? data.top_keywords.length : 0,
      competitors_count: Array.isArray(data.competitors) ? data.competitors.length : 0,
      audit_issues_count: Array.isArray(data.audit_issues) ? data.audit_issues.length : 0,
    };
  }

  // qwairy
  return {
    mention_rate: data.mention_rate ?? 0,
    source_rate: data.source_rate ?? 0,
    share_of_voice: data.share_of_voice ?? 0,
    sentiment_score: data.sentiment_score ?? 0,
    llm_count: Array.isArray(data.llm_results) ? data.llm_results.length : 0,
    total_prompts: data.total_prompts ?? 0,
    total_responses: data.total_responses ?? 0,
    competitor_sov_count: Array.isArray(data.competitor_sov) ? data.competitor_sov.length : 0,
    topics_count: Array.isArray(data.topics) ? data.topics.length : 0,
  };
}
