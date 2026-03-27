import type { LlmWatchAlert } from "./types";

const ALERT_THRESHOLD = 10; // points de variation minimum pour déclencher une alerte

interface ScoreEntry {
  id: string;
  name: string;
  currentScore: number;
  previousScore: number;
  isClient: boolean;
  competitorId?: string;
}

/**
 * Détecte les alertes basées sur les variations de score semaine/semaine.
 */
export function detectAlerts(
  clientId: string,
  entries: ScoreEntry[]
): Omit<LlmWatchAlert, "id" | "created_at">[] {
  const alerts: Omit<LlmWatchAlert, "id" | "created_at">[] = [];

  for (const entry of entries) {
    const delta = entry.currentScore - entry.previousScore;

    if (Math.abs(delta) < ALERT_THRESHOLD) continue;

    if (entry.isClient && delta < 0) {
      alerts.push({
        client_id: clientId,
        competitor_id: null,
        alert_type: "client_drop",
        delta,
        llm: null,
        message: `${entry.name} a perdu ${Math.abs(delta)} pts de visibilité cette semaine (${entry.previousScore} → ${entry.currentScore})`,
        sent_at: null,
      });
    } else if (!entry.isClient) {
      alerts.push({
        client_id: clientId,
        competitor_id: entry.competitorId || null,
        alert_type: delta > 0 ? "competitor_gain" : "competitor_loss",
        delta,
        llm: null,
        message: `${entry.name} ${delta > 0 ? "a gagné" : "a perdu"} ${Math.abs(delta)} pts (${entry.previousScore} → ${entry.currentScore})`,
        sent_at: null,
      });
    }
  }

  return alerts;
}
