# 16 — Database Schema (Supabase)

**Projet Supabase** : `azgszqlhdhzcaofvixqi`
**Version** : 2.1 (`v2.1-release`)
**Schema** : `public`

Schéma complet de la base Postgres (Supabase). Tables, colonnes, contraintes, vues, fonctions RPC, séquences.

---

## Tables publiques (28 tables + vues)

### Core audit

#### `audits`
Métadonnées audit : URL, secteur, type (pre_audit/full/ultra), statut, référence formatée `AUDIT-2026-NNN`.

```sql
id                uuid PK (uuid_generate_v4())
url               text NOT NULL
domain            text NOT NULL
sector            text
audit_type        audit_type NOT NULL  -- ENUM
status            audit_status NOT NULL DEFAULT 'pending'  -- ENUM
parent_audit_id   uuid REFERENCES audits(id) ON DELETE SET NULL
created_by        uuid REFERENCES users(id)
created_at        timestamptz NOT NULL DEFAULT now()
completed_at     timestamptz
scraped_html     text
brand_name       text
is_spa           boolean DEFAULT false
theme            audit_theme  -- ENUM (mono-theme audits)
themes           audit_theme[]  -- (multi-theme ultra)
reference        text  -- ex: "AUDIT-2026-001"
```

#### `audit_scores`
Agrégat des scores par thème + JSONB avec détails.

```sql
id                uuid PK
audit_id          uuid UNIQUE NOT NULL REFERENCES audits ON DELETE CASCADE
score_seo         int NOT NULL CHECK (0..100)
score_geo         int NOT NULL CHECK (0..100)
score_perf        int CHECK (0..100)
score_a11y        int CHECK (0..100)
score_rgesn       int CHECK (0..100)
score_tech        int CHECK (0..100)
score_contenu    int CHECK (0..100)
score_global      int CHECK (0..100)
score_core_eeat   jsonb NOT NULL DEFAULT '{}'
score_cite        jsonb NOT NULL DEFAULT '{}'
seo_provider      text NOT NULL DEFAULT 'free'
seo_data          jsonb NOT NULL DEFAULT '{}'
geo_provider      text NOT NULL DEFAULT 'direct_ai'
geo_data          jsonb NOT NULL DEFAULT '{}'
competitors       jsonb
perf_data         jsonb DEFAULT '{}'
a11y_data         jsonb DEFAULT '{}'
rgesn_data        jsonb DEFAULT '{}'
tech_data         jsonb DEFAULT '{}'
contenu_data      jsonb DEFAULT '{}'
scoring_version   text DEFAULT '2.1'  -- v2.1 addition
```

#### `audit_items`
205 critères scorés individuellement.

```sql
id                uuid PK
audit_id          uuid NOT NULL REFERENCES audits ON DELETE CASCADE
framework         audit_framework NOT NULL  -- ENUM core_eeat|cite|perf|a11y|rgesn|tech|contenu
dimension         varchar NOT NULL  -- C, O, R, E, Exp, Ept, A, T ou CWV, etc.
item_code         text NOT NULL
item_label        text NOT NULL
status            item_status NOT NULL  -- ENUM pass|partial|fail
score             int NOT NULL CHECK (0..100)
notes             text
is_geo_first      boolean NOT NULL DEFAULT false
is_express_item   boolean NOT NULL DEFAULT false
scoring_version   text DEFAULT '2.1'  -- v2.1 addition

UNIQUE (audit_id, item_code)
```

#### `audit_actions`
Plan d'action LLM-généré (P1-P4).

```sql
id                uuid PK
audit_id          uuid NOT NULL REFERENCES audits ON DELETE CASCADE
priority          action_priority NOT NULL  -- ENUM P1|P2|P3|P4
title             text NOT NULL
description       text NOT NULL
impact_points     numeric NOT NULL DEFAULT 0
effort            text NOT NULL
category          text NOT NULL
theme             varchar
kpi               text
```

#### `audit_external_blocks` ⭐ v2.1
Blocs A-F importés dans le Wizard Ultra.

