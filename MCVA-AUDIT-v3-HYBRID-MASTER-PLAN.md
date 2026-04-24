# MCVA Audit v3 — Hybrid Local + Cloud Architecture

**Version** : 3.0-draft
**Date** : 2026-04-24
**Statut** : En cours d'exécution
**Base** : Plateforme v2.1 (tag `v2.1-release`)
**Machine cible local** : Mac Studio M3 Ultra 92 Go RAM
**Repo** : `jeromedeshaie-blip/mcva-audit`

> Plan d'évolution pour ajouter un **chemin d'import local** à côté du flow cloud existant.
> Ne remplace PAS l'app Vercel/Supabase. La cohabitation permet :
> - Crawl multi-pages illimité (bypass 60s Vercel)
> - Extraction avec LLM local (Gemma 3 27B via Ollama) → 0€
> - Sites SPA/client-rendered (Wix, Webflow, Next.js mal configuré) enfin auditables
> - Pré-scoring local avant upload (réduction coûts Anthropic API)

---

## 1. Constat qui justifie Phase 3

### Ce qui marche en v2.1
- Audit thématique / pré-audit : rapide, efficace, Vercel gère bien
- LLM Watch v2 : 4 LLMs, Score GEO™ propriétaire, monitoring hebdo
- Wizard 6 blocs A-F : import structuré de données externes
- PDF brandé v3.2 : livrable client prêt
- Scoring centralisé v2.1 : reproductible, versionné

### Limitations identifiées
1. **Timeout Vercel Hobby 60s** : crawl multi-pages + extraction LLM impossible en un seul call
2. **Sites SPA** : Cheerio sur serverless ne peut pas attendre le rendering client-side (Wix/Webflow/Next.js mal SSR)
3. **Coût Anthropic** : chaque appel scoring consomme. Avec un Mac Studio sous la main, l'extraction structurée (HTML → JSON) peut être faite localement à coût zéro
4. **Multi-pages** : audit ultra devrait couvrir 5-10 pages, aujourd'hui limité à la homepage dans le flow serverless

### Hypothèse
Un Mac Studio M3 Ultra 92 Go peut :
- Faire tourner Playwright en parallèle (headless Chromium, 10+ pages simultanées)
- Héberger un LLM local (Gemma 3 27B Q4 / Qwen 2.5 72B Q4 / Llama 3.3 70B Q4) qui fait l'extraction structurée à 20-40 tokens/sec
- Générer un JSON structuré uploadable vers l'app web via API

