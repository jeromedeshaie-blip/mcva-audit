# MCVA Audit — Documentation technique complète

**Version** : 2.1 (tag `v2.1-release`)
**Date** : 2026-04-23

Documentation granulaire de la plateforme MCVA Audit, splittée par domaine technique. Chaque fichier contient le code complet des modules concernés + contexte.

---

## 📋 Index (16 fichiers)

### Vue d'ensemble
| # | Fichier | Taille | Contenu |
|---|---|---:|---|
| — | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | 14 Ko | Vue d'ensemble, flux, data model, roadmap |
| — | [`../MCVA-AUDIT-v2.1-MASTER-PLAN.md`](../MCVA-AUDIT-v2.1-MASTER-PLAN.md) | 6 Ko | Master plan Phase 2 |
| — | [`../CODE-BUNDLE.md`](../CODE-BUNDLE.md) | 1.0 Mo | Bundle complet en un seul fichier |

### Configuration & Types
| # | Fichier | Taille | Contenu |
|---|---|---:|---|
| 01 | [`01-configuration.md`](./01-configuration.md) | 4 Ko | package.json, tsconfig, next.config, postcss, eslint, gitignore |
| 02 | [`02-types.md`](./02-types.md) | 9 Ko | `src/types/audit.ts` — types centraux |

### Moteur de scoring
| # | Fichier | Taille | Contenu |
|---|---|---:|---|
| 03 | [`03-scoring.md`](./03-scoring.md) | 131 Ko | **Moteur scoring complet** : constants v2.1 + scorer + theme-scorer + action-plan + external-mapping + 7 fichiers items (80 CORE-EEAT + 40 CITE + perf + a11y + tech + contenu + rgesn) + mock |
| 16 | [`16-database-schema.md`](./16-database-schema.md) | 13 Ko | Schéma DB Supabase complet (tables, contraintes, RPC) |
| 17 | [`17-local-crawler-setup.md`](./17-local-crawler-setup.md) | 7 Ko | **v3** — Installation Mac Studio (Python, Ollama, Gemma 4 31B) |
| 18 | [`18-local-crawler-troubleshooting.md`](./18-local-crawler-troubleshooting.md) | 8 Ko | **v3** — Erreurs courantes (Ollama, Playwright, API) |
| 19 | [`19-local-import-schema.md`](./19-local-import-schema.md) | 10 Ko | **v3** — Schéma JSON LocalImportPayload v3.0 |

### LLM Watch
| # | Fichier | Taille | Contenu |
|---|---|---:|---|
| 04 | [`04-llmwatch.md`](./04-llmwatch.md) | 51 Ko | **LLM Watch v2** : types + scoring Score GEO™ + validation artefacts + alertes + llm-providers (4 LLMs) + judge + scoring-engine + monitor orchestrator |

### Wizard Ultra & Audit
| # | Fichier | Taille | Contenu |
|---|---|---:|---|
| 05 | [`05-audit-wizard.md`](./05-audit-wizard.md) | 27 Ko | **Wizard v2.1** : fetch-step retry, load-blocs, 6 parseurs (AWT/GSC/GA4/Concurrents/KeywordPlanner/LLMWatch) |
| 06 | [`06-providers.md`](./06-providers.md) | 57 Ko | SEO/GEO providers : free-tier + Semrush (@deprecated) + parser Semrush legacy |
| 07 | [`07-integrations.md`](./07-integrations.md) | 10 Ko | OAuth Google (GSC + GA4) : helpers + fetchers |
| 08 | [`08-siteaudit.md`](./08-siteaudit.md) | 29 Ko | Crawler (avec detection domaine parqué v2.1) + seo-checker + performance + readability + recommendations |

### Infrastructure
| # | Fichier | Taille | Contenu |
|---|---|---:|---|
| 09 | [`09-pdf.md`](./09-pdf.md) | 151 Ko | **PDF templates v3.2** : styles CSS, render-basic, render-ultra (25 pages + tessellation mark), render-pre-audit, html-to-pdf (Puppeteer) |
| 10 | [`10-supabase-inngest.md`](./10-supabase-inngest.md) | 64 Ko | Supabase client/server (createClient + createServiceClient) + Inngest functions (LLM Watch cron) + constants globales (SECTOR_GROUPS, QUALITY_CONFIG, LLMWATCH_RUN_CONFIG) + utils |

