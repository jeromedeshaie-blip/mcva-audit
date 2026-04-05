// src/app/api/scores/[clientId]/route.ts
// Endpoint pour recuperer l'historique des scores d'un client

import { NextResponse } from "next/server";
import { getScoreHistory, getLLMBreakdown } from "@/lib/monitor";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const includeBreakdown = url.searchParams.get("breakdown") === "true";

    const history = await getScoreHistory(clientId, limit);

    let latestBreakdown = null;
    if (includeBreakdown && history.length > 0) {
      latestBreakdown = await getLLMBreakdown(clientId, history[0].week_start);
    }

    return NextResponse.json({
      clientId,
      history,
      latestBreakdown,
      count: history.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
