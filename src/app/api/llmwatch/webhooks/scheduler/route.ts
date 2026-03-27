import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/llmwatch/webhooks/scheduler
 * Appelé par le cron Railway après la collecte hebdomadaire.
 * Déclenche le recalcul des scores et la détection d'alertes.
 */
export async function POST(request: NextRequest) {
  // Validate webhook secret
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.RAILWAY_WEBHOOK_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { clientId, action } = body;

  if (!clientId) {
    return NextResponse.json({ error: "clientId requis" }, { status: 400 });
  }

  // Pour l'instant, log seulement — le scoring et les alertes sont gérés côté Python
  console.log(`[LLM Watch] Webhook received: action=${action}, clientId=${clientId}`);

  return NextResponse.json({ success: true, action, clientId });
}
