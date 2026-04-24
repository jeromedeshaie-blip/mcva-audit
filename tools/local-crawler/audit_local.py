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
import re
import sys
import time
from collections import Counter
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
        timeout=360,  # 6 min — laisse Gemma 4 31B terminer même sur grosses pages
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

def load_nlp_prompt() -> str:
    prompt_path = Path(__file__).parent / "prompts" / "extract_nlp.txt"
    return prompt_path.read_text(encoding="utf-8")

# ============================================================
# Python-deterministic extractors (fast, reliable, no LLM)
# ============================================================

def extract_technique(soup: BeautifulSoup) -> dict[str, Any]:
    """Extract SEO technical metadata — 100% deterministic Python."""
    def _text(selector: str, attr: Optional[str] = None) -> Optional[str]:
        el = soup.select_one(selector)
        if not el: return None
        val = el.get(attr) if attr else el.get_text(strip=True)
        return val if val else None

    # h1/h2/h3 text lists (trimmed, deduplicated while preserving order)
    def _headings(level: str) -> list[str]:
        seen, out = set(), []
        for h in soup.find_all(level):
            txt = h.get_text(" ", strip=True)
            if txt and txt not in seen and len(txt) < 300:
                seen.add(txt)
                out.append(txt)
            if len(out) >= 20: break
        return out

    # hreflang <link rel="alternate">
    hreflang = []
    for link in soup.find_all("link", rel=lambda x: x and "alternate" in x):
        lang = link.get("hrefLang") or link.get("hreflang")
        href = link.get("href")
        if lang and href:
            hreflang.append({"lang": lang, "href": href})

    # Canonical
    canonical_el = soup.find("link", rel="canonical")
    canonical = canonical_el.get("href") if canonical_el else None

    # Robots meta
    robots_el = soup.find("meta", attrs={"name": re.compile("^robots$", re.I)})
    robots_meta = robots_el.get("content") if robots_el else None

    # Viewport
    viewport = bool(soup.find("meta", attrs={"name": re.compile("^viewport$", re.I)}))

    # Charset (meta charset or meta http-equiv content-type)
    charset = None
    charset_el = soup.find("meta", attrs={"charset": True})
    if charset_el:
        charset = charset_el.get("charset")
    else:
        ct_el = soup.find("meta", attrs={"http-equiv": re.compile("^content-type$", re.I)})
        if ct_el:
            m = re.search(r"charset=([^;]+)", ct_el.get("content", ""))
            if m: charset = m.group(1).strip()

    # Title
    title_el = soup.find("title")
    title = title_el.get_text(strip=True) if title_el else None

    # Meta description
    desc_el = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    meta_description = desc_el.get("content") if desc_el else None

    return {
        "h1": _headings("h1"),
        "h2": _headings("h2"),
        "h3": _headings("h3"),
        "title": title,
        "meta_description": meta_description,
        "canonical": canonical,
        "hreflang": hreflang,
        "robots_meta": robots_meta,
        "viewport": viewport,
        "charset": charset,
    }


def extract_maillage(soup: BeautifulSoup, page_url: str) -> dict[str, Any]:
    """Extract internal/external links counts + top 10 each — deterministic."""
    from urllib.parse import urlparse, urljoin
    base_domain = urlparse(page_url).netloc.replace("www.", "")

    internal: list[dict] = []
    external: list[dict] = []
    internal_count = 0
    external_count = 0

    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if not href or href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:"):
            continue
        anchor = a.get_text(" ", strip=True)[:120] or "(no anchor)"
        try:
            absolute = urljoin(page_url, href)
            parsed = urlparse(absolute)
            if not parsed.netloc:
                continue
            is_internal = parsed.netloc.replace("www.", "") == base_domain
        except Exception:
            continue

        if is_internal:
            internal_count += 1
            if len(internal) < 10 and anchor != "(no anchor)":
                internal.append({"anchor": anchor, "target": absolute})
        else:
            external_count += 1
            if len(external) < 10 and anchor != "(no anchor)":
                external.append({
                    "anchor": anchor,
                    "target": absolute,
                    "domain": parsed.netloc.replace("www.", ""),
                })

    return {
        "internal_links_count": internal_count,
        "external_links_count": external_count,
        "top_internal_links": internal,
        "top_external_links": external,
    }


def extract_schema_org(soup: BeautifulSoup) -> dict[str, Any]:
    """Parse JSON-LD scripts and extract @types — 100% deterministic."""
    types: list[str] = []
    raw_scripts: list[str] = []

    for script in soup.find_all("script", type=re.compile(r"application/ld\+json", re.I)):
        content = script.string or script.get_text() or ""
        content = content.strip()
        if not content: continue
        raw_scripts.append(content[:2000])  # cap each at 2000 chars
        try:
            parsed = json.loads(content)
            _collect_types(parsed, types)
        except json.JSONDecodeError:
            pass  # malformed, skip type extraction but keep raw
        if len(raw_scripts) >= 5: break

    # Dedupe types while preserving order
    types_dedup = list(dict.fromkeys(types))
    return {"types_detected": types_dedup[:20], "raw_scripts": raw_scripts}