```sql
id                uuid PK
audit_id          uuid NOT NULL REFERENCES audits ON DELETE CASCADE
bloc_letter       char(1) NOT NULL CHECK (IN ('A','B','C','D','E','F'))
bloc_name         text NOT NULL
data_json         jsonb NOT NULL DEFAULT '{}'
source_label      text  -- ex: "AWT export 2026-04-23"
raw_input         text  -- paste original de l'utilisateur
parse_errors      jsonb DEFAULT '[]'
imported_at       timestamptz NOT NULL DEFAULT now()
imported_by       uuid REFERENCES auth.users(id)

UNIQUE (audit_id, bloc_letter)
```

#### `audit_uploads` (legacy)
Uploads CSV Semrush/Qwairy. @deprecated depuis v2.1.

```sql
id                uuid PK
audit_id          uuid NOT NULL REFERENCES audits ON DELETE CASCADE
source            text NOT NULL CHECK (IN ('semrush','qwairy','pagespeed'))
file_name         text NOT NULL
file_type         text NOT NULL
file_size         int NOT NULL
parsed_data       jsonb DEFAULT '{}'
status            text NOT NULL DEFAULT 'pending' CHECK (pending|parsing|parsed|error)
error_message     text
uploaded_by       uuid NOT NULL REFERENCES users(id)
created_at        timestamptz NOT NULL DEFAULT now()
```

---

### LLM Watch (Phase 1B)

#### `llmwatch_clients`
```sql
id                      uuid PK
name                    text NOT NULL
sector                  text
location                text
plan                    text DEFAULT 'business'
contact_email           text NOT NULL
active                  boolean DEFAULT true
domain                  text
brand_keywords          text[] DEFAULT '{}'
monitoring_frequency    text NOT NULL DEFAULT 'monthly' CHECK (weekly|monthly|quarterly|manual)
last_monitored_at       timestamptz
default_run_level       text DEFAULT 'standard'
created_at, updated_at  timestamptz DEFAULT now()
```

#### `llmwatch_queries`
Prompts à tester, multilingue (fr/de/en).

```sql
id                uuid PK
client_id         uuid REFERENCES llmwatch_clients ON DELETE CASCADE
text_fr           text NOT NULL
text_de           text
text_en           text
active            boolean DEFAULT true
category          text DEFAULT 'local'
sort_order        int DEFAULT 0
```

#### `llmwatch_query_history`
Audit log des changements de queries (trigger `log_query_change`).

#### `llmwatch_competitors`
Concurrents à tracker dans les réponses LLM.

#### `llmwatch_competitor_scores`
Scores hebdo des concurrents.
```sql
UNIQUE (competitor_id, week_start)
```

#### `llmwatch_facts`
Knowledge base client pour validation Exactitude.
```sql
UNIQUE (client_id, fact_key)
```

#### `llmwatch_raw_results`
Réponses LLM brutes + méta-données judge.

```sql
id                      uuid PK
client_id               uuid REFERENCES llmwatch_clients ON DELETE CASCADE
query_id                uuid REFERENCES llmwatch_queries
llm                     text NOT NULL  -- openai|anthropic|perplexity|gemini
lang                    text NOT NULL  -- fr|de|en
response_raw            text
cited                   boolean DEFAULT false
rank                    int
snippet                 text
collected_at            timestamptz DEFAULT now()
is_recommended          boolean DEFAULT false
sentiment               text CHECK (positive|neutral|negative)
sentiment_score         numeric DEFAULT 0  -- -1 à +1
competitor_mentions     text[] DEFAULT '{}'
citation_sources        text[] DEFAULT '{}'
tokens_used             int
latency_ms              int
cost_usd                numeric DEFAULT 0
model_version           text
```

#### `llmwatch_scores` ⭐ Score GEO™
Snapshot hebdomadaire du Score GEO™ (4 composantes + agrégat).

