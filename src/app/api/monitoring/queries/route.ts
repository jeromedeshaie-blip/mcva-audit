// GET /api/monitoring/queries?clientId=xxx
// Retourne la liste des queries actives d'un client + infos client pour le scoring

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Auth check with user client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requis" }, { status: 400 });

  // Use service client to bypass RLS
  const serviceClient = createServiceClient();

  // Fetch client info, active queries, competitors, and facts in parallel
  const [clientRes, queriesRes, competitorsRes, factsRes] = await Promise.all([
    serviceClient
      .from("llmwatch_clients")
      .select("id, name, domain, brand_keywords")
      .eq("id", clientId)
      .single(),
    serviceClient
      .from("llmwatch_queries")
      .select("id, text_fr, category")
      .eq("client_id", clientId)
      .eq("active", true)
      .order("sort_order"),
    serviceClient
      .from("llmwatch_competitors")
      .select("name")
      .eq("client_id", clientId)
      .eq("active", true),
    serviceClient
      .from("llmwatch_facts")
      .select("fact_key, fact_value")
      .eq("client_id", clientId)
      .eq("active", true),
  ]);

  if (!clientRes.data) {
    return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  }

  const competitors = (competitorsRes.data || []).map((c: any) => c.name);
  const knownFacts: Record<string, string> = {};
  for (const f of factsRes.data || []) {
    knownFacts[f.fact_key] = f.fact_value;
  }

  return NextResponse.json({
    client: {
      id: clientRes.data.id,
      name: clientRes.data.name,
      domain: clientRes.data.domain,
      brand_keywords: clientRes.data.brand_keywords,
    },
    competitors,
    knownFacts,
    queries: (queriesRes.data || []).map((q: any) => ({
      id: q.id,
      text_fr: q.text_fr,
      category: q.category,
    })),
    total: queriesRes.data?.length || 0,
  });
}
