/**
 * API /api/api-keys — CRUD utilisateur authentifié
 *
 * GET    : liste les clés actives de l'utilisateur (sans plaintext)
 * POST   : génère une nouvelle clé (retourne plaintext UNE SEULE FOIS)
 * DELETE : révoque une clé
 *
 * POLE-PERFORMANCE v3 Phase 3A.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/auth/api-key";

export const maxDuration = 15;

const VALID_SCOPES = ["audit-import", "llmwatch-read", "full"] as const;

// ---------- GET : list keys ----------
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("api_keys")
    .select("id, label, key_prefix, scope, last_used_at, revoked_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "DB error", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys: data || [] });
}

// ---------- POST : create key ----------
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { label, scope = "audit-import", environment = "live" } = body;

  if (!label || typeof label !== "string" || label.length < 3 || label.length > 80) {
    return NextResponse.json({ error: "label requis (3-80 chars)" }, { status: 400 });
  }
  if (!VALID_SCOPES.includes(scope)) {
    return NextResponse.json(
      { error: `scope invalide. Valeurs : ${VALID_SCOPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (environment !== "live" && environment !== "test") {
    return NextResponse.json({ error: "environment: 'live' ou 'test'" }, { status: 400 });
  }

  // Limit to 10 active keys per user
  const service = createServiceClient();
  const { count: activeCount } = await service
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if ((activeCount ?? 0) >= 10) {
    return NextResponse.json(
      { error: "Max 10 clés actives. Révoquez-en avant d'en créer une nouvelle." },
      { status: 409 }
    );
  }

  // Generate + insert
  const generated = generateApiKey(environment);
  const { data: inserted, error: insertErr } = await service
    .from("api_keys")
    .insert({
      user_id: user.id,
      label,
      key_hash: generated.key_hash,
      key_prefix: generated.key_prefix,
      scope,
    })
    .select("id, label, key_prefix, scope, created_at")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "DB insert failed", detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    key: {
      ...inserted,
      // Plaintext retourné UNE SEULE FOIS — impossible à récupérer après
      plaintext: generated.plaintext,
    },
    warning: "Copiez cette clé maintenant. Elle ne sera plus jamais affichée.",
    example_curl: buildExampleCurl(generated.plaintext),
  });
}

// ---------- DELETE : revoke key ----------
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const keyId = request.nextUrl.searchParams.get("id");
  if (!keyId) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const service = createServiceClient();

  // Ownership check
  const { data: existing } = await service
    .from("api_keys")
    .select("user_id")
    .eq("id", keyId)
    .maybeSingle();
  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });
  }

  const { error } = await service
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);

  if (error) {
    return NextResponse.json({ error: "DB update failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ---------- Helpers ----------

function buildExampleCurl(apiKey: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://mcva-audit.vercel.app";
  return `curl -X POST "${base}/api/audit-import/from-local" \\
  -H "Content-Type: application/json" \\
  -H "X-MCVA-Import-Key: ${apiKey}" \\
  -d @audit.local.json`;
}
