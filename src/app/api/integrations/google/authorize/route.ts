/**
 * GET /api/integrations/google/authorize?provider=google_gsc
 * Redirects the user to Google's OAuth consent screen.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl, type GoogleProvider } from "@/lib/integrations/google-oauth";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const provider = request.nextUrl.searchParams.get("provider") as GoogleProvider | null;
  if (!provider || !["google_gsc", "google_ga4"].includes(provider)) {
    return NextResponse.json({ error: "provider requis (google_gsc | google_ga4)" }, { status: 400 });
  }

  // State embeds user + provider for callback security (CSRF + routing)
  const state = Buffer.from(JSON.stringify({ uid: user.id, provider, ts: Date.now() })).toString("base64url");

  try {
    const url = buildAuthorizeUrl(provider, state);
    return NextResponse.redirect(url);
  } catch (e: any) {
    return NextResponse.json({ error: "OAuth config missing", detail: e.message }, { status: 500 });
  }
}
