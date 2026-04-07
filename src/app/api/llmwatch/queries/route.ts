// LW-008: API for managing client queries
// GET /api/llmwatch/queries?clientId=xxx — list queries
// POST /api/llmwatch/queries — bulk import queries for a client
// DELETE /api/llmwatch/queries — deactivate a query

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  const sc = createServiceClient();
  const { data, error } = await sc
    .from("llmwatch_queries")
    .select("id, text_fr, category, active, sort_order, created_at")
    .eq("client_id", clientId)
    .order("sort_order")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ queries: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { clientId, queries, replaceExisting = false } = body;

  if (!clientId || !queries?.length) {
    return NextResponse.json({ error: "clientId et queries requis" }, { status: 400 });
  }

  const sc = createServiceClient();

  // If replaceExisting, deactivate all current queries
  if (replaceExisting) {
    await sc
      .from("llmwatch_queries")
      .update({ active: false })
      .eq("client_id", clientId);
  }

  // Insert new queries
  const rows = queries.map((q: any, i: number) => ({
    client_id: clientId,
    text_fr: typeof q === "string" ? q.trim() : q.text_fr?.trim(),
    category: typeof q === "string" ? null : q.category || null,
    active: true,
    sort_order: i + 1,
  })).filter((r: any) => r.text_fr);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucune requete valide" }, { status: 400 });
  }

  const { data, error } = await sc
    .from("llmwatch_queries")
    .insert(rows)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    imported: data?.length || 0,
    replaced: replaceExisting,
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { queryId } = body;

  if (!queryId) return NextResponse.json({ error: "queryId requis" }, { status: 400 });

  const sc = createServiceClient();
  const { error } = await sc
    .from("llmwatch_queries")
    .update({ active: false })
    .eq("id", queryId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
