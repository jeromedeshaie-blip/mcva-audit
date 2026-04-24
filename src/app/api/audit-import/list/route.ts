/**
 * GET /api/audit-import/list
 *
 * Liste les imports récents depuis les crawlers locaux (Mac Studio ou autre).
 * Joint avec audits pour afficher URL + référence + status.
 */

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const service = createServiceClient();

  // Join audit_local_extractions ↔ audits (only for audits created_by current user)
  const { data, error } = await service
    .from("audit_local_extractions")
    .select(`
      id,
      source,
      extractor_model,
      crawler_version,
      pages_count,
      spa_detected,
      extraction_duration_ms,
      uploaded_at,
      audit:audits!audit_local_extractions_audit_id_fkey (
        id,
        url,
        domain,
        audit_type,
        reference,
        status,
        created_at,
        completed_at,
        created_by
      )
    `)
    .order("uploaded_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "DB error", detail: error.message }, { status: 500 });
  }

  // Filter imports where the audit belongs to current user (defense in depth)
  const filtered = (data || []).filter((row: any) => {
    const a = Array.isArray(row.audit) ? row.audit[0] : row.audit;
    return a && a.created_by === user.id;
  });

  return NextResponse.json({ imports: filtered });
}
