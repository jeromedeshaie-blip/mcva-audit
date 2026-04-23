# MCVA Audit v2.1 — Master Plan Phase 2

**Version** : 1.0
**Date** : 2026-04-23
**Statut** : En cours d'exécution
**Base méthodologique** : [POLE-PERFORMANCE.md v2.1](../Downloads/POLE-PERFORMANCE.md)
**Branch** : `main` (travail direct, tags par phase)

> Plan d'évolution de la plateforme MCVA Audit pour produire des audits de qualité
> professionnelle sans dépendance à des solutions payantes (Semrush retiré).
> Fondation : POLE-PERFORMANCE v2.1. Stack : Next.js/Vercel + Supabase + LLM Watch v2.

---

## Contexte

- **v2.0 (08.04.2026)** : 205 critères, 7 thèmes, 5 niveaux qualité, LLM Watch v1 → v2.
- **v2.1 (23.04.2026)** : Semrush retiré (indisponible avril 2026), stack alternatif gratuit (AWT, GSC, GA4, Moz, SimilarWeb, Seobility, Ubersuggest, Keyword Planner).
- **Contraintes infrastructure** :
  - Vercel Hobby (60s max function duration) — upgrade Pro optionnel en fin de phase
  - Supabase Free tier actuel
  - Budget zéro dépendance payante
- **État actuel du code** :
  - Phase 1B (LLM Watch v2) livré et taggé `v1.0-llmwatch-phase-1b` (2026-04-08)
  - Phase 1C (fix runtime score upsert) RPC déployé en commit `29a996e`, en observation

---

## Phase 2A — Alignement méthodologique v2.1 (2-3j)

**Objectif** : Fondations partagées — constantes, versioning, fix batching.

### Tâches

1. **Constantes partagées** (`src/lib/scoring/constants.ts`)
   - Poids des 7 thèmes globaux (seo 20 %, geo 25 %, perf 12 %, a11y 12 %, tech 8 %, contenu 15 %, rgesn 8 %)
   - Poids des 8 dimensions CORE-EEAT (C/O 15 %, R/E 10 %, Exp/Ept 15 %, A/T 10 %)
   - Poids des 4 dimensions CITE (25 % chacune)
   - Seuils Score GEO™ (0-25 / 26-50 / 51-75 / 76-100) avec labels "Invisible/Émergent/Visible/Leader"
   - Export type `AuditTheme`, `CoreEeatDimension`, `CiteDimension`
2. **SCORING_VERSION = "2.1"** — ajouté à chaque score inséré dans `audit_items` et `audit_scores`
3. **Fix batching Ultra** (`nouveau-audit/page.tsx`, `audit-complet/page.tsx`)
   - Hobby : batches de 2 dimensions/call (4 batches pour CORE-EEAT, 2 batches pour CITE)
   - Mise à jour du commentaire frontend
   - Retry automatique sur 504/502 (déjà partiellement codé, à compléter)
4. **Purge Semrush** — grep `semrush|Semrush` dans tout le code, UI, types, commentaires → remplace par "Imports externes" ou suppression

### Livrable

- Commit `feat(scoring): align with POLE-PERFORMANCE v2.1 constants`
- Tag `v2.1-phase-2a`

---

## Phase 2F — Robustesse UX (2-3j)

**Objectif** : Fiabiliser l'existant avant d'ajouter des features.

### Tâches

1. **Détection domaine parqué** (`src/lib/siteaudit/crawler.ts`)
   - Patterns : `nameshift.com`, `sedo`, `godaddy`, `parked`, `domain-for-sale`
   - Si détecté : erreur bloquante avec message "Vérifier l'URL réelle"
2. **Validation artefacts LLM Watch** (`src/lib/llmwatch/validation.ts` nouveau)
   - Citation rate > 100 % → reject
   - Score > 100 ou < 0 → reject
   - Queries vides ou malformées → reject
   - Stocker dans `audit_log` comme bug backlog
