# MCVA Audit Platform — Architecture

**Version** : 2.1 (2026-04-23)
**Repo** : `jeromedeshaie-blip/mcva-audit`
**Stack** : Next.js 16 · React 19 · TypeScript · Supabase · Vercel (Hobby)
**Base méthodologique** : [POLE-PERFORMANCE.md v2.1](./MCVA-AUDIT-v2.1-MASTER-PLAN.md)

---

## 1. Vue d'ensemble

Plateforme d'audit digital SEO/GEO propriétaire MCVA Consulting SA. Produit 3 niveaux d'audit (Pré-audit, Thématique, Ultra) couvrant 7 thèmes et 205 critères, sans dépendance à des solutions payantes.

**Cœur fonctionnel** :
- Audit HTML (scraping + 7 thèmes × scoring LLM)
- Score GEO™ 4 composantes (propriétaire MCVA)
- LLM Watch v2 (monitoring 4 LLMs en continu)
- Wizard Ultra 6 blocs (import données externes AWT/GSC/GA4/Moz/SimilarWeb/Seobility/LLM Watch)
- PDF brandé v3.2 (format `AUDIT-YYYY-NNN`)

**Tags majeurs** :
```
v1.0-llmwatch-phase-1b  (2026-04-08) — LLM Watch v2
v2.1-phase-2a           — Constantes + SCORING_VERSION
v2.1-phase-2f           — Robustesse UX
v2.1-phase-2c           — Wizard 6 blocs
v2.1-phase-2d           — Scoring enrichi
v2.1-phase-2e           — PDF brandé v3.2
v2.1-phase-2b           — OAuth GSC/GA4
v2.1-release            — Release complète
```

---

## 2. Stack technique

### Runtime & framework
- **Next.js 16.2** (App Router)
- **React 19.2** (Server + Client Components)
- **TypeScript 5** (strict mode)
- **Tailwind 4** + shadcn/ui + @base-ui/react

### Backend
- **Supabase** (Postgres + Auth + RLS)
- **Anthropic SDK** (Claude Sonnet 4.5/4.6 + Haiku 4)
- **Inngest** (jobs LLM Watch scheduled cron)
- **Puppeteer-core + @sparticuz/chromium** (PDF rendering)
- **Cheerio** (HTML parsing)

### Dépendances externes (payantes : 0)
- **Anthropic API** (scoring LLM) — seul coût runtime
- **OpenAI, Perplexity, Gemini** APIs (LLM Watch 4-LLM monitoring)
- **Google OAuth** (gratuit, GSC + GA4 Data API)

### Contraintes infra
- **Vercel Hobby** : `maxDuration = 60s` par route API
  - Force batches 2 dimensions/call pour CORE-EEAT (4 batches total)
  - Ultra audits orchestrés côté frontend (step-by-step)

---