```sql
id                      uuid PK
client_id               uuid REFERENCES llmwatch_clients ON DELETE CASCADE
week_start              date NOT NULL
score                   numeric NOT NULL  -- Score GEO™ global /100
score_by_llm            jsonb  -- {openai:80, anthropic:75, ...}
score_by_lang           jsonb  -- {fr:78, de:65, en:72}
citation_rate           numeric
score_presence          numeric  /25
score_exactitude        numeric  /25
score_sentiment         numeric  /25
score_recommendation    numeric  /25
total_responses         int
total_cost_usd          numeric
duration_ms             int
model_snapshot_version  text  -- ex: "2026-04-08"
models_used             jsonb  -- {openai: "gpt-4o-2024-11-20", ...}
run_level               text  -- eco|standard|premium|ultra
run_count               int DEFAULT 1
score_stddev            numeric  -- pour multi-runs ultra
created_at              timestamptz DEFAULT now()

UNIQUE (client_id, week_start)  -- ⚠ key constraint → RPC upsert_weekly_score
```

#### `llmwatch_alerts`, `llmwatch_recommendations`, `llmwatch_reports`
Alertes, recommandations auto, PDFs générés.

```sql
-- llmwatch_recommendations
UNIQUE (client_id, week_start, title)

-- llmwatch_reports
UNIQUE (client_id, period)
```

---

### Intégrations OAuth (Phase 2B v2.1)

#### `external_data_connections`
OAuth tokens GSC/GA4 par utilisateur.

```sql
id                uuid PK
user_id           uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE
provider          text NOT NULL CHECK (google_gsc|google_ga4)
access_token      text NOT NULL
refresh_token     text
expires_at        timestamptz
scope             text
account_email     text
connected_at      timestamptz NOT NULL DEFAULT now()
last_used_at      timestamptz

UNIQUE (user_id, provider)
```

#### `external_data_cache`
Cache 24h des fetches GSC/GA4.

```sql
id                uuid PK
user_id           uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE
provider          text NOT NULL
domain            text NOT NULL  -- clé cache (siteUrl|monthsBack OU propertyId|monthsBack)
data_json         jsonb NOT NULL
fetched_at        timestamptz NOT NULL DEFAULT now()
expires_at        timestamptz NOT NULL DEFAULT now() + 24h

UNIQUE (user_id, provider, domain)
```

---

### Benchmark & Classements

#### `benchmarks`
```sql
id                  uuid PK
name                text NOT NULL
sub_category        text NOT NULL
geographic_scope    text NOT NULL DEFAULT 'suisse'
status              text NOT NULL DEFAULT 'draft' CHECK (draft|running|completed|error)
domains_count       int NOT NULL DEFAULT 0
completed_count     int NOT NULL DEFAULT 0
created_by          uuid NOT NULL REFERENCES users(id)
created_at          timestamptz NOT NULL DEFAULT now()
completed_at        timestamptz
```

#### `benchmark_domains`
```sql
benchmark_id      uuid REFERENCES benchmarks ON DELETE CASCADE
audit_id          uuid REFERENCES audits ON DELETE SET NULL
domain            text NOT NULL
url               text NOT NULL
rank_seo, rank_geo, score_seo, score_geo  int

UNIQUE (benchmark_id, domain)
```

#### `sector_rankings`
```sql
sector            text NOT NULL
domain            text NOT NULL
score_seo         int NOT NULL CHECK (0..100)
score_geo         int NOT NULL CHECK (0..100)
rank_seo, rank_geo  int NOT NULL
week_of           date NOT NULL
created_at        timestamptz NOT NULL DEFAULT now()

UNIQUE (sector, domain, week_of)
```

---

### Misc

#### `leads`
Capture lead pré-audit gratuit.

#### `siteaudit_results`
Résultats audit tech (crawler + checks).

#### `users`
Utilisateurs métier (miroir `auth.users`).

---

## Vues

### `audit_ultra_readiness` ⭐ v2.1
Calcule automatiquement le mode Ultra (full/degraded/geo_only/blocked) selon les blocs importés.

```sql
-- Pour chaque audit Ultra :
audit_id, url, status,
imported_blocks    text[]  -- ex: ['A','B','F']
blocks_count       bigint
has_a, has_b, has_c, has_d, has_e, has_f  boolean
ultra_mode         text  -- 'full' | 'degraded' | 'geo_only' | 'blocked'
```

Logique :
- 6/6 → `full`
- A+B+F (min) → `degraded`
- F seul → `geo_only`
- Autre → `blocked`

### `latest_llm_breakdown`, `geo_score_evolution`
Vues matérialisées pour le dashboard LLM Watch.

