# MCVA Chantier — Master Plan pour Claude Code

**Version** : 1.0
**Date** : 2026-04-08
**Owner** : Jérôme Deshaie, CEO MCVA Consulting SA
**Repo** : `~/Projects/mcva-audit` (GitHub: `jeromedeshaie-blip/mcva-audit`)

---

## 🎯 Comment Claude Code doit utiliser ce fichier

Ce fichier est le **point d'entrée unique** du chantier de refonte du framework d'audit MCVA. Il décrit :
- L'état actuel du repo
- Les décisions stratégiques prises avec Jérôme
- Les phases du chantier dans l'ordre
- Les fichiers de spec à lire pour chaque phase
- Les points où Claude Code doit **s'arrêter et demander validation**

**Prompt d'amorçage recommandé pour Claude Code** :

```
Read MCVA-CHANTIER-MASTER-PLAN.md from project root.
Follow the phases in order: Phase 1 first, then Phase 2 (only after Jérôme validates Phase 1).

For each task in a phase:
1. Read the spec file referenced
2. Apply changes as specified
3. Run the validation steps
4. Stop and report to Jérôme before moving to the next task
5. Wait for explicit "continue" from Jérôme

Critical rules:
- NEVER skip validation steps
- NEVER batch multiple P0 tasks before reporting
- NEVER apply DROP/DELETE migrations without explicit confirmation
- ALWAYS run npm run typecheck after code changes
- ALWAYS test the dev server (npm run dev) before declaring a task complete

Start by giving Jérôme a status overview of what's already done and what's the next action.
```

---

## 📂 Fichiers de spec disponibles

Tous ces fichiers doivent être présents à la racine du repo `~/Projects/mcva-audit/` :

| Fichier | Statut | Contenu | Utilisé en |
|---|---|---|---|
| `MCVA-CHANTIER-MASTER-PLAN.md` | ✅ Ce fichier | Roadmap du chantier | Phases 1-2-3 |
| `MCVA-LLMWATCH-v2-refactor.md` | ✅ Prêt | 11 tâches de refactoring LLM Watch v1 → v2 | Phase 1 |
| `MCVA-POLE-PERFORMANCE-v2.0.md` | ✅ Prêt | Nouveau prompt système Pôle Performance pour Claude.ai | Phase 1 (install manuel par Jérôme dans son projet Claude.ai) |
| `MCVA-AUDIT-FRAMEWORK-v2.0.md` | ✅ Prêt | Référentiel des 185 critères du framework v2 | Référence (Phase 2) |
| `MCVA-AUDIT-FRAMEWORK-v2.0-LOT2A-mesures-instrumentees.md` | ✅ Prêt | Spec technique des 79 critères instrumentés (PSI, axe-core, SSL Labs, etc.) | Référence (Phase 2) |
| `MCVA-AUDIT-FRAMEWORK-v2.0-LOT2B-mesures-mixtes.md` | ⏳ TBD | Spec des 106 critères restants (SEO/GEO/CONT) | Phase 2 (à produire avant) |
| `MCVA-AUDIT-FRAMEWORK-v2.0-LOT4-supabase-schema.md` | ⏳ TBD | Migrations Supabase pour le framework v2 | Phase 2 (à produire avant) |
| `MCVA-AUDIT-FRAMEWORK-v2.0-LOT6-engine-spec.md` | ⏳ TBD | Spec du moteur de mesure (orchestrateur Node + runners) | Phase 2 (à produire avant) |

**Si un fichier marqué "⏳ TBD" est nécessaire mais absent**, Claude Code doit avertir Jérôme : *"Ce fichier n'existe pas encore, il faut que tu reviennes vers moi (Claude conversation) pour que je le produise avant que tu continues."*

---

## 📊 État actuel du repo (au 2026-04-08)

### Ce qui existe et fonctionne en prod

| Composant | Statut | Localisation | Commentaire |
|---|---|---|---|
| **LLM Watch v1** | ✅ Vivant | `src/lib/llmwatch/`, `src/lib/scoring-engine.ts`, `src/lib/llm-providers.ts`, `src/lib/monitor.ts`, `src/app/api/llmwatch/`, `src/app/(dashboard)/llmwatch/` | Utilisé en prod sur Vercel pour les clients pilotes. Voir https://mcva-audit.vercel.app/llmwatch/dashboard/[clientId] |
| **Pôle Performance dans Claude.ai** | ✅ Vivant | Projet Claude.ai séparé "Audit Ultra" | C'est le vrai outil quotidien d'audit de Jérôme |
| **Inngest orchestration** | ✅ Vivant | `src/lib/inngest/`, `src/app/api/inngest/route.ts` | Utilisé pour les jobs longs (LLM Watch + audit framework) |