## 3. Arborescence

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login flow
│   ├── (dashboard)/              # Pages authentifiées
│   │   ├── audit/[id]/           # Résultat d'un audit
│   │   ├── audit-complet/        # Flow audit thématique (step-by-step)
│   │   ├── audit-express/        # Pré-audit gratuit
│   │   ├── audit-ultra/new/      # Wizard Ultra 6 blocs (v2.1)
│   │   ├── benchmarks/           # Benchmark concurrentiel
│   │   ├── classements/          # Classements sectoriels
│   │   ├── llmwatch/             # LLM Watch dashboard + admin
│   │   ├── nouveau-audit/        # Flow unifié pré/thématique/ultra
│   │   ├── settings/integrations/ # OAuth GSC/GA4 (v2.1)
│   │   ├── siteaudit/            # Audit technique (crawler)
│   │   ├── layout.tsx            # Header + nav
│   │   └── page.tsx              # Tableau de bord
│   │
│   ├── api/                      # API routes (serverless)
│   │   ├── audit/                # Endpoints legacy (Inngest)
│   │   ├── audit-direct/         # Endpoints step-by-step (v2)
│   │   │   ├── init/             # Create audit + scrape
│   │   │   ├── data/             # Fetch SEO/GEO provider data
│   │   │   ├── score/            # Score CORE-EEAT ou CITE (2 dims/call)
│   │   │   ├── score-theme/      # Score perf/a11y/tech/contenu/rgesn
│   │   │   ├── action-plan/      # Génère plan d'action LLM
│   │   │   └── finalize/         # Aggregate + enrichit blocs externes
│   │   ├── audit-ultra/blocks/   # CRUD blocs A-F (v2.1)
│   │   ├── integrations/google/  # OAuth flow (v2.1)
│   │   │   ├── authorize/
│   │   │   ├── callback/
│   │   │   ├── disconnect/
│   │   │   ├── fetch-gsc/
│   │   │   └── fetch-ga4/
│   │   ├── llmwatch/             # LLM Watch data API
│   │   ├── monitoring/           # Monitoring triggers
│   │   ├── siteaudit/            # Tech audit API
│   │   └── inngest/              # Inngest webhook
│   │
│   └── layout.tsx                # Root layout
│
├── components/
│   ├── audit/                    # Composants résultats audit
│   ├── llmwatch/                 # Composants dashboard LLM Watch
│   ├── siteaudit/                # Composants audit tech
│   └── ui/                       # shadcn (button, card, combobox...)
│
├── lib/
│   ├── audit/                    # Wizard + blocs externes
│   │   ├── fetch-step.ts         # Retry logic partagée
│   │   ├── load-blocs.ts         # Load audit_external_blocks depuis DB
│   │   └── parsers/              # Parseurs blocs A-F (v2.1)
│   │       ├── parse-bloc-a-awt.ts
│   │       ├── parse-bloc-b-gsc.ts
│   │       ├── parse-bloc-c-ga4.ts
│   │       ├── parse-bloc-d-competitors.ts
│   │       ├── parse-bloc-e-keywords.ts
│   │       └── fetch-bloc-f-llmwatch.ts
│   │
│   ├── scoring/                  # Moteur de scoring audit
│   │   ├── constants.ts          # ⭐ POIDS PARTAGÉS v2.1
│   │   │                         #   SCORING_VERSION, THEME_WEIGHTS,
│   │   │                         #   CORE_EEAT_WEIGHTS, CITE_WEIGHTS,
│   │   │                         #   GEO_SCORE_THRESHOLDS, canRunUltra()
│   │   ├── core-eeat-items.ts    # Les 80 critères CORE-EEAT
│   │   ├── cite-items.ts         # Les 40 critères CITE
│   │   ├── a11y-items.ts         # 20 critères RGAA
│   │   ├── perf-items.ts         # 15 critères Core Web Vitals
│   │   ├── tech-items.ts         # 15 critères stack & sécurité
│   │   ├── contenu-items.ts      # 15 critères contenu
│   │   ├── rgesn-items.ts        # 20 critères éco-conception
│   │   ├── scorer.ts             # LLM scoring par dimension
│   │   ├── theme-scorer.ts       # Scoring thèmes (perf/a11y/...)
│   │   ├── action-plan.ts        # Génération plan d'action
│   │   ├── mock-scorer.ts        # Mode dryrun
│   │   └── external-mapping.ts   # ⭐ Blocs → critères (v2.1)
│   │
│   ├── llmwatch/                 # LLM Watch v2
│   │   ├── types.ts              # LlmWatchScore, LlmWatchClient...
│   │   ├── scoring.ts            # Compute Score GEO™
│   │   ├── validation.ts         # ⭐ Validation artefacts (v2.1)
│   │   └── alerts.ts             # Alertes variations
│   │
│   ├── llm-providers.ts          # OpenAI/Anthropic/Perplexity/Gemini unified
│   ├── judge.ts                  # LLM-as-judge (Claude Sonnet)
│   ├── scoring-engine.ts         # Engine scoring LLM Watch
│   ├── monitor.ts                # Orchestrateur run LLM Watch
│   │
│   ├── providers/                # Abstraction SEO/GEO providers
│   │   ├── seo/
│   │   │   ├── seo-provider.ts          # Interface
│   │   │   ├── free-seo-provider.ts     # Palier 1 (HTML only)
│   │   │   └── semrush-provider.ts      # @deprecated v2.1
│   │   └── geo/
│   │
│   ├── parsers/
│   │   └── semrush-parser.ts     # @deprecated v2.1 (legacy audits)
│   │
│   ├── integrations/             # OAuth Google (v2.1)
│   │   ├── google-oauth.ts       # Token exchange, refresh
│   │   ├── gsc.ts                # Search Console fetcher
│   │   └── ga4.ts                # GA4 Data API fetcher
│   │
│   ├── pdf/
│   │   ├── templates/
│   │   │   ├── styles.ts         # CSS v3.2 (gradients, typo)
│   │   │   ├── render.ts         # Template basique
│   │   │   ├── render-ultra.ts   # Template Ultra 25 pages (v3.2)
│   │   │   └── render-pre-audit.ts
│   │   └── html-to-pdf.ts        # Puppeteer wrapper
│   │
│   ├── siteaudit/                # Audit tech (crawl + checks)
│   │   ├── crawler.ts            # ⭐ + détection domaine parqué (v2.1)
│   │   ├── seo-checker.ts
│   │   ├── performance.ts        # PageSpeed API wrapper
│   │   ├── readability.ts
│   │   ├── scoring.ts
│   │   └── recommendations.ts
│   │
│   ├── inngest/                  # Jobs scheduled (LLM Watch cron)
│   │   └── functions.ts
│   │
│   ├── supabase/                 # Client/server helpers
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # SSR + service role
│   │
│   ├── constants.ts              # SECTOR_GROUPS, QUALITY_CONFIG,
│   │                             # LLMWATCH_RUN_CONFIG
│   └── utils.ts                  # cn() helper
│
├── types/
│   └── audit.ts                  # AuditTheme, AuditItem, AuditScores,
│                                 # GLOBAL_SCORE_WEIGHTS (re-export)
│
└── middleware.ts                 # Auth middleware Supabase
```

**Total** : 149 fichiers TS/TSX, ~1.4 Mo de code.

---

## 4. Modèle de données (Supabase)

### Core audit
| Table | Rôle |
|---|---|
| `audits` | Métadonnées audit (url, sector, audit_type, status, reference `AUDIT-2026-NNN`) |
| `audit_scores` | Scores agrégés (seo, geo, perf, a11y, tech, contenu, rgesn, global, scoring_version) |
| `audit_items` | 205 critères scorés (item_code, status, score, notes, scoring_version) |
| `audit_actions` | Plan d'action LLM-générée (P1-P4, effort, catégorie) |
| `audit_uploads` | Legacy Semrush/Qwairy CSV uploads |
| `audit_external_blocks` | ⭐ Blocs A-F Wizard Ultra (v2.1) |

### Vue utilitaire
- `audit_ultra_readiness` — calcule mode (full/degraded/geo_only/blocked) selon blocs dispos

### Sequence & RPC
- `audit_ultra_seq` — séquence autoincrement pour références
- `generate_audit_reference_v2_1(audit_type, year)` — returns `PRE-2026-001` / `THEMA-2026-001` / `AUDIT-2026-001`

### LLM Watch
| Table | Rôle |
|---|---|
| `llmwatch_clients` | Clients monitorés |
| `llmwatch_queries` | Prompts à tester (multilingue) |
| `llmwatch_competitors` | Concurrents à tracker |
| `llmwatch_facts` | Knowledge base client (pour Exactitude) |
| `llmwatch_raw_results` | Réponses LLM brutes |
| `llmwatch_scores` | Score GEO™ hebdomadaire (4 composantes) |
| `llmwatch_competitor_scores` | Scores des concurrents |
| `llmwatch_alerts` | Alertes variation |
| `llmwatch_recommendations` | Recommandations auto |
| `llmwatch_reports` | PDFs générés |

### RPC LLM Watch
- `upsert_weekly_score(...)` — `ON CONFLICT DO UPDATE` atomique

### Intégrations (v2.1)
- `external_data_connections` — OAuth tokens GSC/GA4
- `external_data_cache` — cache 24h fetches

### Benchmarks & Classements
- `benchmark_domains`, `benchmarks`, `sector_rankings`, `geo_score_evolution`

### Auth & autres
- `users`, `leads`, `siteaudit_results`, `latest_llm_breakdown` (vue)

---

## 5. Flux principaux

### 5.1 Audit Ultra (Wizard v2.1)

```
Step 1: Config (URL + secteur + marque + qualité)
    │
    ├─► POST /api/audit-direct/init
    │   - Crée audit dans DB + scrape HTML
    │   - ⚠ assertNotParkedDomain() (v2.1 — règle 10)
    │   - Génère ref AUDIT-2026-NNN via RPC
    │
