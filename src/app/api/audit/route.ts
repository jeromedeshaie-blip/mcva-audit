import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

/** Max URL length to accept */
const MAX_URL_LENGTH = 2048;
const MAX_SECTOR_LENGTH = 100;

/**
 * POST /api/audit — Launch an audit (express or full)
 *
 * Body: { url: string, sector?: string, type: "express" | "full", parent_audit_id?: string }
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

  // Parse body safely
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { url, sector, type = "express", parent_audit_id, quality = "standard" } = body as {
    url: string;
    sector?: string;
    type?: "express" | "full";
    parent_audit_id?: string;
    quality?: "eco" | "standard" | "premium";
  };

  // Input validation
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL requise" }, { status: 400 });
  }

  if (url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "URL trop longue" }, { status: 400 });
  }

  if (sector && (typeof sector !== "string" || sector.length > MAX_SECTOR_LENGTH)) {
    return NextResponse.json({ error: "Secteur invalide" }, { status: 400 });
  }

  if (type && !["express", "full"].includes(type)) {
    return NextResponse.json({ error: "Type d'audit invalide" }, { status: 400 });
  }

  if (quality && !["eco", "standard", "premium", "ultra"].includes(quality)) {
    return NextResponse.json({ error: "Niveau de qualité invalide" }, { status: 400 });
  }

  // Extract domain from URL
  let domain: string;
  try {
    const parsed = new URL(
      url.startsWith("https://") || url.startsWith("http://") ? url : `https://${url}`
    );
    domain = parsed.hostname.replace(/^www\./, "");
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  // Validate parent_audit_id ownership if provided
  if (parent_audit_id) {
    const { data: parentAudit } = await supabase
      .from("audits")
      .select("id, created_by")
      .eq("id", parent_audit_id)
      .single();

    if (!parentAudit) {
      return NextResponse.json({ error: "Audit parent introuvable" }, { status: 404 });
    }

    if (parentAudit.created_by !== user.id) {
      return NextResponse.json({ error: "Audit parent non autorisé" }, { status: 403 });
    }
  }

  // Create audit record
  const normalizedUrl = url.startsWith("https://") || url.startsWith("http://") ? url : `https://${url}`;

  const { data: audit, error } = await supabase
    .from("audits")
    .insert({
      url: normalizedUrl,
      domain,
      sector: sector || null,
      audit_type: type,
      status: "pending",
      parent_audit_id: parent_audit_id || null,
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

  try {
    await inngest.send({
      name: eventName,
      data: {
        auditId: audit.id,
        url: audit.url,
        domain: audit.domain,
        sector: audit.sector,
        quality: quality || "standard",
      },
    });
  } catch (inngestError) {
    // Inngest send failed — mark audit as error so it doesn't stay "pending" forever
    console.error(`[audit:${audit.id}] Inngest send failed:`, inngestError);
    await supabase
      .from("audits")
      .update({ status: "error" })
      .eq("id", audit.id);

    return NextResponse.json(
      { error: "Erreur lors du lancement de l'audit", detail: "Service d'orchestration indisponible" },
      { status: 503 }
    );
  }

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
    // List recent audits with their scores
    const { data: audits, error: auditsError } = await supabase
      .from("audits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (auditsError) {
      console.error("[api/audit] Failed to list audits:", auditsError.message);
      return NextResponse.json({ error: "Erreur lors de la récupération des audits" }, { status: 500 });
    }

    if (!audits || audits.length === 0) {
      return NextResponse.json({ audits: [] });
    }

    // Fetch scores for completed audits
    const auditIds = audits.filter((a) => a.status === "completed").map((a) => a.id);
    const { data: allScores } = auditIds.length > 0
      ? await supabase.from("audit_scores").select("*").in("audit_id", auditIds)
      : { data: [] };

    const scoresMap = new Map((allScores || []).map((s) => [s.audit_id, s]));

    return NextResponse.json({
      audits: audits.map((audit) => ({
        audit,
        scores: scoresMap.get(audit.id) || null,
      })),
    });
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
