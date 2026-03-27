import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/results?clientId=xxx&weekStart=2026-03-23
 * Retourne tous les résultats bruts d'une semaine avec les infos query
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const weekStart = request.nextUrl.searchParams.get("weekStart");

  let query = supabase
    .from("llmwatch_raw_results")
    .select("id, client_id, query_id, llm, lang, cited, rank, snippet, collected_at")
    .eq("client_id", clientId)
    .order("collected_at", { ascending: false });

  if (weekStart) {
    // Filter results from this week onwards (7 days)
    const endDate = new Date(weekStart);
    endDate.setDate(endDate.getDate() + 7);
    query = query
      .gte("collected_at", weekStart)
      .lt("collected_at", endDate.toISOString().split("T")[0]);
  } else {
    query = query.limit(100);
  }

  const { data: results, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch queries for labels
  const { data: queries } = await supabase
    .from("llmwatch_queries")
    .select("id, text_fr, text_de, text_en")
    .eq("client_id", clientId);

  return NextResponse.json({
    results: results || [],
    queries: queries || [],
  });
}