---

## Fonctions RPC

### `upsert_weekly_score(...)` → jsonb
Atomic `INSERT ... ON CONFLICT (client_id, week_start) DO UPDATE` sur `llmwatch_scores`. Utilisé par `finalize-score` pour éviter les race conditions de même semaine.

```sql
CREATE OR REPLACE FUNCTION upsert_weekly_score(
  p_client_id uuid,
  p_week_start date,
  p_score numeric,
  p_score_by_llm jsonb,
  p_score_by_lang jsonb,
  p_citation_rate numeric,
  p_score_presence numeric,
  p_score_exactitude numeric,
  p_score_sentiment numeric,
  p_score_recommendation numeric,
  p_total_responses int,
  p_total_cost_usd numeric,
  p_duration_ms int,
  p_model_snapshot_version text,
  p_models_used jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$...$$
```

### `generate_audit_reference_v2_1(audit_type, year)` → text ⭐ v2.1
Génère un numéro de référence formaté :
- `pre_audit|express` → `PRE-2026-001`
- `full` → `THEMA-2026-001`
- `ultra` → `AUDIT-2026-001`

Utilise la séquence `audit_ultra_seq`.

### `handle_new_user()` (trigger)
Insère une ligne dans `public.users` à la création d'un utilisateur `auth.users`.

### `log_query_change()` (trigger)
Log automatique des modifications de `llmwatch_queries` dans `llmwatch_query_history`.

---

## Séquences

- `audit_ultra_seq` — incrémente les références `PRE/THEMA/AUDIT-YYYY-NNN`

---

## ENUMs

```sql
audit_type       :: pre_audit | express | full | ultra
audit_status     :: pending | processing | completed | error
audit_theme      :: seo | geo | perf | a11y | rgesn | tech | contenu
audit_framework  :: core_eeat | cite | perf | a11y | rgesn | tech | contenu
item_status      :: pass | partial | fail
action_priority  :: P1 | P2 | P3 | P4
user_role        :: analyst | bizdev | admin
```

---

## Contraintes CHECK importantes

- `audit_items.score` ∈ [0, 100]
- `audit_scores.score_*` ∈ [0, 100] (ou NULL)
- `sector_rankings.score_seo|geo` ∈ [0, 100]
- `llmwatch_raw_results.sentiment` ∈ {positive, neutral, negative}
- `audit_external_blocks.bloc_letter` ∈ {A, B, C, D, E, F}
- `external_data_connections.provider` ∈ {google_gsc, google_ga4}

---

## RLS Policies (policies globales par pattern)

Toutes les tables sensibles ont RLS activée avec ces policies :

```sql
-- Pattern standard
CREATE POLICY "Auth read <table>" ON <table>
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full <table>" ON <table>
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Exception pour `external_data_connections` + `external_data_cache` :
```sql
CREATE POLICY "Users see own <table>" ON <table>
  FOR SELECT TO authenticated USING (user_id = auth.uid());
```

---

## Indexes critiques

```sql
-- Performance queries
idx_audit_scores_scoring_version    -- filtrage par version
idx_audit_items_scoring_version
idx_audit_external_blocks_audit
idx_audit_external_blocks_bloc
idx_external_connections_user
idx_external_cache_expiry
```

---

## Migrations appliquées (via MCP Supabase)

Ordre chronologique (non stockées en fichiers `.sql` dans le repo — historique dans dashboard) :

1. `20260408_add_model_snapshot` — LLM Watch v2 metadata
2. `20260408_run_levels` — run_level/run_count/score_stddev
3. `20260408_facts_table` — llmwatch_facts
4. `20260408_query_history` — audit log queries + trigger
5. `20260408_remove_cite_orphans` — DROP columns CITE obsolètes
6. `audit_scoring_version_v2_1` — colonnes scoring_version
7. `audit_external_blocks_v2_1` — table blocs A-F + view readiness
8. `upsert_weekly_score_function` — RPC atomique
9. `audit_reference_sequence_v2_1_v2` — séquence + RPC
10. `external_data_connections_v2_1` — OAuth tokens + cache

---

*Schema dump généré depuis information_schema le 2026-04-23.*
