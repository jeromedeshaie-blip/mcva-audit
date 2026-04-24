#!/usr/bin/env python3
"""
MCVA Local Crawler — Phase 3B

Pipeline complète :
1. Crawle un site (homepage + sous-pages découvertes) via Playwright
2. Extrait les données structurées via Ollama + Gemma 4 31B
3. Valide le payload (Pydantic)
4. Upload vers /api/audit-import/from-local

Usage :
    python audit_local.py --url https://fdmfidu.ch --sector finance-fiduciaire --quality premium

Plein d'options :
    python audit_local.py \\
        --url https://mcva.ch \\
        --sector services-conseil \\
        --brand "MCVA Consulting SA" \\
        --audit-type ultra \\
        --quality premium \\
        --themes seo,geo,contenu,tech \\
        --max-pages 10 \\
        --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from pydantic import BaseModel, Field, ValidationError
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from tenacity import retry, stop_after_attempt, wait_exponential

# ============================================================
# Config
# ============================================================

load_dotenv()

MCVA_API_URL = os.getenv("MCVA_API_URL", "https://mcva-audit.vercel.app").rstrip("/")
MCVA_API_KEY = os.getenv("MCVA_API_KEY", "")
OLLAMA_ENDPOINT = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434").rstrip("/")
LOCAL_LLM = os.getenv("MCVA_LOCAL_LLM", "gemma4:31b")
MAX_PAGES = int(os.getenv("MAX_PAGES_PER_CRAWL", "10"))
CRAWL_TIMEOUT = int(os.getenv("CRAWL_TIMEOUT_SECONDS", "30"))
USER_AGENT = os.getenv("USER_AGENT", "MCVAAuditBot/3.0 (+https://mcva.ch/audit)")
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./output"))
CACHE_DIR = Path(os.getenv("CACHE_DIR", "./cache"))

SCHEMA_VERSION = "3.0"
CRAWLER_VERSION = "mcva-crawler-v1.0"
HTML_TRUNCATE_CHARS = 50000

console = Console()

# ============================================================
# Pydantic models (mirror TS types/local-import.ts)
# ============================================================

class Technique(BaseModel):
    h1: list[str] = []
    h2: list[str] = []
    h3: list[str] = []
    title: Optional[str] = None
    meta_description: Optional[str] = None
    canonical: Optional[str] = None
    hreflang: list[dict[str, str]] = []
    robots_meta: Optional[str] = None
    viewport: bool = False
    charset: Optional[str] = None

class Maillage(BaseModel):
    internal_links_count: int = 0
    external_links_count: int = 0
    top_internal_links: list[dict[str, str]] = []
    top_external_links: list[dict[str, str]] = []

class Geo(BaseModel):
    adresses: list[str] = []
    villes: list[str] = []
    codes_postaux: list[str] = []
    telephones: list[str] = []
    emails: list[str] = []
    google_maps_embed: bool = False
    gbp_mentioned: bool = False

class Semantique(BaseModel):
    entites_nommees: list[str] = []
    mots_cles_frequents: list[dict[str, Any]] = []
    flesch_score: Optional[float] = None
    mots_total: int = 0
    lang_detected: str = "fr"

class SchemaOrg(BaseModel):
    types_detected: list[str] = []
    raw_scripts: list[str] = []

class Media(BaseModel):
    images_count: int = 0
    images_without_alt: int = 0
    has_video: bool = False
    has_audio: bool = False

class Extracted(BaseModel):
    technique: Technique
    maillage: Maillage
    geo: Geo
    semantique: Semantique
    schema_org: SchemaOrg
    media: Media

class PageExtraction(BaseModel):
    url: str
    is_homepage: bool
    status_code: int
    html_size_bytes: int
    html_hash: str
    html_truncated: str
    extracted: Extracted

class CrawlMetadata(BaseModel):
    started_at: str
    finished_at: str
    pages_count: int
    pages_failed: int
    spa_detected: bool
    parked_domain_detected: bool
    extractor_model: str
    crawler_version: str
    extraction_duration_ms: int
    aggregate_html_hash: str
    user_agent: Optional[str] = None

class LocalImportPayload(BaseModel):
    url: str
    sector: str
    brand_name: Optional[str] = None
    audit_type: str
    quality: str
    themes: Optional[list[str]] = None
    pages: list[PageExtraction]
    crawl_meta: CrawlMetadata
    schema_version: str = SCHEMA_VERSION

# ============================================================
# Helpers
# ============================================================

def sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

PARKED_PATTERNS = [
    "sedoparking.com", "parkingcrew.net", "parking.godaddy.com",
    "nameshift.com", "afternic.com", "dan.com",
    "domain for sale", "this domain is parked", "domaine en vente",
]

def detect_parked(final_url: str, html: str) -> bool:
    url_lower = final_url.lower()
    html_sample = html[:50000].lower()
    for pattern in PARKED_PATTERNS:
        if pattern in url_lower or pattern in html_sample:
            return True
    return False

def detect_spa(html: str) -> bool:
    """Heuristique SPA — très peu de contenu texte dans un gros HTML."""
    # Strip scripts/styles
    stripped = BeautifulSoup(html, "html.parser").get_text(strip=True)
    text_len = len(stripped)
    html_len = len(html)
    wix_markers = ["wix-viewer-model", "wixCodeApi", "X-Wix-"]
    if any(m in html for m in wix_markers):
        return True
    if html_len > 10000 and text_len / html_len < 0.02:
        return True
    return False

# ============================================================
# Playwright — crawler
# ============================================================

async def fetch_page(playwright_page, url: str) -> dict[str, Any]:
    """Fetch one page via Playwright. Returns html + status + meta."""
    try:
        response = await playwright_page.goto(url, wait_until="networkidle", timeout=CRAWL_TIMEOUT * 1000)
        status_code = response.status if response else 0
        html = await playwright_page.content()
        final_url = playwright_page.url
        return {
            "url": final_url,
            "status_code": status_code,
            "html": html,
            "error": None,
        }
    except PlaywrightTimeout:
        return {"url": url, "status_code": 0, "html": "", "error": "timeout"}
    except Exception as e:
        return {"url": url, "status_code": 0, "html": "", "error": str(e)[:200]}

def discover_internal_links(html: str, base_url: str, max_links: int = 20) -> list[str]:
    """Extrait les liens internes les plus pertinents pour crawler."""
    soup = BeautifulSoup(html, "html.parser")
    base_domain = urlparse(base_url).netloc.replace("www.", "")
    links: set[str] = set()

    # Priorité : liens de navigation + footer + sitemap-like
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:"):
            continue
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.netloc.replace("www.", "") != base_domain:
            continue
        # Clean query string
        clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
        if clean == base_url.rstrip("/"):
            continue
        links.add(clean)
        if len(links) >= max_links:
            break

    # Filter by relevance — prefer short paths, skip common junk
    scored = sorted(links, key=lambda u: (
        u.count("/"),  # shallower URLs first
        "wp-content" in u or "wp-admin" in u,  # deprio WordPress infra
        "#" in u,
    ))
    return scored[:max_links]

async def crawl_site(root_url: str, max_pages: int) -> list[dict[str, Any]]:
    """Crawl homepage + up to max_pages-1 discovered internal pages."""
    results: list[dict[str, Any]] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=USER_AGENT, locale="fr-CH")
        page = await context.new_page()

        # 1. Homepage
        console.print(f"[cyan]→[/cyan] Crawling homepage: {root_url}")
        home = await fetch_page(page, root_url)
        home["is_homepage"] = True
        results.append(home)

        # 2. Discover + crawl sub-pages
        if home["html"] and max_pages > 1:
            discovered = discover_internal_links(home["html"], root_url, max_links=max_pages * 2)
            console.print(f"[cyan]→[/cyan] Discovered {len(discovered)} internal links")

            to_crawl = discovered[: max_pages - 1]
            for i, sub_url in enumerate(to_crawl, start=1):
                console.print(f"[cyan]→[/cyan] Crawling [{i}/{len(to_crawl)}]: {sub_url}")
                sub = await fetch_page(page, sub_url)
                sub["is_homepage"] = False
                results.append(sub)

        await browser.close()

    return results

# ============================================================
# Ollama — extraction via Gemma 4 31B
# ============================================================

@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=2, min=2, max=10))
def call_ollama(prompt: str) -> str:
    """Appel Ollama avec format=json forcé. Retourne la string JSON brute.

    ⚠ Gemma 4 a un mode 'thinking' activé par défaut qui bloque la réponse finale.
    On désactive avec "think": false (Ollama 0.21+).

    ⚠ num_ctx explicite pour éviter qu'Ollama alloue 256K tokens de KV cache par défaut
    (qui cause des 500 sur Gemma 4 31B avec gros HTML).
    """
    payload = {
        "model": LOCAL_LLM,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "think": False,  # ← critique pour Gemma 4, sinon réponse vide
        "options": {
            "temperature": 0.0,  # Reproductibilité
            "num_predict": 4096,  # output max (Gemma 4 31B gère largement)
            "num_ctx": 16384,     # context window raisonnable (vs 256K par défaut)
        },
    }
    response = requests.post(
        f"{OLLAMA_ENDPOINT}/api/generate",
        json=payload,
        timeout=180,
    )
    response.raise_for_status()
    data = response.json()
    resp_text = data.get("response", "")
    if not resp_text:
        # Log des stats pour debug
        raise RuntimeError(
            f"Ollama returned empty response (eval_count={data.get('eval_count', 0)}, "
            f"done_reason={data.get('done_reason', '?')})"
        )
    return resp_text

def load_extraction_prompt() -> str:
    prompt_path = Path(__file__).parent / "prompts" / "extract_page.txt"
    return prompt_path.read_text(encoding="utf-8")

def extract_page_data(html: str, url: str) -> dict[str, Any]:
    """Extract structured data from HTML via Gemma 4 31B.

    Nettoyage agressif du HTML pour maximiser le signal utile dans les 15k chars :
    - Garde : title, meta description/robots/canonical/hreflang, OG/Twitter meta,
              JSON-LD scripts, h1-h6, p, a, img alt, main/article/section content
    - Supprime : <link rel="preload/stylesheet/...">, scripts JS,
                 <meta charset/viewport/generator/theme-color>, <style>,
                 attributs data-*, class, style sur les éléments
    """
    soup = BeautifulSoup(html, "html.parser")

    # 1. Drop styles + JS scripts (keep JSON-LD)
    for tag in soup(["style", "noscript"]):
        tag.decompose()
    for tag in soup.find_all("script"):
        script_type = tag.get("type", "").lower()
        if "json" not in script_type:
            tag.decompose()

    # 2. Drop useless <link> (preload/prefetch/dns-prefetch/manifest/icon/stylesheet)
    useless_link_rels = {"preload", "prefetch", "dns-prefetch", "preconnect",
                         "manifest", "icon", "apple-touch-icon", "mask-icon",
                         "stylesheet", "modulepreload"}
    for tag in soup.find_all("link"):
        rel = tag.get("rel", [])
        if isinstance(rel, str):
            rel = [rel]
        if any(r.lower() in useless_link_rels for r in rel):
            tag.decompose()

    # 3. Drop meta tags that are noise for SEO audit
    useless_meta_names = {"charset", "viewport", "generator", "theme-color",
                          "format-detection", "mobile-web-app-capable",
                          "apple-mobile-web-app-capable", "apple-mobile-web-app-status-bar-style",
                          "next-size-adjust", "color-scheme"}
    for tag in soup.find_all("meta"):
        # Protect against already-decomposed tags (attrs becomes None)
        if tag.attrs is None:
            continue
        name = (tag.get("name") or tag.get("http-equiv") or "").lower()
        has_charset_attr = bool(tag.get("charset"))
        if name in useless_meta_names or has_charset_attr:
            tag.decompose()

    # 4. Strip verbose attributes on remaining tags (class, style, data-*, aria-* except labels)
    noise_attrs_exact = {"class", "style", "srcset", "sizes", "loading", "decoding",
                         "fetchpriority", "crossorigin", "referrerpolicy"}
    for tag in soup.find_all(True):
        if tag.attrs is None:
            continue
        attrs_to_remove = []
        for attr in list(tag.attrs.keys()):
            if attr in noise_attrs_exact:
                attrs_to_remove.append(attr)
            elif attr.startswith("data-") or (attr.startswith("aria-") and attr != "aria-label"):
                attrs_to_remove.append(attr)
        for a in attrs_to_remove:
            del tag.attrs[a]

    cleaned = str(soup)
    # Collapse excessive whitespace
    import re
    cleaned = re.sub(r"\s+", " ", cleaned)

    truncated = cleaned[:15000]
    prompt_template = load_extraction_prompt()
    prompt = prompt_template.replace("{html}", truncated)

    raw_json = call_ollama(prompt)

    # Ollama with format=json sometimes wraps in markdown — clean defensively
    raw_json = raw_json.strip()
    if raw_json.startswith("```"):
        raw_json = raw_json.split("```")[1] if "```" in raw_json else raw_json
        if raw_json.startswith("json"):
            raw_json = raw_json[4:]

    try:
        return json.loads(raw_json)
    except json.JSONDecodeError as e:
        console.print(f"[red]⚠ Gemma returned invalid JSON for {url}: {e}[/red]")
        console.print(f"[dim]Raw: {raw_json[:500]}[/dim]")
        # Return minimal fallback structure
        return build_empty_extraction()

def build_empty_extraction() -> dict[str, Any]:
    return {
        "technique": {"h1": [], "h2": [], "h3": [], "title": None, "meta_description": None,
                      "canonical": None, "hreflang": [], "robots_meta": None, "viewport": False, "charset": None},
        "maillage": {"internal_links_count": 0, "external_links_count": 0,
                     "top_internal_links": [], "top_external_links": []},
        "geo": {"adresses": [], "villes": [], "codes_postaux": [], "telephones": [], "emails": [],
                "google_maps_embed": False, "gbp_mentioned": False},
        "semantique": {"entites_nommees": [], "mots_cles_frequents": [], "flesch_score": None,
                       "mots_total": 0, "lang_detected": "fr"},
        "schema_org": {"types_detected": [], "raw_scripts": []},
        "media": {"images_count": 0, "images_without_alt": 0, "has_video": False, "has_audio": False},
    }

# ============================================================
# Cache (SHA-256 HTML → JSON extract)
# ============================================================

def cache_get(html_hash: str) -> Optional[dict[str, Any]]:
    cache_file = CACHE_DIR / f"{html_hash}.json"
    if cache_file.exists():
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None

def cache_set(html_hash: str, data: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f"{html_hash}.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

# ============================================================
# Upload to MCVA API
# ============================================================

def upload_to_mcva(payload: LocalImportPayload) -> dict[str, Any]:
    if not MCVA_API_KEY:
        raise RuntimeError("MCVA_API_KEY manquante dans .env")

    url = f"{MCVA_API_URL}/api/audit-import/from-local"
    headers = {
        "Content-Type": "application/json",
        "X-MCVA-Import-Key": MCVA_API_KEY,
    }
    body = payload.model_dump(mode="json")
    resp = requests.post(url, headers=headers, json=body, timeout=60)
    try:
        return resp.json()
    except Exception:
        return {"success": False, "errors": [f"HTTP {resp.status_code}: {resp.text[:200]}"]}

# ============================================================
# Main pipeline
# ============================================================

async def run_audit(args) -> None:
    started_at = utc_iso_now()
    t0 = time.time()

    # 1. Crawl
    console.rule(f"[bold cyan]MCVA Local Crawler — {args.url}[/bold cyan]")
    console.print(f"[dim]Model: {LOCAL_LLM}  |  Max pages: {args.max_pages}  |  API: {MCVA_API_URL}[/dim]")
    pages_raw = await crawl_site(args.url, args.max_pages)

    # 2. Detect parked / SPA
    first_html = pages_raw[0]["html"] if pages_raw else ""
    parked = detect_parked(pages_raw[0]["url"] if pages_raw else args.url, first_html)
    spa = detect_spa(first_html)

    if parked:
        console.print("[red]⚠ Domaine parqué détecté — abort.[/red]")
        sys.exit(1)
    if spa:
        console.print("[yellow]⚠ Site SPA détecté — extraction peut être partielle.[/yellow]")

    # 3. Extract via Gemma
    pages_extracted: list[PageExtraction] = []
    pages_failed = 0

    with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console) as progress:
        task = progress.add_task("Extraction Gemma...", total=len(pages_raw))
        for idx, page in enumerate(pages_raw):
            progress.update(task, description=f"Extraction Gemma [{idx+1}/{len(pages_raw)}] {page['url'][:60]}")

            if page["status_code"] >= 400 or not page["html"]:
                pages_failed += 1
                progress.advance(task)
                continue

            html = page["html"]
            html_hash = sha256_hex(html)

            # Check cache
            cached = cache_get(html_hash)
            if cached:
                extracted = cached
            else:
                extracted = extract_page_data(html, page["url"])
                cache_set(html_hash, extracted)

            try:
                pe = PageExtraction(
                    url=page["url"],
                    is_homepage=page.get("is_homepage", False),
                    status_code=page["status_code"],
                    html_size_bytes=len(html.encode("utf-8")),
                    html_hash=html_hash,
                    html_truncated=html[:HTML_TRUNCATE_CHARS],
                    extracted=Extracted(**extracted),
                )
                pages_extracted.append(pe)
            except ValidationError as e:
                console.print(f"[red]⚠ Invalid extraction for {page['url']}: {e}[/red]")
                pages_failed += 1

            progress.advance(task)

    finished_at = utc_iso_now()
    duration_ms = int((time.time() - t0) * 1000)

    # 4. Build payload
    aggregate_hash = sha256_hex("|".join(sorted(p.html_hash for p in pages_extracted)))

    payload = LocalImportPayload(
        url=args.url,
        sector=args.sector,
        brand_name=args.brand,
        audit_type=args.audit_type,
        quality=args.quality,
        themes=args.themes.split(",") if args.themes else None,
        pages=pages_extracted,
        crawl_meta=CrawlMetadata(
            started_at=started_at,
            finished_at=finished_at,
            pages_count=len(pages_extracted),
            pages_failed=pages_failed,
            spa_detected=spa,
            parked_domain_detected=parked,
            extractor_model=LOCAL_LLM,
            crawler_version=CRAWLER_VERSION,
            extraction_duration_ms=duration_ms,
            aggregate_html_hash=aggregate_hash,
            user_agent=USER_AGENT,
        ),
    )

    # 5. Save locally
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    domain = urlparse(args.url).netloc.replace("www.", "")
    out_file = OUTPUT_DIR / f"{domain}-{int(time.time())}.json"
    out_file.write_text(
        json.dumps(payload.model_dump(mode="json"), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    console.print(f"\n[green]✓[/green] Payload saved: {out_file}")
    console.print(f"  → {len(pages_extracted)} pages extracted, {pages_failed} failed, {duration_ms}ms total")

    # 6. Upload (unless dry-run)
    if args.dry_run:
        console.print("[yellow]Dry-run mode — skip upload.[/yellow]")
        return

    console.print("\n[cyan]→[/cyan] Upload vers MCVA Audit...")
    result = upload_to_mcva(payload)

    if result.get("success"):
        console.rule("[bold green]✅ AUDIT IMPORTÉ[/bold green]")
        console.print(f"  • audit_id  : [bold]{result['audit_id']}[/bold]")
        if result.get("reference"):
            console.print(f"  • référence : [bold]{result['reference']}[/bold]")
        console.print(f"  • dashboard : [link]{result.get('dashboard_url')}[/link]")
        if result.get("warnings"):
            console.print(f"  • warnings  : {', '.join(result['warnings'])}")
    else:
        console.rule("[bold red]❌ IMPORT FAILED[/bold red]")
        for err in result.get("errors", ["unknown error"]):
            console.print(f"  • {err}")
        sys.exit(2)

# ============================================================
# CLI
# ============================================================

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="MCVA Local Crawler — crawle + extrait + uploade un audit",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--url", required=True, help="URL racine du site à auditer (ex: https://mcva.ch)")
    parser.add_argument("--sector", required=True, help="Secteur (clé SECTOR_GROUPS, ex: finance-fiduciaire)")
    parser.add_argument("--brand", default=None, help="Nom de marque (optionnel, auto-détecté sinon)")
    parser.add_argument("--audit-type", default="ultra",
                        choices=["pre_audit", "express", "full", "ultra"],
                        help="Type d'audit (défaut: ultra)")
    parser.add_argument("--quality", default="premium",
                        choices=["eco", "standard", "premium", "ultra", "dryrun"],
                        help="Qualité LLM scoring cloud (défaut: premium)")
    parser.add_argument("--themes", default=None,
                        help="Thèmes CSV (ex: seo,geo,contenu). Défaut = tous pour ultra.")
    parser.add_argument("--max-pages", type=int, default=MAX_PAGES,
                        help=f"Max pages à crawler (défaut: {MAX_PAGES})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Ne pas uploader — juste produire le JSON local")
    return parser.parse_args()

def main() -> None:
    args = parse_args()
    try:
        asyncio.run(run_audit(args))
    except KeyboardInterrupt:
        console.print("\n[yellow]Interrompu par l'utilisateur.[/yellow]")
        sys.exit(130)

if __name__ == "__main__":
    main()
