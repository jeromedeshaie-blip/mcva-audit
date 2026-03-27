"""
LLM Watch — Cron orchestrateur
Déployé sur Railway — s'exécute chaque lundi à 06h00 CET.

Usage:
  python cron.py              # collecte hebdomadaire complète
  python cron.py --client ID  # collecte pour un client spécifique
"""

import os
import sys
from datetime import datetime
from supabase import create_client
from collector import collect_for_client
from scorer import compute_and_store_scores
from alert_detector import check_alerts
from recommender import generate_recommendations

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def run_weekly_collection(client_id: str = None):
    print(f"[CRON] Démarrage collecte — {datetime.utcnow().isoformat()}")

    if client_id:
        clients = [{"id": client_id, "name": f"client-{client_id[:8]}"}]
    else:
        clients = (
            supabase.table("llmwatch_clients")
            .select("id, name")
            .eq("active", True)
            .execute()
            .data
        )

    for client in clients:
        print(f"\n[→] Collecte pour {client['name']} ({client['id']})")
        try:
            collect_for_client(client["id"])
            compute_and_store_scores(client["id"])
            check_alerts(client["id"])
            generate_recommendations(client["id"])
        except Exception as e:
            print(f"[ERROR] Échec pour {client['name']}: {e}")

    print(f"\n[CRON] Collecte terminée — {len(clients)} client(s) traité(s)")


if __name__ == "__main__":
    specific_client = None
    if "--client" in sys.argv:
        idx = sys.argv.index("--client")
        if idx + 1 < len(sys.argv):
            specific_client = sys.argv[idx + 1]

    run_weekly_collection(specific_client)
