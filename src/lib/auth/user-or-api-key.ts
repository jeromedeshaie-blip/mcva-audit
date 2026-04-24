/**
 * Auth helper — accepte soit le cookie Supabase (user connecté), soit
 * le header X-MCVA-Import-Key (API key Phase 3).
 *
 * Permet aux endpoints scoring de fonctionner avec les 2 modes d'auth :
 * - UI dashboard (cookie user)
 * - Script local (API key via Mac Studio)
 *
 * POLE-PERFORMANCE v3 Phase 3E.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyApiKey, hasScope } from "./api-key";

export interface AuthResult {
  ok: boolean;
  mode?: "user" | "api_key";
  userId?: string;
  reason?: string;
}

/**
 * Essaie d'authentifier via cookie user en priorité, fallback API key.
 * Retourne { ok: true, mode, userId } si succès.
 */
export async function verifyUserOrApiKey(
  request: NextRequest,
  requiredScope: "audit-import" | "llmwatch-read" = "audit-import"
): Promise<AuthResult> {
  // 1. Essai auth user (cookie Supabase)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    return { ok: true, mode: "user", userId: user.id };
  }

  // 2. Fallback : API key
  const apiKeyHeader = request.headers.get("x-mcva-import-key");
  if (apiKeyHeader) {
    const auth = await verifyApiKey(apiKeyHeader);
    if (auth.valid && hasScope(auth.scope, requiredScope)) {
      return { ok: true, mode: "api_key", userId: auth.user_id };
    }
    return { ok: false, reason: `API key: ${auth.reason || "scope insufficient"}` };
  }

  return { ok: false, reason: "Non authentifie (ni cookie user, ni header X-MCVA-Import-Key)" };
}
