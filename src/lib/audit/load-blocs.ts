/**
 * Load external blocks (A-F) from audit_external_blocks for a given audit.
 * Returns a BlocsBundle ready for enrichment in the scoring pipeline.
 *
 * POLE-PERFORMANCE v2.1 § 6.4.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlocsBundle } from "@/lib/scoring/external-mapping";

export async function loadAuditBlocs(
  supabase: SupabaseClient,
  auditId: string
): Promise<BlocsBundle> {
  const { data, error } = await supabase
    .from("audit_external_blocks")
    .select("bloc_letter, data_json, source_label")
    .eq("audit_id", auditId);

  if (error || !data) return {};

  const bundle: BlocsBundle = { sourceLabels: {} };

  for (const row of data as any[]) {
    const letter = row.bloc_letter as "A" | "B" | "C" | "D" | "E" | "F";
    (bundle as any)[letter] = row.data_json;
    if (row.source_label) {
      bundle.sourceLabels![letter] = row.source_label;
    }
  }

  return bundle;
}
