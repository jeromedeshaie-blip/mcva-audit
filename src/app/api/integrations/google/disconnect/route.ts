/**
 * POST /api/integrations/google/disconnect
 * Body: { provider: "google_gsc" | "google_ga4" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { provider } = body;
  if (!provider || !["google_gsc", "google_ga4"].includes(provider)) {
    return NextResponse.json({ error: "provider invalide" }, { status: 400 });
  }

  const service = createServiceClient();
  await service.from("external_data_connections").delete().eq("user_id", user.id).eq("provider", provider);
  await service.from("external_data_cache").delete().eq("user_id", user.id).eq("provider", provider);

  return NextResponse.json({ success: true });
}
