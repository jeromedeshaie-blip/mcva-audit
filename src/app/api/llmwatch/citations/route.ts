import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/citations?clientId=xxx&limit=20
 * Retourne les dernières citations/résultats bruts d'un client
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
  const citedOnly = request.nextUrl.searchParams.get("cited") === "true";

  let query = supabase
    .from("llmwatch_raw_results")
    .select("*")
    .eq("client_id", clientId)
    .order("collected_at", { ascending: false })
    .limit(limit);

  if (citedOnly) {
    query = query.eq("cited", true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ citations: data || [] });
}