Step 2-7: Paste bloc A (AWT) / B (GSC) / C (GA4) / D (concurrents) / E (keywords) / F (LLM Watch)
    │
    ├─► POST /api/audit-ultra/blocks (une fois par bloc)
    │   - Parse avec le parseur approprié
    │   - Upsert dans audit_external_blocks
    │   - Retourne warnings non-bloquants
    │
Step 8: Recap + canRunUltra()
    │   Mode calculé côté client : full / degraded / geo_only / blocked
    │
    └─► Redirect vers /audit-complet?auditId={id}
        (réutilise le flow de scoring step-by-step)
            │
            ├─► POST /api/audit-direct/data (scrape SEO/GEO data)
            ├─► POST /api/audit-direct/score (CORE-EEAT C,O → R,E → Exp,Ept → A,T)
            ├─► POST /api/audit-direct/score (CITE C,I → T,E)
            ├─► POST /api/audit-direct/score-theme (perf/a11y/tech/contenu/rgesn)
            ├─► POST /api/audit-direct/action-plan
            └─► POST /api/audit-direct/finalize
                - Load blocs A-F via loadAuditBlocs()
                - buildEnrichment(bundle) →
                    - Override item_codes (CI-I01, R03, O01...) avec scores vérifiés
                    - scoreGeoOverride depuis Bloc F (LLM Watch)
                - INSERT audit_scores avec scoring_version = "2.1"
                - Retourne sources_citation, score_geo_source