### API Routes
| # | Fichier | Taille | Contenu |
|---|---|---:|---|
| 11 | [`11-api-audit-direct.md`](./11-api-audit-direct.md) | 60 Ko | **Flow step-by-step** : init → data → score → score-theme → action-plan → finalize → actions |
| 12 | [`12-api-others.md`](./12-api-others.md) | 78 Ko | audit-ultra/blocks (v2.1), integrations Google OAuth (authorize/callback/disconnect/fetch-gsc/fetch-ga4), audit legacy, siteaudit, benchmark, rankings, scores, public, debug |
| 13 | [`13-api-llmwatch.md`](./13-api-llmwatch.md) | 42 Ko | LLM Watch data API + monitoring triggers (run-single, run, finalize-score, facts, cron) + Inngest webhook |

### Frontend
| # | Fichier | Taille | Contenu |
|---|---|---:|---|
| 14 | [`14-pages-dashboard.md`](./14-pages-dashboard.md) | 196 Ko | **Toutes les pages authentifiées** : layout + middleware + globals.css + dashboard + nouveau-audit + audit-complet + audit-express + audit-ultra/new (wizard) + llmwatch dashboard/admin + settings/integrations + siteaudit + benchmarks + classements + audit/[id] + auth |
| 15 | [`15-components.md`](./15-components.md) | 89 Ko | Components shadcn UI (button, card, sector-combobox...) + audit results/charts + llmwatch widgets + siteaudit widgets |

---

## 🎯 Par fonctionnalité — quel fichier consulter ?

### "Comment fonctionne le Score GEO™ ?"
→ [03-scoring.md](./03-scoring.md) (constants.ts) + [04-llmwatch.md](./04-llmwatch.md) (scoring-engine.ts, judge.ts)

### "Comment le wizard Ultra charge les blocs A-F ?"
→ [05-audit-wizard.md](./05-audit-wizard.md) (parsers) + [14-pages-dashboard.md](./14-pages-dashboard.md) (wizard UI) + [12-api-others.md](./12-api-others.md) (audit-ultra/blocks endpoint)

### "Comment fonctionne le scoring enrichi ?"
→ [03-scoring.md](./03-scoring.md) (external-mapping.ts) + [11-api-audit-direct.md](./11-api-audit-direct.md) (finalize)

### "Comment OAuth Google fonctionne ?"
→ [07-integrations.md](./07-integrations.md) (helpers) + [12-api-others.md](./12-api-others.md) (endpoints) + [14-pages-dashboard.md](./14-pages-dashboard.md) (page settings)

### "Quel schéma DB utilise-t-on ?"
→ [16-database-schema.md](./16-database-schema.md)

### "Comment le PDF Ultra est généré ?"
→ [09-pdf.md](./09-pdf.md) (render-ultra.ts + styles.ts) + [12-api-others.md](./12-api-others.md) (/api/audit/pdf)

### "Détection de domaine parqué ?"
→ [08-siteaudit.md](./08-siteaudit.md) (crawler.ts : `assertNotParkedDomain()`)

### "Validation des artefacts LLM Watch ?"
→ [04-llmwatch.md](./04-llmwatch.md) (validation.ts)

---

## 📊 Statistiques

```
Total            : 16 fichiers .md, ~1.0 Mo, 28 904 lignes
Fichier source   : 149 fichiers TS/TSX
Backend          : 50+ API endpoints
Tables DB        : 28 tables + 3 vues + 5 fonctions RPC
Criteria scorés  : 205 (7 thèmes)
LLMs monitorés   : 4 (OpenAI + Anthropic + Perplexity + Gemini)
Migrations DB    : 10 migrations appliquées
```

---

## 🔗 Liens

- **Github repo** : https://github.com/jeromedeshaie-blip/mcva-audit
- **Vercel prod** : https://mcva-audit.vercel.app
- **Supabase dashboard** : project `azgszqlhdhzcaofvixqi`
- **Master plan** : [MCVA-AUDIT-v2.1-MASTER-PLAN.md](../MCVA-AUDIT-v2.1-MASTER-PLAN.md)

---

*Généré 2026-04-23 depuis le tag `v2.1-release`. Pour régénérer après modifications : `bash /tmp/build_docs.sh`.*