**Coût runtime** : €0 (hardware déjà détenu, pas d'API externe pour extraction).

---

## 2. Architecture cible 3-tiers

```
┌──────────────────────────────┐   ┌──────────────────────────────┐   ┌──────────────┐
│ TIER 1: MAC STUDIO (local)   │   │ TIER 2: WEB APP (Vercel)     │   │ TIER 3:      │
│ Heavy extraction             │→  │ Scoring + Display + Stockage │→  │ CLAUDE       │
│                              │   │                              │   │ PLAN MAX     │
│ • Python + Playwright        │   │ • Supabase DB                │   │ (web UI)     │
│ • Ollama + Gemma 3 27B       │   │ • Dashboard web              │   │              │
│ • Extraction HTML → JSON     │   │ • Scoring LLM (Anthropic API)│   │ • Synthèse   │
│ • Crawl multi-pages          │   │ • Wizard 6 blocs A-F         │   │   stratégique│
│ • Détection SPA avancée      │   │ • PDF brandé v3.2            │   │ • Plan       │
│                              │   │ • LLM Watch monitoring       │   │   action     │
│ OUTPUT:                      │   │                              │   │   complexe   │
│ audit.local.json             │   │ IMPORT:                      │   │ • Q/R client │
│ POST → API                   │   │ POST /api/audit-import/      │   │              │
│                              │   │        from-local            │   │ MANUAL:      │
│                              │   │                              │   │ Copy-paste   │
│                              │   │                              │   │ depuis PDF   │
└──────────────────────────────┘   └──────────────────────────────┘   └──────────────┘
   €0 / runtime                       ~€0.50 / audit                    €200/mois flat
```

**Principe clé** : le tier 2 (web app) est **agnostique** à l'origine des données. Que le crawl ait été fait par Vercel (flow actuel) ou par le Mac Studio (nouveau flow 3), le scoring + PDF fonctionnent pareil.

---

## 3. Phase 3A — Foundation (endpoint import)

**Objectif** : préparer le web app à recevoir des audits pré-crawlés depuis un client externe (Mac Studio).

### Tâches

1. **Migration DB** — nouvelle table `audit_local_extractions`
   - Stocke le JSON brut uploadé (pour audit trail)
   - Foreign key vers `audits`
   - Hash du HTML pour dédoublonnage

2. **Types partagés** — `src/types/local-import.ts`
   - `LocalImportPayload` : schéma JSON accepté
   - `PageExtraction` : données structurées par page
   - `CrawlMetadata` : timing, extractor version, SPA flag

3. **Endpoint** `POST /api/audit-import/from-local`
   - Auth par API key (header `X-MCVA-Import-Key`)
   - Validation schéma (Zod ou manuel)
   - Création audit + insertion extractions
   - Trigger scoring (réutilise `/api/audit-direct/score*` en chaîne)
   - Retourne `audit_id` pour suivi

4. **API key auth**
   - Nouvelle table `api_keys` (user_id, key_hash, label, created_at, last_used_at)
   - Middleware de vérification (hash SHA-256)
   - UI de génération dans `/settings/api-keys`

5. **Backward compat** : le flow existant (`/api/audit-direct/init` + scrape serverless) reste inchangé.

### Livrable Phase 3A
Tag `v3-phase-3a` — l'endpoint tourne, validation OK, un curl `POST` avec un JSON valide crée un audit.

---

## 4. Phase 3B — Script Python Mac Studio

**Objectif** : outil CLI local qui crawle + extrait + uploade.

### Tâches

1. **Repo séparé** : `mcva-audit-local` (ou dossier `/tools/local-crawler/` dans le monorepo)
2. **Dependencies** : Python 3.12, `playwright`, `requests`, `python-dotenv`
3. **Setup Ollama** : instructions install + pull Gemma 3 27B
4. **Script `audit_local.py`** :
   - Args : `--url`, `--sector`, `--quality`, `--pages N`, `--api-key`
   - Crawl multi-pages (homepage + sous-pages découvertes)
   - Extraction Gemma 3 avec prompt structuré (schéma JSON strict)
   - Validation Pydantic avant upload
   - POST vers `/api/audit-import/from-local`
   - Affiche `audit_id` + URL dashboard
5. **Fallback LLM** : si Ollama down → utiliser Claude Haiku via API (€0.01/call)
6. **Cache local** : SHA-256 HTML → éviter re-extraction identique

### Choix LLM local (M3 Ultra 92 Go)

**Modèle retenu : Gemma 4 31B Dense** (`gemma4:31b`).

Décision du 2026-04-24 : un seul modèle polyvalent plutôt que spécialisation.
Le 31B sert simultanément :
- Extraction HTML → JSON (tâche Phase 3)
- Raisonnement / code / agents (autres projets Jérôme)
- Synthèse longue (au lieu de Claude Plan Max quand quota atteint)

Comparatif pour référence :

| Modèle | Architecture | RAM Q4 | Vitesse | Arena ELO | Verdict |
|---|---|---|---|---|---|
| **Gemma 4 31B Dense** ⭐ | Dense | ~20 Go | ~10 t/s | **1452 (#3)** | **Retenu** — polyvalent |
| Gemma 4 26B MoE | MoE (4B actifs) | 14-18 Go | 40+ t/s | 1441 (#6) | Plus rapide mais moins général |
| Gemma 4 E4B | Dense multimodal | 4 Go | ~80 t/s | — | OCR images |
| Gemma 4 E2B | Dense | 2 Go | 100+ t/s | — | Tests rapides |

**Tag Ollama** : `gemma4:31b` (≈20 Go download).

**Perf attendue** sur audit Ultra (10 pages) :
- Extraction HTML → JSON structuré : ~15-20 s total (acceptable à 1-2 audits/jour)
- RAM consommée : ~20 Go sur 92 disponibles → place pour autres apps

**Env var config** (Phase 3B Python script) :
```bash
MCVA_LOCAL_LLM=gemma4:31b   # default
# Bascule rapide si besoin : MCVA_LOCAL_LLM=gemma4:26b
```

### Livrable Phase 3B
Tag `v3-phase-3b` — `python audit_local.py --url https://site.ch --quality premium` produit un audit dans Supabase, accessible via URL dashboard.

---

## 5. Phase 3C — UI Import depuis local

**Objectif** : nouvelle page `/audit-local` dans le dashboard.

### Tâches
1. **Page `/audit-local`** :
   - Section "Imports récents" (liste des imports depuis Mac Studio)
   - Status de chaque import (received → scoring → completed)
   - Log de validation du schéma
2. **Page `/settings/api-keys`** :
   - CRUD API keys
   - Affichage de la commande curl type
   - Rotation/révocation
3. **Navigation** : lien "Import local" dans layout

### Livrable Phase 3C
Tag `v3-phase-3c` — UI visible à `mcva-audit.vercel.app/audit-local`.

---

## 6. Phase 3D — Documentation

**Objectif** : Jérôme peut onboarder son Mac Studio en <30 minutes.

### Tâches
1. **`docs/local-crawler-setup.md`** :
   - Install Python 3.12 + Playwright
   - Install Ollama + pull Gemma 3 27B
   - Générer API key dans l'app
   - Config `.env` local (MCVA_API_KEY + MCVA_API_URL)
   - Première exécution test
2. **`docs/local-crawler-troubleshooting.md`** :
   - Erreurs Ollama courantes (model not found, OOM)
   - Playwright issues (chromium missing, timeout)
   - API errors (401, 422, 500)
3. **Schéma JSON documenté** : `docs/local-import-schema.md`

### Livrable Phase 3D
Tag `v3-phase-3d` — docs complètes, screenshots, troubleshooting.

---

## 7. Roadmap

| Semaine | Phase | Livrable |
|---|---|---|
| S1 | 3A | Endpoint import + API keys + auth |
| S2-S3 | 3B | Script Python + Ollama setup |
| S3 | 3C | UI imports + page API keys |
| S3 | 3D | Docs onboarding |
| S4 | **Test E2E** | Audit Ultra réel sur 1 client via Mac Studio |

---

## 8. Critères de succès

Avant de déclarer Phase 3 "done" :

- [ ] `python audit_local.py --url X` crée un audit complet en <5 min
- [ ] Score GEO™ inchangé (toujours 4 LLMs via LLM Watch, pas dégradé)
- [ ] PDF brandé v3.2 généré correctement
- [ ] Un site SPA (Wix) qui échouait avant en Hobby passe avec le flow local
- [ ] Coût API pour extraction : €0 (vs ~€0.10 avant en cloud)
- [ ] Backward compat : flow `nouveau-audit` web existant fonctionne toujours
- [ ] API key auth validée (pas d'accès sans clé)

---

## 9. Hors scope Phase 3 (éventuel Phase 4)

- **Pré-scoring local** (utiliser LLM local pour pré-scorer 205 critères et réduire coût Anthropic) — tentant mais casse la reproductibilité (`SCORING_VERSION`)
- **Agent autonome local** qui tourne en cron et re-crawl les clients
- **Interface graphique locale** (app Electron) — nice-to-have, pas critique

---

*MCVA Consulting SA — Plan Phase 3 v3.0-draft — 2026-04-24*
*Executeur : Claude Code (autonomous mode)*
*Validateur : Jérôme Deshaie, CEO*