```

### 5.2 LLM Watch (monitoring 4 LLMs)

```
Admin / Scheduler → /api/monitoring/run-single (par query)
    │
    ├─► queryAllLLMs(prompt) → 4 LLMs parallèles
    │   (gpt-4o, claude-sonnet-4.5, sonar-pro, gemini-2.5-pro)
    │
    ├─► Promise.allSettled([scoreResponse(r) for r in responses])
    │   scoreResponse() → judge.ts → Claude Sonnet LLM-as-judge
    │       returns {cited, sentiment, is_recommended, competitor_mentions, ...}
    │
    └─► INSERT llmwatch_raw_results (per response)

→ /api/monitoring/finalize-score (après toutes queries)
    │
    ├─► Fetch raw_results de la semaine
    ├─► computeRunScore() → 4 composantes
    │   - Presence  : % prompts avec brand cité
    │   - Exactitude: % citations factuellement correctes (vs facts KB)
    │   - Sentiment : avg(sentiment_score) mappé 0-25
    │   - Recommendation : % prompts avec recommandation explicite
    │
    └─► RPC upsert_weekly_score() → llmwatch_scores
        Atomic INSERT ... ON CONFLICT DO UPDATE
```

### 5.3 PDF brandé v3.2

```
GET /api/audit/pdf?id={auditId}
    │
    ├─► Fetch audit + scores + items + actions + external_blocks (parallel)
    │
    ├─► Détermine template selon audit_type :
    │     pre_audit  → renderPreAuditPdf
    │     full/theme → renderAuditPdf
    │     ultra      → renderUltraAuditPdf
    │
    ├─► Pour Ultra :
    │   - sourcesUsed[] ← source_labels des external_blocks
    │   - scoreGeoBreakdown ← geo_data si score_source = llm_watch
    │   - Template 25 pages avec tessellation mark 4 cubes,
    │     General Sans/DM Sans/DM Mono, Score GEO™ 4 composantes
    │
    └─► Puppeteer-core + @sparticuz/chromium → PDF blob