3. **Retry auto 504/502** — harmoniser entre `nouveau-audit` et `audit-complet` (factoriser `fetchStep`)
4. **Mode dryrun** — vérifier que tous les scorers passent en mode mock quand `quality === "dryrun"`
5. **Mode eco** — vérifier utilisation Claude Haiku

### Livrable

- Commit `feat(robustness): parked domain detection + artifact validation`
- Tag `v2.1-phase-2f`

---

## Phase 2C — Wizard Audit Ultra 6 blocs (4-5j) ⭐⭐

**Objectif** : UI complète pour lancer un Ultra avec import structuré des 6 blocs A-F.

### Tâches

1. **Nouvelle route** `/audit-ultra/new/[step]` avec 7 étapes
   - `/1-config` — URL + secteur + concurrents
   - `/2-bloc-a` — AWT (CSV paste + parser)
   - `/3-bloc-b` — GSC (paste + parser)
   - `/4-bloc-c` — GA4 (paste + parser)
   - `/5-bloc-d` — Concurrents Moz + SimilarWeb + Seobility (form structuré)
   - `/6-bloc-e` — Keyword Planner CH (paste CSV)
   - `/7-bloc-f` — LLM Watch (auto-fetch si setup, sinon skip)
   - `/8-recap` — Mode complet / dégradé / bloqué
2. **Migration DB**
   - Table `audit_external_blocks(id, audit_id, bloc_letter, data_json, source_label, imported_at)`
   - RLS : service role full + authenticated read via audit_id
3. **Parseurs dédiés** (`src/lib/audit/parsers/`)
   - `parseAwtCsv.ts` — colonnes AWT standardisées
   - `parseGscPaste.ts` — détection auto (requête/clics/impressions/CTR/position)
   - `parseGa4Paste.ts` — sessions/utilisateurs/engagement
   - `parseKeywordPlanner.ts` — keyword/volume/concurrence
4. **Logique mode dégradé** (section 6.6 POLE-PERF)
   - 6/6 blocs → Ultra complet
   - A+B+F minimum → Ultra mode dégradé (mention explicite)
   - F seul → dégrade vers Audit thématique GEO
   - 0 bloc ou seulement crawl HTML → refuse Ultra, propose pré-audit
5. **Store Zustand ou URL state** pour persister les blocs entre étapes

### Livrable

- Commit `feat(audit-ultra): wizard 6 blocs + mode dégradé`
- Tag `v2.1-phase-2c`

---

## Phase 2D — Scoring enrichi avec blocs externes (3j)

**Objectif** : Les blocs A-F alimentent directement les scores et indiquent la source.

### Tâches

1. **Extension schéma scoring** — chaque `AuditItem` expose :
   ```typescript
   {
     score: number,
     source: "external_verified" | "html_estimation" | "not_evaluated",
     sourceLabel: string | null,  // ex: "AWT export 2026-04-23"
     confidenceLevel: "high" | "medium" | "low"
   }
   ```
2. **Mapping blocs → critères** (`src/lib/scoring/external-mapping.ts`)
   - Bloc A (AWT) → `CI-I01`, `CI-I02`, `CI-I03`, `CI-I04`, `R03`, `R04`
   - Bloc B (GSC) → `O01`, `O02`, `O03`, `E05` (positions, clics, impressions)
   - Bloc C (GA4) → `E01`, `E02`, `E04` (engagement, durée, conversions)
   - Bloc D (concurrents) → benchmark numérique (nouveau module)
   - Bloc E (Keyword Planner) → volumes CH pour cibles
   - Bloc F (LLM Watch) → Score GEO™ direct (4 composantes)
3. **Règle Score GEO™** (section 5 POLE-PERF)
   - Si bloc F présent → Score GEO™ = KPIs réels LLM Watch
   - Si bloc F absent → Score GEO™ = Score CITE estimé (mode dégradé, mention)
4. **UI affichage source** — badge "Données vérifiées" vs "Estimation HTML" sur chaque critère

### Livrable

- Commit `feat(scoring): enrich with external blocks A-F`
- Tag `v2.1-phase-2d`

