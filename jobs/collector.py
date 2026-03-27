"""
LLM Watch — Collecteur
Interroge 4 LLM pour un client donné et insère les résultats en BDD.
"""

import os
import json
from datetime import datetime
from openai import OpenAI
import anthropic
import google.generativeai as genai
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

SYSTEM_PROMPTS = {
    "fr": "Réponds en français. Sois précis et cite des entreprises ou professionnels réels si tu les connais.",
    "de": "Antworte auf Deutsch. Sei präzise und nenne reale Unternehmen oder Fachleute, wenn du sie kennst.",
    "en": "Answer in English. Be specific and name real companies or professionals if you know them.",
}


def query_openai(prompt: str, lang: str) -> str:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPTS[lang]},
            {"role": "user", "content": prompt},
        ],
        max_tokens=600,
    )
    return r.choices[0].message.content


def query_anthropic(prompt: str, lang: str) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    r = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        system=SYSTEM_PROMPTS[lang],
        messages=[{"role": "user", "content": prompt}],
    )
    return r.content[0].text


def query_perplexity(prompt: str, lang: str) -> str:
    client = OpenAI(
        api_key=os.environ["PERPLEXITY_API_KEY"],
        base_url="https://api.perplexity.ai",
    )
    r = client.chat.completions.create(
        model="sonar",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPTS[lang]},
            {"role": "user", "content": prompt},
        ],
        max_tokens=600,
    )
    return r.choices[0].message.content


def query_gemini(prompt: str, lang: str) -> str:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel("gemini-2.0-flash")
    full_prompt = f"{SYSTEM_PROMPTS[lang]}\n\n{prompt}"
    return model.generate_content(full_prompt).text


LLM_FUNCTIONS = {
    "openai": query_openai,
    "anthropic": query_anthropic,
    "perplexity": query_perplexity,
    "gemini": query_gemini,
}


def detect_citation(response, client_name, keywords=None):
    """
    Détecte si le client est cité dans la réponse LLM.
    Retourne (cited, rank, snippet).
    """
    response_lower = response.lower()
    search_terms = [client_name.lower()] + [k.lower() for k in (keywords or [])]

    lines = response.split("\n")
    for i, line in enumerate(lines):
        for term in search_terms:
            if term in line.lower():
                rank = None
                for j, prev_line in enumerate(lines[: i + 1]):
                    if any(
                        prev_line.strip().startswith(f"{n}.")
                        or prev_line.strip().startswith(f"{n})")
                        for n in range(1, 6)
                    ):
                        if term in prev_line.lower():
                            rank = int(prev_line.strip()[0])
                            break
                snippet = line.strip()[:300]
                return True, rank, snippet

    return False, None, None


def collect_for_client(client_id: str):
    """Lance la collecte complète pour un client."""
    queries = (
        supabase.table("llmwatch_queries")
        .select("*")
        .eq("client_id", client_id)
        .eq("active", True)
        .execute()
        .data
    )

    client = (
        supabase.table("llmwatch_clients")
        .select("*, llmwatch_competitors(*)")
        .eq("id", client_id)
        .single()
        .execute()
        .data
    )
    client_keywords = [client["name"]] + client.get("name", "").split()

    results_to_insert = []

    for query in queries:
        for llm_name, llm_fn in LLM_FUNCTIONS.items():
            for lang in ["fr", "de", "en"]:
                query_text = query.get(f"text_{lang}")
                if not query_text:
                    continue
                try:
                    response = llm_fn(query_text, lang)
                    cited, rank, snippet = detect_citation(
                        response, client["name"], client_keywords
                    )
                    results_to_insert.append(
                        {
                            "client_id": client_id,
                            "query_id": query["id"],
                            "llm": llm_name,
                            "lang": lang,
                            "response_raw": response,
                            "cited": cited,
                            "rank": rank,
                            "snippet": snippet,
                            "collected_at": datetime.utcnow().isoformat(),
                        }
                    )
                except Exception as e:
                    print(f"[ERROR] {llm_name}/{lang} pour query {query['id']}: {e}")

    if results_to_insert:
        supabase.table("llmwatch_raw_results").insert(results_to_insert).execute()
        print(
            f"[OK] {len(results_to_insert)} résultats insérés pour client {client_id}"
        )
