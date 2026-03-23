import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/rankings?sector=tech-saas — Get sector rankings
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sector = request.nextUrl.searchParams.get("sector");
  if (!sector) {
    return NextResponse.json({ error: "Secteur requis" }, { status: 400 });
  }

  const { data: rankings } = await supabase
    .from("sector_rankings")
    .select("*")
    .eq("sector", sector)
    .order("rank_seo", { ascending: true })
    .limit(50);

  return NextResponse.json({ rankings: rankings || [] });
}
