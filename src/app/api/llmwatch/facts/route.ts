// GET/POST/DELETE /api/llmwatch/facts
// CRUD for client knowledge base (verifiable facts for factual accuracy scoring)

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("llmwatch_facts")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("category");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ facts: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, factKey, factValue, category, sourceUrl } = body;
  if (!clientId || !factKey || !factValue) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("llmwatch_facts")
    .upsert(
      {
        client_id: clientId,
        fact_key: factKey,
        fact_value: factValue,
        category,
        source_url: sourceUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,fact_key" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ fact: data });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("llmwatch_facts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
