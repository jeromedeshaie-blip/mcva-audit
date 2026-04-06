import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/llmwatch/clients — List all LLM Watch clients (admin)
 * GET /api/llmwatch/clients?id=xxx — Get one client with queries + competitors
 * POST /api/llmwatch/clients — Create a new client
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("id");

  if (!clientId) {
    const { data, error } = await supabase
      .from("llmwatch_clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ clients: data || [] });
  }

  // Detail with queries + competitors + latest score
  const [clientRes, queriesRes, competitorsRes, scoreRes] = await Promise.all([
    supabase.from("llmwatch_clients").select("*").eq("id", clientId).single(),
    supabase.from("llmwatch_queries").select("*").eq("client_id", clientId).order("created_at"),
    supabase.from("llmwatch_competitors").select("*").eq("client_id", clientId),
    supabase.from("llmwatch_scores").select("*").eq("client_id", clientId).order("week_start", { ascending: false }).limit(1),
  ]);

  if (!clientRes.data) return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });

  return NextResponse.json({
    client: clientRes.data,
    queries: queriesRes.data || [],
    competitors: competitorsRes.data || [],
    latestScore: scoreRes.data?.[0] || null,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { name, sector, location, plan, contact_email, monitoring_frequency, queries, competitors } = body;

  if (!name || !contact_email) {
    return NextResponse.json({ error: "Nom et email requis" }, { status: 400 });
  }

  const validFrequencies = ["weekly", "monthly", "quarterly", "manual"];
  const frequency = validFrequencies.includes(monitoring_frequency) ? monitoring_frequency : "manual";

  const serviceClient = createServiceClient();

  // Create client
  const { data: client, error: clientError } = await serviceClient
    .from("llmwatch_clients")
    .insert({
      name,
      sector,
      location,
      plan: plan || "business",
      contact_email,
      monitoring_frequency: frequency,
    })
    .select()
    .single();

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 });

  // Insert queries if provided
  if (queries?.length) {
    const queryRows = queries.map((q: any) => ({
      client_id: client.id,
      text_fr: q.text_fr,
      text_de: q.text_de || null,
      text_en: q.text_en || null,
    }));
    await serviceClient.from("llmwatch_queries").insert(queryRows);
  }

  // Insert competitors if provided
  if (competitors?.length) {
    const compRows = competitors.map((c: any) => ({
      client_id: client.id,
      name: c.name,
      keywords: c.keywords || [],
    }));
    await serviceClient.from("llmwatch_competitors").insert(compRows);
  }

  return NextResponse.json({ client });
}
