import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/llmwatch/reports/generate
 * Déclenche la génération d'un rapport PDF mensuel
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { clientId, period } = await request.json();

  if (!clientId || !period) {
    return NextResponse.json({ error: "clientId et period requis" }, { status: 400 });
  }

  // Déclenche le job Railway via webhook
  const railwayUrl = process.env.RAILWAY_JOBS_URL;
  if (railwayUrl) {
    try {
      await fetch(`${railwayUrl}/generate-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RAILWAY_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({ clientId, period }),
      });
    } catch (error) {
      console.error("[LLM Watch] Report generation trigger failed:", error);
      return NextResponse.json({ error: "Erreur lors du lancement" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: "Génération du rapport lancée" });
}
