import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/scores?clientId=xxx&limit=12
 * Retourne l'historique des scores hebdomadaires d'un client
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "12");

  const { data: scores, error } = await supabase
    .from("llmwatch_scores")
    .select("*")
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ scores: scores || [] });
}
