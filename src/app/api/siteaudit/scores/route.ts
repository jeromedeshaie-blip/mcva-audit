import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/siteaudit/scores?url=xxx or ?clientId=xxx
 * Retourne l'historique des audits
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = request.nextUrl.searchParams.get("url");
  const clientId = request.nextUrl.searchParams.get("clientId");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

  let query = supabase
    .from("siteaudit_results")
    .select(
      "id, url, audited_at, score_global, score_seo, score_performance, score_accessibility, score_readability, pages_crawled, crawl_duration_ms, error"
    )
    .order("audited_at", { ascending: false })
    .limit(limit);

  if (clientId) {
    query = query.eq("client_id", clientId);
  } else if (url) {
    query = query.eq("url", url);
  } else {
    return NextResponse.json(
      { error: "url ou clientId requis" },
      { status: 400 }
    );
  }

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ audits: data || [] });
}
