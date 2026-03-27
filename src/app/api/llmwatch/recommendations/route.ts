import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/recommendations?clientId=xxx
 * Retourne les recommandations AI de la dernière semaine
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("llmwatch_recommendations")
    .select("*")
    .eq("client_id", clientId)
    .order("week_start", { ascending: false })
    .order("priority", { ascending: true })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ recommendations: data || [] });
}
