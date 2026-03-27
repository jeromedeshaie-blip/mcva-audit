"""
LLM Watch — Générateur de recommandations
Analyse les résultats bruts et génère des recommandations actionnables via Claude.
"""

import os
import json
from datetime import date, timedelta
from supabase import create_client
import anthropic

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


def generate_recommendations(client_id):
    """Analyse les résultats de la semaine et génère des recommandations."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Fetch client info
    client = (
        supabase.table("llmwatch_clients")
        .select("name, sector, location")
        .eq("id", client_id)
        .single()
        .execute()
        .data
    )

    # Fetch this week's score
    score_res = (
        supabase.table("llmwatch_scores")
        .select("score, score_by_llm, score_by_lang, citation_rate")
        .eq("client_id", client_id)
        .eq("week_start", week_start.isoformat())
        .limit(1)
        .execute()
    )
    current_score = score_res.data[0] if score_res.data else None

    # Fetch raw results
    results = (
        supabase.table("llmwatch_raw_results")
        .select("llm, lang, cited, rank, snippet, response_raw")
        .eq("client_id", client_id)
        .gte("collected_at", week_start.isoformat())
        .execute()
        .data
    )

    if not results or not current_score:
        print(f"[RECO] Pas assez de données pour {client_id}")
        return

    # Fetch competitors scores
    comp_scores = (
        supabase.table("llmwatch_competitor_scores")
        .select("score, score_by_llm, competitor_id")
        .eq("client_id", client_id)
        .eq("week_start", week_start.isoformat())
        .execute()
        .data
    )

    competitors = (
        supabase.table("llmwatch_competitors")
        .select("id, name")
        .eq("client_id", client_id)
        .eq("active", True)
        .execute()
        .data
    )
    comp_map = {c["id"]: c["name"] for c in (competitors or [])}

    # Build analysis summary for the LLM
    cited_count = sum(1 for r in results if r["cited"])
    total_count = len(results)

    by_llm = {}
    for r in results:
        llm = r["llm"]
        if llm not in by_llm:
            by_llm[llm] = {"total": 0, "cited": 0, "ranks": []}
        by_llm[llm]["total"] += 1
        if r["cited"]:
            by_llm[llm]["cited"] += 1
            if r["rank"]:
                by_llm[llm]["ranks"].append(r["rank"])

    by_lang = {}
    for r in results:
        lang = r["lang"]
        if lang not in by_lang:
            by_lang[lang] = {"total": 0, "cited": 0}
        by_lang[lang]["total"] += 1
        if r["cited"]:
            by_lang[lang]["cited"] += 1

    # Non-cited responses analysis
    non_cited = [r for r in results if not r["cited"]]
    non_cited_summary = []
    for r in non_cited[:5]:
        snippet = (r.get("response_raw") or "")[:200]
        non_cited_summary.append(f"- {r['llm']}/{r['lang']}: {snippet}")

    comp_summary = []
    for cs in (comp_scores or []):
        name = comp_map.get(cs["competitor_id"], "?")
        comp_summary.append(f"- {name}: {cs['score']}/100")

    analysis = f"""
Client: {client["name"]}
Secteur: {client["sector"]}
Localisation: {client["location"]}

Score global: {current_score["score"]}/100
Taux de citation: {current_score["citation_rate"]}%

Par LLM:
{json.dumps(current_score.get("score_by_llm", {}), indent=2)}

Par langue:
{json.dumps(current_score.get("score_by_lang", {}), indent=2)}

Détail par LLM:
{chr(10).join(f"- {llm}: {d['cited']}/{d['total']} cité, rangs moyens: {d['ranks']}" for llm, d in by_llm.items())}

Détail par langue:
{chr(10).join(f"- {lang}: {d['cited']}/{d['total']} cité" for lang, d in by_lang.items())}

Concurrents:
{chr(10).join(comp_summary) if comp_summary else "Aucun concurrent"}

Exemples de réponses où le client n'est PAS cité:
{chr(10).join(non_cited_summary) if non_cited_summary else "Toujours cité!"}
"""

    # Call Claude to generate recommendations
    client_ai = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client_ai.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system="""Tu es un expert en visibilité IA (GEO - Generative Engine Optimization).
Tu analyses les données de monitoring de visibilité d'une entreprise dans les LLMs (ChatGPT, Claude, Perplexity, Gemini).
Tu génères des recommandations actionnables, concrètes et prioritisées.

Réponds UNIQUEMENT en JSON valide, un tableau d'objets avec ces champs:
- priority: 1 (haute), 2 (moyenne), 3 (basse)
- category: "content" | "technical" | "brand" | "competitive" | "multilingual"
- title: titre court (max 80 chars)
- description: explication détaillée avec action concrète (2-3 phrases)
- impact: "high" | "medium" | "low"
- effort: "low" | "medium" | "high"

Génère exactement 5 recommandations, triées par priorité.
Catégories:
- content: améliorer le contenu web pour être mieux référencé par les LLMs
- technical: actions techniques (schema.org, FAQ, données structurées)
- brand: renforcer la notoriété de marque dans les sources d'entraînement
- competitive: actions par rapport aux concurrents
- multilingual: améliorer la visibilité dans certaines langues""",
        messages=[
            {
                "role": "user",
                "content": f"Analyse ces données et génère 5 recommandations:\n\n{analysis}",
            }
        ],
    )

    try:
        reco_text = response.content[0].text
        # Handle potential markdown code blocks
        if "```json" in reco_text:
            reco_text = reco_text.split("```json")[1].split("```")[0]
        elif "```" in reco_text:
            reco_text = reco_text.split("```")[1].split("```")[0]
        recommendations = json.loads(reco_text.strip())
    except (json.JSONDecodeError, IndexError) as e:
        print(f"[RECO] Erreur parsing JSON: {e}")
        print(f"[RECO] Réponse brute: {response.content[0].text[:500]}")
        return

    # Delete old recommendations for this week (to allow re-runs)
    supabase.table("llmwatch_recommendations").delete().eq(
        "client_id", client_id
    ).eq("week_start", week_start.isoformat()).execute()

    # Insert new recommendations
    rows = []
    for r in recommendations:
        rows.append(
            {
                "client_id": client_id,
                "week_start": week_start.isoformat(),
                "priority": r.get("priority", 2),
                "category": r.get("category", "content"),
                "title": r.get("title", "")[:200],
                "description": r.get("description", ""),
                "impact": r.get("impact", "medium"),
                "effort": r.get("effort", "medium"),
            }
        )

    if rows:
        supabase.table("llmwatch_recommendations").insert(rows).execute()
        print(f"[RECO] {len(rows)} recommandations générées pour {client_id}")
