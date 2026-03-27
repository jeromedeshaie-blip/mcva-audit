"""
LLM Watch — Scorer
Calcule les scores hebdomadaires à partir des résultats bruts.
Miroir de la logique TypeScript dans lib/llmwatch/scoring.ts.
"""

import os
import json
from datetime import datetime, date, timedelta
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

LLM_WEIGHTS = {
    "openai": 0.35,
    "perplexity": 0.30,
    "anthropic": 0.20,
    "gemini": 0.15,
}


def rank_score(rank):
    if not rank:
        return 0
    weights = {1: 1.0, 2: 0.75, 3: 0.5}
    return weights.get(rank, 0.25)


def compute_and_store_scores(client_id: str):
    """Calcule le score de la semaine en cours et l'insère en BDD."""
    # Lundi de cette semaine
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Récupère les résultats bruts de la semaine
    results = (
        supabase.table("llmwatch_raw_results")
        .select("llm, lang, cited, rank")
        .eq("client_id", client_id)
        .gte("collected_at", week_start.isoformat())
        .execute()
        .data
    )

    if not results:
        print(f"[SCORER] Aucun résultat cette semaine pour {client_id}")
        return

    # Taux de citation
    cited = [r for r in results if r["cited"]]
    citation_rate = (len(cited) / len(results)) * 100

    # Score pondéré par LLM
    weighted_score = sum(
        LLM_WEIGHTS.get(r["llm"], 0.1) * rank_score(r["rank"]) for r in results
    )

    # Score par LLM
    score_by_llm = {}
    for llm in LLM_WEIGHTS:
        llm_results = [r for r in results if r["llm"] == llm]
        if not llm_results:
            score_by_llm[llm] = 0
            continue
        llm_cited = [r for r in llm_results if r["cited"]]
        llm_rate = len(llm_cited) / len(llm_results)
        llm_rank = (
            sum(rank_score(r["rank"]) for r in llm_cited) / len(llm_cited)
            if llm_cited
            else 0
        )
        score_by_llm[llm] = round((llm_rate * 0.6 + llm_rank * 0.4) * 100)

    # Score par langue
    score_by_lang = {}
    for lang in ["fr", "de", "en"]:
        lang_results = [r for r in results if r["lang"] == lang]
        if not lang_results:
            score_by_lang[lang] = 0
            continue
        lang_cited = [r for r in lang_results if r["cited"]]
        score_by_lang[lang] = round((len(lang_cited) / len(lang_results)) * 100)

    # Score composite final
    avg_rank = (
        sum(rank_score(r["rank"]) for r in cited) / len(cited) if cited else 0
    )
    score = min(
        round(
            (citation_rate / 100) * 0.5 * 100
            + avg_rank * 0.3 * 100
            + weighted_score * 0.2 * 100
        ),
        100,
    )

    # Upsert score (on_conflict on unique constraint)
    supabase.table("llmwatch_scores").upsert(
        {
            "client_id": client_id,
            "week_start": week_start.isoformat(),
            "score": score,
            "score_by_llm": json.dumps(score_by_llm),
            "score_by_lang": json.dumps(score_by_lang),
            "citation_rate": round(citation_rate, 2),
        },
        on_conflict="client_id,week_start",
    ).execute()

    print(f"[SCORER] Score {score}/100 pour {client_id} (semaine {week_start})")

    # Score des concurrents
    _score_competitors(client_id, week_start, results)


def _score_competitors(client_id: str, week_start: date, raw_results: list):
    """Calcule les scores des concurrents à partir des mêmes réponses."""
    competitors = (
        supabase.table("llmwatch_competitors")
        .select("id, name, keywords")
        .eq("client_id", client_id)
        .eq("active", True)
        .execute()
        .data
    )

    if not competitors:
        return

    # Get full raw results with response text
    full_results = (
        supabase.table("llmwatch_raw_results")
        .select("llm, lang, response_raw")
        .eq("client_id", client_id)
        .gte("collected_at", week_start.isoformat())
        .execute()
        .data
    )

    for comp in competitors:
        search_terms = [comp["name"].lower()] + [
            k.lower() for k in (comp.get("keywords") or [])
        ]

        comp_cited = 0
        comp_total = 0
        comp_rank_sum = 0
        comp_by_llm = {}

        for r in full_results:
            if not r.get("response_raw"):
                continue
            comp_total += 1
            response_lower = r["response_raw"].lower()

            found = any(term in response_lower for term in search_terms)
            if found:
                comp_cited += 1

            llm = r["llm"]
            if llm not in comp_by_llm:
                comp_by_llm[llm] = {"total": 0, "cited": 0}
            comp_by_llm[llm]["total"] += 1
            if found:
                comp_by_llm[llm]["cited"] += 1

        if comp_total == 0:
            continue

        comp_score = round((comp_cited / comp_total) * 100)

        score_by_llm = {}
        for llm, counts in comp_by_llm.items():
            if counts["total"] > 0:
                score_by_llm[llm] = round(
                    (counts["cited"] / counts["total"]) * 100
                )

        supabase.table("llmwatch_competitor_scores").upsert(
            {
                "competitor_id": comp["id"],
                "client_id": client_id,
                "week_start": week_start.isoformat(),
                "score": comp_score,
                "score_by_llm": json.dumps(score_by_llm),
            },
            on_conflict="competitor_id,week_start",
        ).execute()

        print(f"[SCORER] Concurrent {comp['name']}: {comp_score}/100")
