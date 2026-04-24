#!/usr/bin/env python3
"""
MCVA — Trigger scoring cloud pour un audit existant (Phase 3E)

Chaîne manuellement les étapes de scoring via API key X-MCVA-Import-Key :
1. /api/audit-direct/data        — collecte SEO/GEO (optionnel si déjà scrapé)
2. /api/audit-direct/score       — CORE-EEAT (4 batches de 2 dims)
3. /api/audit-direct/score       — CITE (2 batches de 2 dims)
4. /api/audit-direct/finalize    — aggregate + save
5. /api/audit-direct/action-plan — plan d'action LLM

Usage :
    python trigger_scoring.py <audit_id> [--quality eco|standard|premium|ultra]

Exemple :
    python trigger_scoring.py cc7d4335-c671-4d57-a61e-d65132914205 --quality eco
"""

import argparse
import os
import sys
import time

import requests
from dotenv import load_dotenv
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

load_dotenv()

API_URL = os.getenv("MCVA_API_URL", "https://mcva-audit.vercel.app").rstrip("/")
API_KEY = os.getenv("MCVA_API_KEY", "")

console = Console()

CORE_EEAT_BATCHES = [
    (["C", "O"], "CORE-EEAT C,O"),
    (["R", "E"], "CORE-EEAT R,E"),
    (["Exp", "Ept"], "CORE-EEAT Exp,Ept"),
    (["A", "T"], "CORE-EEAT A,T"),
]

CITE_BATCHES = [
    (["C", "I"], "CITE C,I"),
    (["T", "E"], "CITE T,E"),
]


def post(path: str, body: dict, label: str, timeout: int = 70) -> dict:
    """POST avec retry simple + logging rich."""
    url = f"{API_URL}{path}"
    headers = {
        "Content-Type": "application/json",
        "X-MCVA-Import-Key": API_KEY,
    }
    for attempt in range(3):
        try:
            r = requests.post(url, headers=headers, json=body, timeout=timeout)
            if r.status_code == 200:
                return r.json()
            console.print(f"[yellow]⚠ {label} HTTP {r.status_code}: {r.text[:200]}[/yellow]")
            if r.status_code in (502, 504) and attempt < 2:
                console.print(f"[yellow]  Retry {attempt + 2}/3...[/yellow]")
                time.sleep(3)
                continue
            return {"error": f"HTTP {r.status_code}", "detail": r.text[:500]}
        except requests.exceptions.Timeout:
            console.print(f"[yellow]⚠ {label} timeout, retry {attempt + 2}/3[/yellow]")
            if attempt < 2:
                time.sleep(3)
                continue
            return {"error": "timeout"}
        except Exception as e:
            console.print(f"[red]✗ {label} erreur: {e}[/red]")
            return {"error": str(e)}
    return {"error": "max retries"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audit_id", help="UUID de l'audit à scorer")
    parser.add_argument("--quality", default="eco",
                        choices=["eco", "standard", "premium", "ultra", "dryrun"])
    parser.add_argument("--skip-data", action="store_true",
                        help="Skip l'étape /data (si déjà scrapé via import local)")
    args = parser.parse_args()

    if not API_KEY:
        console.print("[red]✗ MCVA_API_KEY manquante dans .env[/red]")
        sys.exit(1)

    audit_id = args.audit_id
    quality = args.quality

    console.rule(f"[bold cyan]MCVA Trigger Scoring — {audit_id[:8]}... / quality={quality}[/bold cyan]")

    # --- 1. Data (optionnel si déjà scrapé via import local) ---
    if not args.skip_data:
        console.print("\n[cyan]→[/cyan] Step 1 : /data (collecte SEO/GEO)")
        t0 = time.time()
        res = post("/api/audit-direct/data", {"auditId": audit_id, "quality": quality}, "data", timeout=90)
        if "error" in res:
            console.print(f"[yellow]⚠ /data failed: {res.get('error')} — on continue (HTML peut suffire)[/yellow]")
        else:
            console.print(f"  ✓ {time.time() - t0:.1f}s")

    # --- 2-5. CORE-EEAT (4 batches de 2 dims) ---
    for dims, label in CORE_EEAT_BATCHES:
        console.print(f"\n[cyan]→[/cyan] {label}")
        t0 = time.time()
        res = post("/api/audit-direct/score",
                   {"auditId": audit_id, "dimensions": dims, "framework": "core_eeat", "quality": quality},
                   label, timeout=90)
        if "error" in res:
            console.print(f"[red]✗ {label}: {res.get('error')}[/red]")
            sys.exit(2)
        console.print(f"  ✓ {res.get('scored', dims)} scored, itemCount={res.get('itemCount', 0)}, {time.time() - t0:.1f}s")

    # --- 6-7. CITE (2 batches de 2 dims) ---
    for dims, label in CITE_BATCHES:
        console.print(f"\n[cyan]→[/cyan] {label}")
        t0 = time.time()
        res = post("/api/audit-direct/score",
                   {"auditId": audit_id, "dimensions": dims, "framework": "cite", "quality": quality},
                   label, timeout=90)
        if "error" in res:
            console.print(f"[red]✗ {label}: {res.get('error')}[/red]")
            sys.exit(3)
        console.print(f"  ✓ itemCount={res.get('itemCount', 0)}, {time.time() - t0:.1f}s")

    # --- 8. Finalize ---
    console.print("\n[cyan]→[/cyan] /finalize (aggregate + save)")
    t0 = time.time()
    res = post("/api/audit-direct/finalize",
               {"auditId": audit_id, "quality": quality},
               "finalize", timeout=90)
    if "error" in res:
        console.print(f"[red]✗ finalize: {res.get('error')}[/red]")
        sys.exit(4)
    console.print(f"  ✓ {time.time() - t0:.1f}s")

    # --- 9. Action plan ---
    console.print("\n[cyan]→[/cyan] /action-plan (LLM strategic plan)")
    t0 = time.time()
    res_ap = post("/api/audit-direct/action-plan",
                  {"auditId": audit_id, "quality": quality},
                  "action-plan", timeout=90)
    if "error" in res_ap:
        console.print(f"[yellow]⚠ action-plan failed: {res_ap.get('error')} — audit quand même scoré[/yellow]")
    else:
        console.print(f"  ✓ {res_ap.get('actionCount', '?')} actions, {time.time() - t0:.1f}s")

    # --- Final summary ---
    console.rule("[bold green]✅ SCORING COMPLET[/bold green]")
    scores = res.get("scores", {})
    for k, v in scores.items():
        console.print(f"  {k:<10}: {v}")
    console.print(f"\n  Dashboard: [link]{API_URL}/audit/{audit_id}[/link]")


if __name__ == "__main__":
    main()