def _collect_types(obj: Any, out: list[str]) -> None:
    """Walk JSON-LD tree and collect @type values."""
    if isinstance(obj, dict):
        t = obj.get("@type")
        if isinstance(t, str):
            out.append(t)
        elif isinstance(t, list):
            out.extend(s for s in t if isinstance(s, str))
        for v in obj.values():
            _collect_types(v, out)
    elif isinstance(obj, list):
        for item in obj:
            _collect_types(item, out)


def extract_media(soup: BeautifulSoup) -> dict[str, Any]:
    """Count images, missing alts, video/audio presence — deterministic."""
    images = soup.find_all("img")
    images_count = len(images)
    images_without_alt = sum(1 for img in images if not img.get("alt", "").strip())
    has_video = bool(soup.find(["video", "iframe"], src=re.compile(r"youtube|vimeo|wistia", re.I))) \
                or bool(soup.find("video"))
    has_audio = bool(soup.find(["audio", "iframe"], src=re.compile(r"soundcloud|spotify", re.I))) \
                or bool(soup.find("audio"))
    return {
        "images_count": images_count,
        "images_without_alt": images_without_alt,
        "has_video": has_video,
        "has_audio": has_audio,
    }


def extract_body_text(soup: BeautifulSoup) -> str:
    """Extract clean body text for LLM NLP analysis."""
    body = soup.find("body") or soup
    # Remove noise tags
    for tag in body(["style", "script", "noscript", "nav", "footer", "header",
                     "aside", "form", "button", "svg"]):
        tag.decompose()
    text = body.get_text(" ", strip=True)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ============================================================
# Hybrid extraction: Python deterministic + Gemma NLP
# ============================================================

def extract_page_data(html: str, url: str) -> dict[str, Any]:
    """Hybrid extraction :
    - technique, maillage, schema_org, media → Python BS4 (déterministe, 0ms)
    - geo, semantique → Gemma 4 31B NLP (texte body uniquement, ~1-2k chars)
    """
    soup = BeautifulSoup(html, "html.parser")

    # 1. Deterministic extraction (Python, instant)
    technique = extract_technique(soup)
    maillage = extract_maillage(soup, url)
    schema_org = extract_schema_org(soup)
    media = extract_media(soup)

    # 2. Body text for LLM NLP analysis (small prompt, fast inference)
    body_text = extract_body_text(soup)
    body_truncated = body_text[:8000]  # ~2-3k tokens, plenty for NLP

    # Build minimal prompt for Gemma
    meta_info_parts = []
    if technique["robots_meta"]:
        meta_info_parts.append(f"robots={technique['robots_meta']}")
    if technique["canonical"]:
        meta_info_parts.append(f"canonical={technique['canonical']}")

    prompt = load_nlp_prompt() \
        .replace("{title}", technique["title"] or "(none)") \
        .replace("{meta_description}", technique["meta_description"] or "(none)") \
        .replace("{meta_info}", "; ".join(meta_info_parts) or "(none)") \
        .replace("{content}", body_truncated)

    # 3. Gemma NLP
    try:
        raw_json = call_ollama(prompt)
        raw_json = raw_json.strip()
        if raw_json.startswith("```"):
            raw_json = raw_json.split("```")[1] if "```" in raw_json else raw_json
            if raw_json.startswith("json"):
                raw_json = raw_json[4:]
        nlp_data = json.loads(raw_json)
        geo = nlp_data.get("geo", {})
        semantique = nlp_data.get("semantique", {})
    except (json.JSONDecodeError, RuntimeError, Exception) as e:
        console.print(f"[yellow]⚠ Gemma NLP échec pour {url}: {type(e).__name__}: {str(e)[:150]}[/yellow]")
        # Python fallback : count words at least
        words = re.findall(r"\b\w{3,}\b", body_text.lower())
        freq = Counter(words)
        FR_STOP = {"les", "des", "une", "que", "pour", "avec", "sur", "est", "dans",
                   "par", "vos", "nos", "qui", "tout", "plus", "faire", "sont", "pas"}
        top_words = [{"word": w, "count": c} for w, c in freq.most_common(30)
                     if w not in FR_STOP and not w.isdigit()][:15]
        geo = {"adresses": [], "villes": [], "codes_postaux": [], "telephones": [],
               "emails": [], "google_maps_embed": False, "gbp_mentioned": False}
        semantique = {
            "entites_nommees": [],
            "mots_cles_frequents": top_words,
            "flesch_score": None,
            "mots_total": len(words),
            "lang_detected": "fr",
        }

    # Merge all sections
    return {
        "technique": technique,
        "maillage": maillage,
        "geo": geo,
        "semantique": _ensure_mots_total(semantique, body_text),
        "schema_org": schema_org,
        "media": media,
    }


def _ensure_mots_total(sem: dict, body_text: str) -> dict:
    """Always fill mots_total via Python count (more reliable than LLM)."""
    words = re.findall(r"\b\w{3,}\b", body_text)
    sem["mots_total"] = len(words)
    return sem

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
