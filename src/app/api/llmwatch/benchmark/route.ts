import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/benchmark?clientId=xxx
 * Retourne les scores concurrents pour comparaison
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  // Fetch competitors
  const { data: competitors } = await supabase
    .from("llmwatch_competitors")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true);

  if (!competitors?.length) {
    return NextResponse.json({ competitors: [], scores: [] });
  }

  // Fetch latest scores for each competitor
  const competitorIds = competitors.map((c) => c.id);
  const { data: scores } = await supabase
    .from("llmwatch_competitor_scores")
    .select("*")
    .in("competitor_id", competitorIds)
    .order("week_start", { ascending: false })
    .limit(competitorIds.length * 12); // 12 weeks per competitor max

  return NextResponse.json({
    competitors: competitors || [],
    scores: scores || [],
  });
}