### Ce qui existe mais qui DORT (option γ : on garde, on n'utilise pas pour l'instant)

| Composant | Statut | Localisation | Décision |
|---|---|---|---|
| **Framework Audit v2 (scoring/)** | 💤 Dormant | `src/lib/scoring/`, `src/types/audit.ts`, `src/lib/constants.ts` | À reprendre en Phase 2. 205 critères déjà définis, mais scoring LLM-only à instrumenter. |
| **`audit-direct/` endpoints** | 💤 Dormant | `src/app/api/audit-direct/` | Workflow alternatif step-by-step. À auditer en Phase 2 (garder ou supprimer). |
| **`siteaudit/` (instrumentation)** | 💤 Dormant | `src/lib/siteaudit/` | Contient déjà PageSpeed API, crawler, readability. À récupérer en Phase 2 pour brancher au scoring. |
| **`audit/` legacy** | 💤 Dormant | `src/app/api/audit/` | Statut incertain. À auditer en Phase 2. |
| **Pages dashboard audit** | 💤 Dormant | `src/app/(dashboard)/nouveau-audit/`, `audit-express/`, `audit-complet/`, `siteaudit/`, `benchmarks/`, `classements/` | Pas utilisées par Jérôme actuellement. À reprendre en Phase 2 si on construit le dashboard web. |

**Règle pour Claude Code en Phase 1** : NE PAS toucher au code dormant. Se concentrer uniquement sur LLM Watch.

---

## 🗺️ Vue d'ensemble du chantier

```
PHASE 1 — URGENT (1-2 semaines)
├── Phase 1A : Install Pôle Performance v2.0 dans Claude.ai (Jérôme, ~30 min)
└── Phase 1B : Refactoring LLM Watch v2 dans Claude Code (1-2 jours)

PHASE 2 — DASHBOARD NEXT.JS (plus tard, 2-4 semaines après Phase 1)
├── Phase 2A : Décision archi (quel système d'audit on garde/supprime)
├── Phase 2B : Production des specs Lots 2B, 4, 6, 7, 8 (par Claude conversation)
├── Phase 2C : Refactoring scorer.ts vers instrumenté
├── Phase 2D : Mise à jour PDF templates v3.2
└── Phase 2E : Audit pilote bout-en-bout

PHASE 3 — STABILISATION (optionnel)
└── Tests, documentation, déploiement public
```

**Phase 1 = OBLIGATOIRE et URGENTE.**
**Phase 2 = optionnelle, à attaquer quand Phase 1 est validée et que Jérôme a du temps.**

---

# PHASE 1 — Refactoring LLM Watch v2 + Install Pôle Performance

## Phase 1A — Install Pôle Performance v2.0 dans Claude.ai

