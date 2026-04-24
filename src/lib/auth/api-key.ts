/**
 * API Key auth helper (Phase 3A — POLE-PERF v3 hybrid)
 *
 * Pattern :
 * - Génération : crypto.randomBytes(32) → base64url → prefix "mcva_live_"
 * - Stockage : SHA-256(full_key) en DB, jamais le full
 * - Vérification : hash la clé reçue, compare en DB via RPC
 *
 * Usage (dans un route handler) :
 *   const auth = await verifyApiKey(request.headers.get("x-mcva-import-key"));
 *   if (!auth.valid) return NextResponse.json({ error: auth.reason }, { status: 401 });
 */

import { createServiceClient } from "@/lib/supabase/server";
import { createHash, randomBytes } from "crypto";

const KEY_PREFIX_LIVE = "mcva_live_";
const KEY_PREFIX_TEST = "mcva_test_";
const KEY_RANDOM_BYTES = 32; // 256 bits

export interface GeneratedApiKey {
  /** Full key to show ONCE to the user (never stored in plain). */
  plaintext: string;
  /** SHA-256 hash stored in DB. */
  key_hash: string;
  /** First 12 chars for display (e.g. "mcva_live_Abc"). */
  key_prefix: string;
}

/**
 * Génère une nouvelle API key. À appeler côté serveur uniquement.
 * Le plaintext doit être affiché ONE TIME à l'utilisateur — impossible à récupérer ensuite.
 */
export function generateApiKey(environment: "live" | "test" = "live"): GeneratedApiKey {
  const prefix = environment === "live" ? KEY_PREFIX_LIVE : KEY_PREFIX_TEST;
  const random = randomBytes(KEY_RANDOM_BYTES).toString("base64url");
  const plaintext = `${prefix}${random}`;
  const key_hash = hashKey(plaintext);
  const key_prefix = plaintext.slice(0, 12); // "mcva_live_Ab"
  return { plaintext, key_hash, key_prefix };
}

/** SHA-256 hash (hex) d'une clé — idempotent, sans salt. */
export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

export interface VerifyApiKeyResult {
  valid: boolean;
  reason?: "missing" | "invalid_format" | "not_found" | "revoked";
  api_key_id?: string;
  user_id?: string;
  scope?: string;
}

/**
 * Vérifie une API key reçue dans un header.
 * - Normalise + hash
 * - Lookup via RPC `verify_api_key_v3`
 * - Met à jour `last_used_at` (best-effort, non bloquant)
 */
export async function verifyApiKey(headerValue: string | null): Promise<VerifyApiKeyResult> {
  if (!headerValue) return { valid: false, reason: "missing" };

  const trimmed = headerValue.trim();
  if (!trimmed.startsWith(KEY_PREFIX_LIVE) && !trimmed.startsWith(KEY_PREFIX_TEST)) {
    return { valid: false, reason: "invalid_format" };
  }

  const hash = hashKey(trimmed);
  const service = createServiceClient();

  const { data, error } = await service.rpc("verify_api_key_v3", { p_key_hash: hash });
  if (error || !data || data.length === 0) {
    return { valid: false, reason: "not_found" };
  }

  const row = data[0] as { id: string; user_id: string; scope: string; revoked: boolean };
  if (row.revoked) return { valid: false, reason: "revoked" };

  // Fire-and-forget: update last_used_at
  service
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => { /* ignore */ });

  return {
    valid: true,
    api_key_id: row.id,
    user_id: row.user_id,
    scope: row.scope,
  };
}

/** Vérifie qu'une API key a un scope suffisant. */
export function hasScope(
  actualScope: string | undefined,
  requiredScope: "audit-import" | "llmwatch-read"
): boolean {
  if (!actualScope) return false;
  if (actualScope === "full") return true;
  return actualScope === requiredScope;
}
