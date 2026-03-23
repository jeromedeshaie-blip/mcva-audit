import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

/**
 * POST /api/audit — Launch an audit (express or full)
 *
 * Body: { url: string, sector?: string, type: "express" | "full" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { url, sector, type = "express" } = body as {
    url: string;
    sector?: string;
    type?: "express" | "full";
  };

  if (!url) {
    return NextResponse.json({ error: "URL requise" }, { status: 400 });
  }

  // Extract domain from URL
  let domain: string;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    domain = parsed.hostname.replace(/^www\./, "");
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  // Create audit record
  const { data: audit, error } = await supabase
    .from("audits")
    .insert({
      url: url.startsWith("http") ? url : `https://${url}`,
      domain,
      sector: sector || null,
      audit_type: type,
      status: "pending",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Erreur lors de la création de l'audit", detail: error.message },
      { status: 500 }
    );
  }

  // Trigger Inngest function
  const eventName =
    type === "full" ? "audit/full.requested" : "audit/express.requested";

  await inngest.send({
    name: eventName,
    data: {
      auditId: audit.id,
      url: audit.url,
      domain: audit.domain,
      sector: audit.sector,
    },
  });

  return NextResponse.json({
    audit_id: audit.id,
    status: "pending",
    type,
    message: `Audit ${type} lancé. Suivez la progression en temps réel.`,
  });
}

/**
 * GET /api/audit?id=xxx — Get audit results
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const auditId = request.nextUrl.searchParams.get("id");

  if (!auditId) {
    // List recent audits
    const { data: audits } = await supabase
      .from("audits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ audits });
  }

  // Get specific audit with scores and items
  const [auditRes, scoresRes, itemsRes, actionsRes] = await Promise.all([
    supabase.from("audits").select("*").eq("id", auditId).single(),
    supabase.from("audit_scores").select("*").eq("audit_id", auditId).single(),
    supabase
      .from("audit_items")
      .select("*")
      .eq("audit_id", auditId)
      .order("item_code"),
    supabase
      .from("audit_actions")
      .select("*")
      .eq("audit_id", auditId)
      .order("priority"),
  ]);

  return NextResponse.json({
    audit: auditRes.data,
    scores: scoresRes.data,
    items: itemsRes.data,
    actions: actionsRes.data,
  });
}