**Acteur** : Jérôme uniquement (Claude Code n'intervient PAS)
**Durée** : ~30 min
**Statut** : à faire en parallèle de Phase 1B

### Procédure

1. Jérôme va dans son projet Claude.ai "Audit Ultra"
2. Il vérifie si l'ancien fichier `PROJET-AUDIT-ULTRA-instructions.md` est dans les "Project files"
3. Si oui, il le **supprime** ou le **renomme** en `_archive_PROJET-AUDIT-ULTRA-instructions.md`
4. Il **ajoute** le nouveau fichier `MCVA-POLE-PERFORMANCE-v2.0.md`
5. Il démarre une nouvelle conversation dans le projet et teste avec : *"Pré-audit pour mcva.ch"*
6. Si l'agent répond en suivant la nouvelle structure (205 critères, 5 niveaux qualité, références aux codes C01-T10), c'est validé

**Important** : ce fichier (le master plan) ne concerne PAS le projet Claude.ai. Il est uniquement pour Claude Code dans le repo. Le pôle Performance vit dans son propre projet Claude.ai séparé.

## Phase 1B — Refactoring LLM Watch v2

**Acteur** : Claude Code dans le repo `~/Projects/mcva-audit`
**Spec à lire** : `MCVA-LLMWATCH-v2-refactor.md`
**Durée** : 1-2 jours (en plusieurs sessions de validation)
**Branche git** : `llmwatch-v2-refactor` (à créer si elle n'existe pas)

### Setup

```bash
cd ~/Projects/mcva-audit
git status                                        # vérifier working tree clean
git checkout main && git pull
git checkout -b llmwatch-v2-refactor 2>/dev/null || git checkout llmwatch-v2-refactor
```

### Tâches à exécuter (dans cet ordre)

| # | Tâche | Priorité | Effort | Validation requise |
|---|---|---|---|---|
| **1** | Pin LLM model snapshots | P0 | 15 min | ✋ STOP après |
| **2** | Add `model_snapshot` columns + migration SQL | P0 | 30 min | ✋ STOP après (Jérôme doit appliquer la migration manuellement dans Supabase) |
| **3** | Replace naive sentiment with LLM-as-judge | P0 | 2-3 h | ✋ STOP après (gros changement, test sur 1 client) |
| **4** | Add Light/Standard/Gold run levels | P0 | 1.5 h | ✋ STOP après (migration SQL à appliquer manuellement) |
| **5** | Tokenize brand mention detection | P0 | 30 min | ✋ STOP après |
| **6** | Knowledge base table for facts | P1 | 1.5 h | ✋ STOP après (migration SQL) |
| **7** | Wire multilingue FR/DE/EN | P1 | 45 min | ✋ STOP après |
| **8** | Wire competitors from DB (couvert par T3) | P1 | 0 | Validation rapide |
| **9** | Decide fate of orphan CITE components | P1 | 15 min | ⚠️ DEMANDER À JÉRÔME avant tout DROP de colonnes |
| **10** | Audit log of query changes | P2 | 30 min | Validation rapide |
| **11** | Verify Vercel cron / Inngest schedule | P2 | 15 min | ⚠️ Vérifier que l'orchestration Inngest existe déjà — si oui, adapter au lieu de créer un cron Vercel |

### Procédure pour chaque tâche

```
1. Lire la section correspondante dans MCVA-LLMWATCH-v2-refactor.md
2. Lister à Jérôme les fichiers qui vont être modifiés
3. Appliquer les changements EXACTEMENT comme spécifié
4. Lancer `npm run typecheck` — doit passer
5. Si la tâche inclut une migration SQL, donner le SQL à Jérôme et lui demander de l'appliquer dans Supabase SQL Editor AVANT de continuer
6. Si la tâche modifie le scoring, lancer un test rapide sur un client de test
7. Reporter à Jérôme : "Tâche X terminée, voici ce qui a été fait, voici les résultats du typecheck. Continuer ?"
8. Attendre "continue" ou "go P1" ou similaire AVANT de passer à la suivante
```

### Important : adaptations pour Inngest

**ATTENTION** : Le repo utilise Inngest (`src/lib/inngest/functions.ts`) pour orchestrer les jobs longs, PAS Vercel cron. La Task 11 du fichier `MCVA-LLMWATCH-v2-refactor.md` parle de cron Vercel — c'est une erreur historique.

**Adaptation correcte pour la Task 11** :
- Vérifier si une fonction Inngest schedulée existe pour LLM Watch (`runMonitoringScheduled` ou similaire dans `src/lib/inngest/functions.ts`)
- Si oui : adapter pour appeler `runMonitoring` avec les nouveaux niveaux Light/Standard/Gold
- Si non : créer une fonction Inngest schedulée (pas un cron Vercel)
- Référence Inngest : https://www.inngest.com/docs/guides/scheduled-functions

**Format Inngest scheduled** :
```typescript
export const llmwatchWeeklyMonitor = inngest.createFunction(
  { id: "llmwatch-weekly-monitor", name: "LLM Watch Weekly Monitor" },
  { cron: "0 6 * * 1" }, // Lundi 06:00 UTC
  async ({ step }) => {
    // ... appeler runAllMonitoring() ...
  }
);
```

### Validation finale Phase 1B

Une fois les 11 tâches terminées, Claude Code doit :

1. Lancer un test complet : créer un client de test "MCVA Test" dans LLM Watch, ajouter 3 queries, lancer un monitoring en mode `standard`
2. Vérifier que le résultat dans Supabase contient :
   - `model_snapshot_version` rempli
   - `score_stddev` calculé (non nul)
   - `judge_reasoning` rempli pour chaque réponse
   - Pas d'erreurs dans les logs Inngest
3. Reporter à Jérôme : "Phase 1B terminée. Voici le client de test, voici le score, voici les diagnostics. Tu peux maintenant : (a) merger en main, (b) faire des tests supplémentaires, (c) revenir vers Claude conversation pour la Phase 2."

---

# PHASE 2 — Dashboard Next.js v2 (PLUS TARD)

**À attaquer uniquement après que la Phase 1 est validée et mergée en main.**

**Pré-requis** : Jérôme doit revenir vers Claude conversation pour produire les fichiers de spec manquants :
- `MCVA-AUDIT-FRAMEWORK-v2.0-LOT2B-mesures-mixtes.md`
- `MCVA-AUDIT-FRAMEWORK-v2.0-LOT4-supabase-schema.md`
- `MCVA-AUDIT-FRAMEWORK-v2.0-LOT6-engine-spec.md`

**Si Claude Code arrive ici sans ces fichiers**, il doit dire à Jérôme : *"Phase 2 nécessite les specs Lot 2B, Lot 4, Lot 6 qui n'ont pas encore été produites. Reviens vers Claude conversation pour les générer avant qu'on continue."*

## Phase 2A — Décision archi (30 min ensemble)

**Question à trancher avec Jérôme** :

Le repo contient 4 systèmes d'audit qui coexistent :

1. **`scoring/` + `inngest/functions.ts`** : framework v2 avec 205 critères, scoring LLM-only
2. **`audit-direct/`** : workflow alternatif step-by-step
3. **`siteaudit/`** : instrumentation embryonnaire (PageSpeed API, crawler, readability)
4. **`audit/`** : legacy

**Recommandation** :
- Garder système 1 comme colonne vertébrale
- Récupérer système 3 pour l'instrumentation
- Auditer et probablement supprimer systèmes 2 et 4

**Action Claude Code** : présenter cette analyse à Jérôme et demander confirmation avant de toucher quoi que ce soit.

## Phase 2B — Refactoring scorer.ts vers instrumenté

**Spec à lire** : `MCVA-AUDIT-FRAMEWORK-v2.0-LOT2A-mesures-instrumentees.md` (déjà existant) + `MCVA-AUDIT-FRAMEWORK-v2.0-LOT2B-mesures-mixtes.md` (à produire)

**Objectif** : remplacer le scorer LLM-only par un orchestrateur qui appelle :
- PageSpeed Insights API pour PERF
- axe-core pour A11Y
- SSL Labs + securityheaders.com + dig pour TECH
- EcoIndex + Website Carbon pour RGESN
- Wappalyzer pour TECH/ECO
- LLM-as-judge pour les critères qualitatifs uniquement (Exp, Ept, A, contenu original, etc.)

**Architecture cible** :
```
src/lib/audit-engine/
├── orchestrator.ts
├── runners/
│   ├── psi-runner.ts
│   ├── axe-runner.ts
│   ├── ssl-labs-runner.ts
│   ├── headers-runner.ts
│   ├── dns-runner.ts
│   ├── ecoindex-runner.ts
│   ├── carbon-runner.ts
│   ├── wappalyzer-runner.ts
│   └── llm-judge-runner.ts
└── measurements/
    ├── perf/
    ├── a11y/
    ├── tech/
    ├── eco/
    ├── seo/
    ├── geo/
    └── contenu/
```

**Estimation** : 3-5 jours de travail Claude Code en plusieurs sessions.

## Phase 2C — Mise à jour PDF templates v3.2

**Spec à lire** : `MCVA-AUDIT-FRAMEWORK-v2.0-LOT8-pdf-templates.md` (à produire)

**Objectif** : aligner les 4 templates PDF existants (`render-pre-audit.ts`, `render-ultra.ts`, `render-llmwatch.ts`, `render.ts`) sur la charte MCVA v3.2 "Gradient Identity System".

**Référence brand** : `/mnt/skills/user/mcva-brand-identity/SKILL.md` côté Claude.ai (à transposer en CSS dans le repo Next.js).

**Estimation** : 1-2 jours.

## Phase 2D — Audit pilote bout-en-bout

**Action** : lancer un audit ultra complet sur un site test (ex: mcva.ch) et vérifier :
- Toutes les mesures instrumentées remontent
- Le scoring est reproductible
- Le PDF brandé v3.2 est généré
- Le dashboard affiche correctement les résultats

**Estimation** : 2 h.

---

# PHASE 3 — Stabilisation (optionnel)

Si Phase 2 réussie, optionnellement :
- Tests automatisés sur les runners
- Documentation pour onboarding nouvel utilisateur
- Déploiement public si dashboard partagé client souhaité

---

# 📋 Décisions stratégiques actées (à respecter par Claude Code)

| # | Décision | Choix | Conséquence |
|---|---|---|---|
| 1 | Hébergement | Vercel free + Supabase free | Limites raisonnables, pas de coût récurrent |
| 2 | Scheduling jobs longs | **Inngest** (déjà en place) | PAS de cron Vercel |
| 3 | Auth utilisateurs | Mono-utilisateur (Jérôme) | Pas de multi-tenant pour l'instant |
| 4 | Exécution moteur audit | Local sur Mac + Inngest cloud | Pas de fonction Vercel longue durée |
| 5 | Stratégie globale | **Option γ** : garder Claude.ai + dashboard Next.js en parallèle | Plus de travail mais plus de flexibilité |
| 6 | Outil principal quotidien | **Claude.ai (projet Audit Ultra)** | Le dashboard Next.js est secondaire pour l'instant |
| 7 | LLM Watch | **Outil officiel MCVA**, pas Semrush AI Visibility | Différenciation commerciale préservée |
| 8 | Semrush | Plan gratuit, **export CSV manuel** | Pas d'API tant que < 3 audits ultra/mois |
| 9 | Modèles LLM | **Pinned snapshots** (gpt-4o-2024-11-20, claude-sonnet-4-5-20250929, etc.) | Reproductibilité |
| 10 | Niveaux qualité | **5 niveaux** (eco/standard/premium/ultra/dryrun) du repo, PAS les 3 Light/Standard/Gold initiaux | Plus fin que la proposition initiale |

---

# 🚨 Points d'attention CRITIQUES pour Claude Code

## Ce que Claude Code NE DOIT JAMAIS faire sans demander explicitement

1. ❌ **Appliquer une migration SQL avec DROP COLUMN** sans confirmation explicite de Jérôme
2. ❌ **Supprimer du code** dans `src/lib/scoring/`, `src/app/api/audit-direct/`, `src/lib/siteaudit/`, `src/app/api/audit/` (code dormant en option γ)
3. ❌ **Modifier le code LLM Watch v1** sans avoir lu et compris la tâche correspondante dans `MCVA-LLMWATCH-v2-refactor.md`
4. ❌ **Toucher à `.env.local`** ou aux clés API
5. ❌ **Push directement sur main** — toujours travailler dans la branche `llmwatch-v2-refactor` (ou nouvelle branche)
6. ❌ **Lancer plus d'une tâche P0 avant validation** — toujours attendre le "continue" de Jérôme

## Ce que Claude Code DOIT toujours faire

1. ✅ **Lire le fichier de spec** avant chaque tâche
2. ✅ **Lancer `npm run typecheck`** après chaque modification de code TypeScript
3. ✅ **Reporter clairement** ce qui a été fait, avec liste des fichiers modifiés
4. ✅ **Attendre validation** entre chaque tâche P0
5. ✅ **Détecter les divergences** entre la spec et la réalité du code (ex: noms de fichiers différents, fonctions déjà existantes) et les signaler avant d'agir
6. ✅ **Préserver le code dormant** des systèmes 2/3/4 (audit-direct, siteaudit, audit)

---

# 📞 Quand revenir vers Claude conversation

Claude Code doit demander à Jérôme de revenir dans la conversation Claude principale dans ces cas :

1. **Spec manquante** : un fichier `MCVA-AUDIT-FRAMEWORK-v2.0-LOT*.md` est référencé mais n'existe pas
2. **Décision non prévue** : une situation non couverte par le master plan (ex: migration de données, conflit d'architecture)
3. **Fin de Phase 1** : Phase 1 terminée et validée, prêt à attaquer Phase 2 → Jérôme doit revenir pour produire les specs Lot 2B / Lot 4 / Lot 6
4. **Bug bloquant** : impossible de continuer une tâche, besoin d'aide
5. **Discovery majeure** : Claude Code découvre quelque chose dans le repo qui contredit le master plan

---

# 🎬 Premier run — Démarrage

Quand Jérôme lance Claude Code la première fois avec ce master plan, Claude Code doit :

1. Lire ce fichier en entier
2. Vérifier la présence des autres fichiers de spec à la racine du repo
3. Lancer `git status` et `git branch --show-current` pour connaître l'état git
4. Vérifier que la branche `llmwatch-v2-refactor` existe ou peut être créée
5. **Reporter à Jérôme** :
   - "Master plan lu. Voici l'état du repo."
   - "Voici les fichiers de spec présents : [liste]"
   - "Voici les fichiers de spec manquants pour les phases ultérieures : [liste]"
   - "Branche actuelle : X. Branche cible pour Phase 1 : llmwatch-v2-refactor"
   - "Prochaine action proposée : démarrer Phase 1B Task 1 (Pin model snapshots, ~15 min). Confirmer ?"
6. **Attendre confirmation** avant de commencer Task 1

---

# 📝 Changelog du master plan

| Version | Date | Modifications |
|---|---|---|
| 1.0 | 2026-04-08 | Création initiale après analyse complète du repo et décisions stratégiques avec Jérôme |

---

*MCVA Consulting SA — Chantier Framework v2 — Master Plan v1.0*
*Document confidentiel — À utiliser exclusivement avec Claude Code dans le repo `mcva-audit`*
*Pour toute question hors scope : revenir vers Claude conversation principale*
