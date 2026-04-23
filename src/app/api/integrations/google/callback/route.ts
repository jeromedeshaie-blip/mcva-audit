/**
 * GET /api/integrations/google/callback?code=...&state=...
 * Exchanges the code for tokens and stores them in external_data_connections.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, fetchGoogleUserEmail, type GoogleProvider } from "@/lib/integrations/google-oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const code = request.nextUrl.searchParams.get("code");
  const stateRaw = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, request.url));
  }
  if (!code || !stateRaw) {
    return NextResponse.redirect(new URL("/settings/integrations?error=missing_params", request.url));
  }

  let provider: GoogleProvider;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    if (state.uid !== user.id) throw new Error("user mismatch");
    provider = state.provider;
  } catch {
    return NextResponse.redirect(new URL("/settings/integrations?error=invalid_state", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await fetchGoogleUserEmail(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const service = createServiceClient();

    // Upsert — replace existing connection for same user+provider
    await service
      .from("external_data_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    await service.from("external_data_connections").insert({
      user_id: user.id,
      provider,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      scope: tokens.scope || null,
      account_email: email,
    });

    return NextResponse.redirect(new URL(`/settings/integrations?connected=${provider}`, request.url));
  } catch (e: any) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(e.message)}`, request.url));
  }
}