```

---

## 6. Score GEO™ (propriétaire MCVA)

**Formule sacrée** (jamais gonflée pour raisons commerciales) :

```
Score GEO™ (0-100) = Présence (0-25)
                   + Exactitude (0-25)
                   + Sentiment (0-25)
                   + Recommandation (0-25)
```

**Source** :
- **Avec bloc F** (LLM Watch) : KPIs réels depuis `llmwatch_scores`
- **Sans bloc F** (mode dégradé) : estimation = moyenne Score CITE

**Seuils** :
| Score | Niveau | Interprétation |
|---|---|---|
| 0-25 | Invisible | La marque n'existe pas pour les LLMs |
| 26-50 | Émergent | Présence sporadique |
| 51-75 | Visible | Citée en alternative |
| 76-100 | Leader | Référence sectorielle |

**Reproductibilité** :
- `temperature = 0` pour tous les appels LLM
- `SCORING_VERSION = "2.1"` stocké dans chaque score
- `MODEL_SNAPSHOT_VERSION = "2026-04-08"` pour les LLMs pinnés

---

## 7. Poids centralisés (`src/lib/scoring/constants.ts`)

```typescript
THEME_WEIGHTS = {
  seo: 0.20, geo: 0.25,
  perf: 0.12, a11y: 0.12,
  tech: 0.08, contenu: 0.15, rgesn: 0.08,
}  // sum = 1.0

CORE_EEAT_WEIGHTS = {
  C: 0.15, O: 0.15, R: 0.10, E: 0.10,
  Exp: 0.15, Ept: 0.15, A: 0.10, T: 0.10,
}  // sum = 1.0

CITE_WEIGHTS = { C: 0.25, I: 0.25, T: 0.25, E: 0.25 }  // equal

GEO_SCORE_COMPONENTS = { presence: 25, exactitude: 25, sentiment: 25, recommendation: 25 }

LLM_SNAPSHOTS = {
  openai: "gpt-4o-2024-11-20",
  anthropic: "claude-sonnet-4-5-20250929",
  perplexity: "sonar-pro",
  gemini: "gemini-2.5-pro",
}