---

## Phase 2E — PDF brandé v3.2 (4-5j)

**Objectif** : Livrable PDF conforme charte v3.2 "Gradient Identity System".

### Tâches

1. **Lecture skill `mcva-brand-identity`** (v3.2)
   - Tokens CSS exacts (couleurs, gradients, typographie)
   - Règles glassmorphism
   - Logo SVG 4 cubes + croix suisse
2. **Template HTML brandé** (`src/lib/pdf/templates/render-ultra-v3-2.ts`)
   - Typographie : General Sans (titres) + DM Sans (body) + DM Mono (data) via `<link>` ou self-hosted
   - Palette : spectre rouge strict (`#0E0E0E`, `#2A0E0E`, `#5C1A1A`, `#8B2C2C`, `#B04040`, `#F0E8E4`)
   - Gradients nommés (Abyss, Ember, Drift, Flare, Accent)
   - **Jamais de fond noir plat**
3. **Structure 25 pages** (section 10 POLE-PERF)
   - Couverture, TOC, Synthèse exécutive, Score global, 7 audits thématiques, Benchmark, Plan d'action 3 phases, Méthodologie, Conclusion
4. **Numérotation auto** — séquence PostgreSQL `audit_ultra_seq` → format `AUDIT-2026-001`
5. **Puppeteer render** — route `/api/audit-direct/pdf/[auditId]` → download blob

### Livrable

- Commit `feat(pdf): branded v3.2 Ultra template`
- Tag `v2.1-phase-2e`

---

## Phase 2B — OAuth GSC + GA4 (5-7j)

**Objectif** : Automatiser 2 des 6 blocs via APIs officielles gratuites.

*Reportée en fin de plan car :*
- *Phase 2C peut fonctionner sans (paste manuel)*
- *Config OAuth Google = prérequis non trivial*

### Tâches

1. **Google Cloud Project** + OAuth client credentials (scopes webmasters.readonly + analytics.readonly)
2. **Table `external_data_connections`** — token storage chiffré
3. **Endpoints**
   - `/api/integrations/google/authorize`
   - `/api/integrations/google/callback`
   - `/api/integrations/google/disconnect`
4. **Fetchers**
   - `src/lib/integrations/gsc.ts` — Search Analytics API
   - `src/lib/integrations/ga4.ts` — Analytics Data API
5. **Auto-populate wizard** — si connecté, blocs B et C sont pré-remplis
6. **Cache 24h** — stocker résultats pour éviter re-fetch

### Livrable

- Commit `feat(integrations): Google OAuth GSC + GA4 connectors`
- Tag `v2.1-phase-2b`

---

## Roadmap synthétique

| Semaine | Phase | Livrable |
|---|---|---|
| S1 | 2A + 2F | Fondations v2.1 + robustesse |
| S2-S3 | 2C | Wizard Ultra 6 blocs |
| S3 | 2D | Scoring enrichi |
| S4 | 2E | PDF v3.2 |
| S5 | 2B | OAuth GSC/GA4 |
| **Total** | **5 sem** | **Plateforme v2.1 complète** |

---

## Validation de sortie

Avant de déclarer Phase 2 "done" :

- [ ] Tous les commits taggés
- [ ] Un audit Ultra complet exécuté bout-en-bout sur un vrai client (MCVA ou FDM)
- [ ] PDF v3.2 généré et validé visuellement
- [ ] Score GEO™ reproductible (même input → même output à ±2 points)
- [ ] Mention "Sources : AWT + GSC + LLM Watch" dans le rapport
- [ ] Mode dégradé testé (3 blocs sur 6)
- [ ] Zéro mention Semrush dans le code
- [ ] `SCORING_VERSION = "2.1"` présent dans tous les scores nouveaux

---

*MCVA Consulting SA — Plan Phase 2 v1.0 — 2026-04-23*
*Executeur : Claude Code (autonomous mode)*
*Validateur : Jérôme Deshaie, CEO*
