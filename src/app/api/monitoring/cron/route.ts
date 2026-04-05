// src/app/api/monitoring/cron/route.ts
// Endpoint appele par le Vercel Cron Job (1x/semaine, lundi 7h)

import { NextResponse } from "next/server";
import { runAllMonitoring } from "@/lib/monitor";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verifier le secret CRON pour eviter les appels non autorises
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  console.log("[CRON] Demarrage du monitoring hebdomadaire Score GEO");

  try {
    const results = await runAllMonitoring();

    const summary = results.map((r) => ({
      client: r.clientName,
      scoreGeo: r.score.scoreGeo,
      status: r.status,
      duration: `${Math.round(r.duration / 1000)}s`,
      cost: `$${r.totalCost.toFixed(4)}`,
    }));

    console.log("[CRON] Monitoring termine:", JSON.stringify(summary));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: summary,
    });
  } catch (error) {
    console.error("[CRON] Erreur monitoring:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