VERCEL_PLAN = "hobby" → CORE_EEAT_BATCH_SIZE = 2, CITE_BATCH_SIZE = 2
```

⚠ **Validation runtime** : les poids sont vérifiés à l'import (throw si sum ≠ 1.0).

---

## 8. Blocs externes A-F (POLE-PERF v2.1 § 6.4)

| Bloc | Source | Critères enrichis | Parser |
|---|---|---|---|
| **A** | Ahrefs Webmaster Tools | `CI-I01` (DR), `CI-I02`+`R03` (backlinks), `CI-I03`+`R04` (RD), `CI-I04` (authority) | `parse-bloc-a-awt.ts` |
| **B** | Google Search Console | `O01` (avg position), `O02` (CTR), `O03` (diversity), `E05` (engagement) | `parse-bloc-b-gsc.ts` |
| **C** | Google Analytics 4 | `E01` (engagement rate), `E02` (session duration), `E04` (conversions) | `parse-bloc-c-ga4.ts` |
| **D** | Concurrents (Moz + SimilarWeb + Seobility) | Benchmark numérique | `parse-bloc-d-competitors.ts` |
| **E** | Google Keyword Planner CH | Volumes cibles | `parse-bloc-e-keywords.ts` |
| **F** | LLM Watch | Score GEO™ 4 composantes (override complet) | `fetch-bloc-f-llmwatch.ts` |

**Mode dégradé** (`canRunUltra` dans constants.ts) :
- 6/6 blocs → **full**
- A+B+F → **degraded** (acceptable)
- F seul → **geo_only** (dégrade vers thématique GEO)
- Autre → **blocked**

---

## 9. Sécurité & RLS

### Pattern Supabase
- **Service role** utilisé côté serveur (routes API) via `createServiceClient()` → bypasse RLS
- **Anon/auth role** utilisé dans les Server Components + client → RLS applique

### Policies standard
- `authenticated` : SELECT only (lecture)
- `service_role` : ALL (CRUD)
- Exception : `external_data_connections` → `users see own` (scoped per user_id)

### Auth
- **Supabase Auth** (magic link / SSO)
- Middleware `src/middleware.ts` protège `(dashboard)/*`

---

## 10. Déploiement

### Vercel
- Hobby plan (60s max per route)
- Auto-deploy sur push main
- Env vars critiques :
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY`
  - `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`
  - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (v2.1)
  - `NEXT_PUBLIC_SITE_URL`
  - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`

### Supabase
- Projet : `azgszqlhdhzcaofvixqi`
- Migrations appliquées via MCP Supabase (non stockées en `.sql` dans le repo — historique dans le dashboard Supabase)

### Inngest
- Jobs cron LLM Watch (monday 06:00 UTC)
- Webhook endpoint : `/api/inngest`

---

## 11. Points d'attention

### Règles critiques POLE-PERFORMANCE v2.1

1. **Score GEO™ sacré** — jamais gonflé, remplacé verbatim par LLM Watch quand bloc F présent
2. **Reproductibilité** — `temperature = 0`, snapshots pinnés, `SCORING_VERSION` stocké
3. **Traçabilité** — chaque item enrichi tagué `[Source vérifiée: AWT export 2026-04-23]`
4. **Mode dégradé explicite** — mention dans rapport quand blocs manquants
5. **Artefacts rejetés** — validation `llmwatch/validation.ts` (section 13 POLE-PERF)
6. **Domaine parqué** — detection `crawler.ts` avant scraping (règle 10)

### Pièges connus
- **`useSearchParams` sans Suspense** → erreur de prerender Next.js
- **Supabase upsert avec `onConflict`** → peut échouer silencieusement, préférer RPC
- **Batch Ultra > 2 dims** → 504 timeout sur Hobby
- **Gemini free tier** : quota épuisé sur `gemini-2.5-pro` (fallback silencieux `Promise.allSettled`)

---

## 12. Roadmap post-v2.1

- [ ] Test end-to-end Wizard Ultra sur client réel (FDM ou MCVA)
- [ ] Config Google OAuth (env vars Vercel)
- [ ] Upgrade Vercel Pro ($20/mo) → batches 4 dims/call
- [ ] Composant UI affichage `[Source vérifiée]` dans les items (actuellement dans `notes`)
- [ ] Export JSON audit depuis dashboard (pour bloc F de futurs audits)
- [ ] Fix Gemini quota (rotation compte ou skip gracieux)
- [ ] Migrations SQL versionnées en fichier (actuellement dans dashboard Supabase)

---

## 13. Contacts & références

- **POLE-PERFORMANCE v2.1** : spec méthodologique (205 critères, Score GEO™, workflow)
- **MCVA Brand Identity v3.2** : skill `mcva-brand-identity` (charte PDF)
- **Supabase Project** : `azgszqlhdhzcaofvixqi` (dashboard)
- **Vercel Project** : `mcva-audit` (team `jeromedeshaie-blips-projects`)
- **Github** : `jeromedeshaie-blip/mcva-audit`
- **Maintainer** : Jérôme Deshaie, CEO MCVA Consulting SA

---

*Document généré 2026-04-23 — aligné tag `v2.1-release` (commit `7bfed1b`)*
