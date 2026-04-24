# MCVA Local Crawler — v3 Hybrid Architecture

Crawler local tournant sur Mac Studio M3 Ultra. Extrait les données SEO/GEO via
**Gemma 4 31B** en local, puis upload le JSON vers l'API MCVA Audit pour scoring cloud.

Avantages :
- **Crawl multi-pages illimité** (bypass des 60s Vercel Hobby)
- **Sites SPA** (Wix, Webflow, Next.js mal SSR) : Playwright attend le rendu
- **Coût extraction : €0** (Gemma local, pas d'API externe)
- **Reproductible** : `temperature=0`, cache SHA-256 par HTML

---

## Quick Start

### 1. Pré-requis

```bash
# Python 3.12+ (vérifier : python3 --version)
brew install python@3.12

# Ollama (serveur LLM local)
curl -fsSL https://ollama.com/install.sh | sh

# Lancer Ollama (daemon)
ollama serve &

# Pull Gemma 4 31B (~20 GB download, installation ~5-10 min)
ollama pull gemma4:31b

# Test rapide
ollama run gemma4:31b "Dis bonjour en français."
```

### 2. Setup du crawler

```bash
cd tools/local-crawler

# Créer un venv isolé
python3.12 -m venv .venv
source .venv/bin/activate

# Installer les deps
pip install -r requirements.txt

# Installer les navigateurs Playwright
python -m playwright install chromium

# Copier la config
cp .env.example .env
```

### 3. Générer une API key MCVA

Dans le dashboard https://mcva-audit.vercel.app/settings/api-keys :
- Cliquer **"Générer une clé"**
- Label : `mac-studio-local`
- Scope : `audit-import`
- **Copier le plaintext** (affiché une seule fois : `mcva_live_xxxxx...`)

Coller dans `.env` :
```bash
MCVA_API_KEY=mcva_live_xxxxxxxxxxxxxxx
```

### 4. Premier audit

```bash
# Audit complet Ultra sur un vrai site client
python audit_local.py \
  --url https://fdmfidu.ch \
  --sector finance-fiduciaire \
  --audit-type ultra \
  --quality premium

# Dry-run (juste produire le JSON sans uploader)
python audit_local.py --url https://fdmfidu.ch --sector finance-fiduciaire --dry-run
```

### 5. Output attendu

```
── MCVA Local Crawler — https://fdmfidu.ch ────────────
Model: gemma4:31b  |  Max pages: 10  |  API: https://mcva-audit.vercel.app
→ Crawling homepage: https://fdmfidu.ch
→ Discovered 14 internal links
→ Crawling [1/9]: https://fdmfidu.ch/services
→ Crawling [2/9]: https://fdmfidu.ch/equipe
...
⠋ Extraction Gemma [9/10] https://fdmfidu.ch/contact
✓ Payload saved: output/fdmfidu.ch-1745492341.json
  → 9 pages extracted, 1 failed, 182430ms total

→ Upload vers MCVA Audit...
── ✅ AUDIT IMPORTÉ ──
  • audit_id  : b3e2fa1d-1234-5678-abcd-ef0123456789
  • référence : AUDIT-2026-013
  • dashboard : https://mcva-audit.vercel.app/audit/b3e2fa1d-...
```

---

## Arguments CLI

| Flag | Requis | Défaut | Description |
|---|:---:|---|---|
| `--url` | ✅ | — | URL racine du site |
| `--sector` | ✅ | — | Clé secteur (ex: `finance-fiduciaire`) |
| `--brand` | | auto | Nom commercial explicite |
| `--audit-type` | | `ultra` | `pre_audit` / `express` / `full` / `ultra` |
| `--quality` | | `premium` | Qualité LLM scoring cloud : `eco` / `standard` / `premium` / `ultra` / `dryrun` |
| `--themes` | | tous | CSV de thèmes (ex: `seo,geo,contenu`) |
| `--max-pages` | | `10` | Nombre max de pages crawlées |
| `--dry-run` | | — | Ne pas uploader |

---

## Fichiers générés

```
tools/local-crawler/
├── output/                      # JSONs produits (un par audit)
│   └── fdmfidu.ch-1745492341.json
├── cache/                       # Cache extractions Gemma (SHA-256 HTML → JSON)
│   └── a3f5b2...{hash}.json     # Re-crawl du même HTML = skip Gemma
└── .env                         # Secrets (gitignored)
```

---

## Bascule de modèle

Éditer `.env` :
```bash
# Modèle rapide (MoE) pour gros volumes
MCVA_LOCAL_LLM=gemma4:26b

# Modèle qualité max (dense) — défaut
MCVA_LOCAL_LLM=gemma4:31b
```

---

## Troubleshooting

### "Ollama connection refused"
```bash
# Vérifier qu'Ollama tourne
curl http://localhost:11434/api/tags

# Redémarrer si besoin
killall ollama
ollama serve &
```

### "Model gemma4:31b not found"
```bash
ollama pull gemma4:31b
# Vérifier
ollama list
```

### "Playwright: chromium not installed"
```bash
python -m playwright install chromium
```

### "MCVA_API_KEY manquante"
Vérifier `.env` est bien dans `tools/local-crawler/` (pas la racine du projet).

### "Auth failed: not_found"
Clé révoquée ou invalide. Regénérer dans `/settings/api-keys`.

### JSON invalide renvoyé par Gemma
Gemma 4 31B hallucine parfois sur gros HTML. Réduire taille :
- Option 1 : crawler des pages plus simples
- Option 2 : éditer `HTML_TRUNCATE_CHARS` ou la taille du slice `html[:40000]` dans `audit_local.py`
- Option 3 : bascule `gemma4:26b` temporaire

---

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 1. Playwright   │ →  │ 2. Gemma 4 31B  │ →  │ 3. MCVA API     │
│    crawler      │    │    Ollama       │    │    /from-local  │
│                 │    │                 │    │                 │
│ • Chromium      │    │ • temp = 0      │    │ • Auth API key  │
│ • networkidle   │    │ • format = json │    │ • Validation    │
│ • Multi-pages   │    │ • Cache SHA-256 │    │ • Create audit  │
│ • Discover      │    │ • Retry 3x      │    │ • Store JSON    │
│   links         │    │                 │    │ • Return ID     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Voir aussi

- Master plan : `../../MCVA-AUDIT-v3-HYBRID-MASTER-PLAN.md`
- Schéma JSON TypeScript : `../../src/types/local-import.ts`
- Endpoint API : `../../src/app/api/audit-import/from-local/route.ts`

*MCVA Consulting SA — Phase 3B (2026-04-24)*
