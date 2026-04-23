/**
 * Google OAuth helpers for GSC + GA4.
 *
 * Requires env vars:
 *   - GOOGLE_OAUTH_CLIENT_ID
 *   - GOOGLE_OAUTH_CLIENT_SECRET
 *   - NEXT_PUBLIC_SITE_URL (e.g. https://mcva-audit.vercel.app)
 *
 * POLE-PERFORMANCE v2.1 Phase 2B.
 */

export const GOOGLE_SCOPES = {
  gsc: "https://www.googleapis.com/auth/webmasters.readonly",
  ga4: "https://www.googleapis.com/auth/analytics.readonly",
  email: "https://www.googleapis.com/auth/userinfo.email",
} as const;

export type GoogleProvider = "google_gsc" | "google_ga4";

export function buildAuthorizeUrl(provider: GoogleProvider, state: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || "https://mcva-audit.vercel.app";
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not set");

  const scopes = [
    provider === "google_gsc" ? GOOGLE_SCOPES.gsc : GOOGLE_SCOPES.ga4,
    GOOGLE_SCOPES.email,
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${redirectBase}/api/integrations/google/callback`,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectBase = process.env.NEXT_PUBLIC_SITE_URL || "https://mcva-audit.vercel.app";
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not set");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${redirectBase}/api/integrations/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials not set");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email || null;
  } catch {
    return null;
  }
}
