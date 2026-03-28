import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SECTOR_GROUPS } from "@/lib/constants";

/**
 * GET /api/rankings?sector=tech-saas — Get sub-sector rankings
 * GET /api/rankings?sector=tech&group=1 — Get aggregated group rankings (all sub-sectors)
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

  const isGroup = request.nextUrl.searchParams.get("group") === "1";

  if (isGroup) {
    // Find the group and get all its sub-sector values
    const group = SECTOR_GROUPS.find((g) => g.value === sector);
    if (!group) {
      return NextResponse.json({ rankings: [] });
    }
    const subSectorValues = group.subSectors.map((s) => s.value);

    // Query all sub-sectors of this group
    const { data: rankings } = await supabase
      .from("sector_rankings")
      .select("*")
      .in("sector", subSectorValues)
      .order("rank_seo", { ascending: true })
      .limit(50);

    return NextResponse.json({ rankings: rankings || [] });
  }

  // Standard sub-sector query
  const { data: rankings } = await supabase
    .from("sector_rankings")
    .select("*")
    .eq("sector", sector)
    .order("rank_seo", { ascending: true })
    .limit(50);

  return NextResponse.json({ rankings: rankings || [] });
}
