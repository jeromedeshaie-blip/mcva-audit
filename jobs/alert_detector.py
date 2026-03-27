"""
LLM Watch — Détecteur d'alertes
Détecte les variations significatives (>10 pts) et insère des alertes.
"""

import os
from datetime import date, timedelta
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

ALERT_THRESHOLD = 10


def check_alerts(client_id: str):
    """Vérifie les variations de score et crée des alertes si nécessaire."""
    today = date.today()
    this_week = today - timedelta(days=today.weekday())
    last_week = this_week - timedelta(weeks=1)

    # Score client cette semaine vs semaine précédente
    current = (
        supabase.table("llmwatch_scores")
        .select("score")
        .eq("client_id", client_id)
        .eq("week_start", this_week.isoformat())
        .single()
        .execute()
        .data
    )

    previous = (
        supabase.table("llmwatch_scores")
        .select("score")
        .eq("client_id", client_id)
        .eq("week_start", last_week.isoformat())
        .single()
        .execute()
        .data
    )

    alerts_to_insert = []

    if current and previous:
        delta = float(current["score"]) - float(previous["score"])
        if delta < -ALERT_THRESHOLD:
            alerts_to_insert.append(
                {
                    "client_id": client_id,
                    "competitor_id": None,
                    "alert_type": "client_drop",
                    "delta": round(delta, 2),
                    "llm": None,
                    "message": f"Votre score a baissé de {abs(round(delta))} pts cette semaine ({round(float(previous['score']))} → {round(float(current['score']))})",
                }
            )

    # Scores concurrents
    competitors = (
        supabase.table("llmwatch_competitors")
        .select("id, name")
        .eq("client_id", client_id)
        .eq("active", True)
        .execute()
        .data
    )

    for comp in competitors or []:
        comp_current = (
            supabase.table("llmwatch_competitor_scores")
            .select("score")
            .eq("competitor_id", comp["id"])
            .eq("week_start", this_week.isoformat())
            .maybeSingle()
            .execute()
            .data
        )

        comp_previous = (
            supabase.table("llmwatch_competitor_scores")
            .select("score")
            .eq("competitor_id", comp["id"])
            .eq("week_start", last_week.isoformat())
            .maybeSingle()
            .execute()
            .data
        )

        if comp_current and comp_previous:
            delta = float(comp_current["score"]) - float(comp_previous["score"])
            if abs(delta) >= ALERT_THRESHOLD:
                alert_type = "competitor_gain" if delta > 0 else "competitor_loss"
                direction = "gagné" if delta > 0 else "perdu"
                alerts_to_insert.append(
                    {
                        "client_id": client_id,
                        "competitor_id": comp["id"],
                        "alert_type": alert_type,
                        "delta": round(delta, 2),
                        "llm": None,
                        "message": f"{comp['name']} a {direction} {abs(round(delta))} pts ({round(float(comp_previous['score']))} → {round(float(comp_current['score']))})",
                    }
                )

    if alerts_to_insert:
        supabase.table("llmwatch_alerts").insert(alerts_to_insert).execute()
        print(
            f"[ALERTS] {len(alerts_to_insert)} alerte(s) créée(s) pour {client_id}"
        )
    else:
        print(f"[ALERTS] Aucune alerte pour {client_id}")
