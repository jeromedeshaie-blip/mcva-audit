// src/app/api/monitoring/run/route.ts
// Endpoint pour declencher un monitoring manuellement

import { NextResponse } from "next/server";
import { runMonitoring } from "@/lib/monitor";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId requis" },
        { status: 400 }
      );
    }

    const result = await runMonitoring(clientId);

    return NextResponse.json({
      success: result.status === "completed",
      scoreId: result.scoreId,
      scoreGeo: result.score.scoreGeo,
      breakdown: {
        presence: result.score.scorePresence,
        exactitude: result.score.scoreExactitude,
        sentiment: result.score.scoreSentiment,
        recommendation: result.score.scoreRecommendation,
      },
      totalResponses: result.score.totalResponses,
      duration: `${Math.round(result.duration / 1000)}s`,
      cost: `$${result.totalCost.toFixed(4)}`,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
