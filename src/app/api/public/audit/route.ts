import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

const MAX_URL_LENGTH = 2048;

// Simple in-memory rate limit (resets on cold start — good enough for MVP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max audits per email per day

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(email);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(email, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/public/audit — Launch a free eco express audit (no auth required)
 *
 * Body: { url: string, email: string, company?: string, sector?: string }
 * Auth: x-api-key header must match MCVA_PUBLIC_API_KEY env var
 *
 * Returns: { audit_id, status, message }
 */
export async function POST(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.MCVA_PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { url, email, company, sector } = body as {
    url: string;
    email: string;
    company?: string;
    sector?: string;
  };

  // Validate email
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  // Rate limit
  if (!checkRateLimit(email.toLowerCase().trim())) {
    return NextResponse.json(
      { error: "Limite atteinte : maximum 5 audits par jour par email" },
      { status: 429 }
    );
  }

  // Validate URL
  if (!url || typeof url !== "string" || url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    const urlStr = url.startsWith("http") ? url : `https://${url}`;
    parsedUrl = new URL(urlStr);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  const normalizedUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`.replace(/\/$/, "");
  const domain = parsedUrl.hostname.replace(/^www\./, "");
  const sectorValue = typeof sector === "string" && sector.trim() ? sector.trim().slice(0, 100) : "autre";

  const supabase = createServiceClient();

  // Create audit (using service role — no user auth)
  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .insert({
      url: normalizedUrl,
      domain,
      sector: sectorValue,
      audit_type: "express",
      status: "pending",
      parent_audit_id: null,
      created_by: null, // public audit — no user
    })
    .select()
    .single();

  if (auditError) {
    // If created_by NOT NULL constraint fails, we need to handle it
    // Try with a system user approach
    console.error("[public-audit] Insert error:", auditError.message);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'audit", detail: auditError.message },
      { status: 500 }
    );
  }

  // Save lead
  await supabase.from("leads").insert({
    email: email.toLowerCase().trim(),
    company: typeof company === "string" ? company.trim() : null,
    domain,
    url: normalizedUrl,
    sector: sectorValue,
    audit_id: audit.id,
  }).then(({ error: leadErr }: { error: any }) => {
    if (leadErr) console.error("[public-audit] Lead insert error:", leadErr.message);
  });

  // Trigger eco express audit via Inngest
  try {
    await inngest.send({
      name: "audit/express.requested",
      data: {
        auditId: audit.id,
        url: normalizedUrl,
        domain,
        sector: sectorValue,
        quality: "eco",
      },
    });
  } catch (err) {
    console.error("[public-audit] Inngest error:", err);
    return NextResponse.json(
      { error: "Erreur lors du lancement de l'audit" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    audit_id: audit.id,
    status: "pending",
    message: "Audit express lancé. Résultats disponibles dans ~2 minutes.",
  });
}

/**
 * GET /api/public/audit?id=xxx — Get partial audit results (scores only, no item details)
 *
 * Auth: x-api-key header
 *
 * Returns: { status, scores?, dimensions?, geo? }
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.MCVA_PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Clé API invalide" }, { status: 401 });
  }

  const auditId = request.nextUrl.searchParams.get("id");
  if (!auditId) {
    return NextResponse.json({ error: "Paramètre id requis" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch audit status
  const { data: audit } = await supabase
    .from("audits")
    .select("id, url, domain, sector, audit_type, status, created_at, completed_at")
    .eq("id", auditId)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Audit non trouvé" }, { status: 404 });
  }

  // If not completed, return status only
  if (audit.status !== "completed") {
    return NextResponse.json({
      audit_id: audit.id,
      status: audit.status,
      domain: audit.domain,
    });
  }

  // Fetch scores
  const { data: scores } = await supabase
    .from("audit_scores")
    .select("*")
    .eq("audit_id", auditId)
    .single();

  // Fetch items — but only return dimension-level aggregates, not item details
  const { data: items } = await supabase
    .from("audit_items")
    .select("dimension, score, status, framework")
    .eq("audit_id", auditId);

  // Compute dimension averages
  const dimensionScores: Record<string, { total: number; count: number; passed: number; failed: number }> = {};
  for (const item of items || []) {
    const dim = item.dimension;
    if (!dimensionScores[dim]) {
      dimensionScores[dim] = { total: 0, count: 0, passed: 0, failed: 0 };
    }
    dimensionScores[dim].total += item.score ?? 0;
    dimensionScores[dim].count += 1;
    if (item.status === "pass") dimensionScores[dim].passed += 1;
    else dimensionScores[dim].failed += 1;
  }

  const dimensions = Object.entries(dimensionScores).map(([dim, data]) => ({
    dimension: dim,
    average_score: data.count > 0 ? Math.round(data.total / data.count) : 0,
    items_count: data.count,
    passed: data.passed,
    failed: data.failed,
  }));

  // Top 3 strengths and weaknesses (by dimension, no item detail)
  const sorted = [...dimensions].sort((a, b) => b.average_score - a.average_score);
  const strengths = sorted.slice(0, 3).map((d) => d.dimension);
  const weaknesses = sorted.slice(-3).reverse().map((d) => d.dimension);

  return NextResponse.json({
    audit_id: audit.id,
    status: "completed",
    domain: audit.domain,
    url: audit.url,
    sector: audit.sector,
    completed_at: audit.completed_at,

    // Scores globaux (visibles)
    scores: {
      score_seo: scores?.score_seo ?? null,
      score_geo: scores?.score_geo ?? null,
    },

    // Dimensions (visibles — radar chart data)
    dimensions,

    // Insights partiels (teasers)
    insights: {
      strengths, // ex: ["Contextual Clarity", "Originality", ...]
      weaknesses, // ex: ["Trust Signals", "Authority", ...]
      total_items: items?.length ?? 0,
      passed_items: items?.filter((i: any) => i.status === "pass").length ?? 0,
    },

    // Ce qui est verrouillé
    locked: [
      "detail_items", // 30 critères détaillés
      "action_plan", // plan d'action
      "benchmark", // positionnement sectoriel
      "pdf_report", // rapport PDF complet
    ],
  });
}
