/**
 * POST /api/integrations/google/fetch-ga4
 * Body: { propertyId: "123456789", monthsBack?: 12 }
 * Returns: BlocCData (format Bloc C)
 *
 * Caches 24h via external_data_cache.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { fetchGa4Data, listGa4Properties } from "@/lib/integrations/ga4";
import { refreshAccessToken } from "@/lib/integrations/google-oauth";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { propertyId, monthsBack = 12 } = body;
  if (!propertyId) return NextResponse.json({ error: "propertyId requis" }, { status: 400 });

  const service = createServiceClient();
  const cacheKey = `${propertyId}|${monthsBack}`;

  const { data: cached } = await service
    .from("external_data_cache")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google_ga4")
    .eq("domain", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ data: cached.data_json, cached: true, fetched_at: cached.fetched_at });
  }

  const { data: conn } = await service
    .from("external_data_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google_ga4")
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: "Non connecté à GA4" }, { status: 404 });

  let accessToken = conn.access_token;
  if (conn.expires_at && new Date(conn.expires_at) < new Date()) {
    if (!conn.refresh_token) {
      return NextResponse.json({ error: "Token expiré, reconnectez-vous" }, { status: 401 });
    }
    try {
      const refreshed = await refreshAccessToken(conn.refresh_token);
      accessToken = refreshed.access_token;
      await service
        .from("external_data_connections")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("id", conn.id);
    } catch (e: any) {
      return NextResponse.json({ error: "Refresh échoué", detail: e.message }, { status: 401 });
    }
  }

  try {
    const data = await fetchGa4Data({ accessToken, propertyId, monthsBack });

    await service
      .from("external_data_cache")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google_ga4")
      .eq("domain", cacheKey);
    await service.from("external_data_cache").insert({
      user_id: user.id,
      provider: "google_ga4",
      domain: cacheKey,
      data_json: data,
    });

    return NextResponse.json({ data, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: "GA4 fetch failed", detail: e.message }, { status: 500 });
  }
}

// GET: list properties
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const service = createServiceClient();
  const { data: conn } = await service
    .from("external_data_connections")
    .select("access_token, expires_at, refresh_token, id")
    .eq("user_id", user.id)
    .eq("provider", "google_ga4")
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: "Non connecté à GA4" }, { status: 404 });

  let accessToken = conn.access_token;
  if (conn.expires_at && new Date(conn.expires_at) < new Date() && conn.refresh_token) {
    const refreshed = await refreshAccessToken(conn.refresh_token);
    accessToken = refreshed.access_token;
    await service
      .from("external_data_connections")
      .update({ access_token: accessToken, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
      .eq("id", conn.id);
  }

  try {
    const properties = await listGa4Properties(accessToken);
    return NextResponse.json({ properties });
  } catch (e: any) {
    return NextResponse.json({ error: "List properties failed", detail: e.message }, { status: 500 });
  }
}
