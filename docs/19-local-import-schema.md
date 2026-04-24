# 19 — Schéma JSON LocalImportPayload

**Phase** : 3A v3 hybrid architecture
**Schema version** : `3.0`
**Endpoint** : `POST /api/audit-import/from-local`
**TS types** : [`src/types/local-import.ts`](../src/types/local-import.ts)

Documentation officielle du contrat JSON entre le crawler Mac Studio et l'API MCVA.

---

## Headers requis

```http
POST /api/audit-import/from-local
Content-Type: application/json
X-MCVA-Import-Key: mcva_live_xxxxxxxxxxxxxxxxxxxxxx
```

---

## Payload root

```jsonc
{
  "schema_version": "3.0",              // REQUIS — version du contrat
  "url": "https://exemple.ch",          // REQUIS — URL racine auditée
  "sector": "finance-fiduciaire",       // REQUIS — clé SECTOR_GROUPS
  "brand_name": "Exemple SA",           // OPT — auto-détecté sinon
  "audit_type": "ultra",                // REQUIS — pre_audit|express|full|ultra
  "quality": "premium",                 // REQUIS — eco|standard|premium|ultra|dryrun
  "themes": ["seo", "geo", "contenu"],  // OPT — tous si absent
  "pages": [ /* voir PageExtraction */ ],     // REQUIS — 1 à 20 pages
  "crawl_meta": { /* voir CrawlMetadata */ }  // REQUIS
}
```

### Champs acceptés pour `sector`

Clés disponibles : voir `src/lib/constants.ts::SECTOR_GROUPS`. Exemples :
- `finance-fiduciaire`
- `services-conseil`
- `tech-saas`
- `construction-archi`
- `sante-dentaire`
- `tourisme-hotel`
- etc. (15 groupes × 5 sous-secteurs = 75 valeurs)

### Valeurs `audit_type`

| Valeur | Description | Critères scorés |
|---|---|---|
| `pre_audit` | Audit gratuit / pré-commercial | ~55 items "express" |
| `express` | Alias de pre_audit | ~55 items |
| `full` | Audit thématique (1-3 thèmes) | 40-120 items |
| `ultra` | Audit complet 7 thèmes | 205 items |

### Valeurs `quality`

| Valeur | Modèle scoring | Coût indicatif |
|---|---|---|
| `eco` | Claude Haiku 4 | ~$0.03 |
| `standard` | Claude Sonnet 4.6 | ~$0.30 |
| `premium` | Claude Sonnet 4.6 | ~$0.50 |
| `ultra` | Claude Sonnet 4.6 + notes détaillées | ~$3.00 |
| `dryrun` | Mock (aucun LLM) | $0 |

---

## `PageExtraction` (par page)

```jsonc
{
  "url": "https://exemple.ch/contact",  // REQUIS — URL finale après redirect
  "is_homepage": false,                 // REQUIS — true pour la page racine
  "status_code": 200,                   // REQUIS — HTTP status
  "html_size_bytes": 45231,             // REQUIS — taille brute en bytes
  "html_hash": "a3f5b2...",             // REQUIS — SHA-256 hex du HTML complet
  "html_truncated": "<html>...</html>", // REQUIS — HTML tronqué ≤ 50000 chars (pour scoring cloud)
  "extracted": { /* voir Extracted */ } // REQUIS — données structurées Gemma
}
```

---

## `Extracted` (6 sections)

### 1. `technique`

```jsonc
{
  "h1": ["Titre H1 principal"],
  "h2": ["Sous-titre 1", "Sous-titre 2"],
  "h3": ["..."],
  "title": "Balise <title>",
  "meta_description": "Meta description ou null",
  "canonical": "https://exemple.ch/",
  "hreflang": [
    {"lang": "fr-CH", "href": "https://exemple.ch/"},
    {"lang": "de-CH", "href": "https://exemple.ch/de/"}
  ],
  "robots_meta": "index, follow",
  "viewport": true,
  "charset": "utf-8"
}
```

### 2. `maillage`

```jsonc
{
  "internal_links_count": 42,
  "external_links_count": 15,
  "top_internal_links": [
    {"anchor": "Nos services", "target": "/services"},
    {"anchor": "Contact", "target": "/contact"}
  ],
  "top_external_links": [
    {"anchor": "Wikipedia", "target": "https://fr.wikipedia.org/wiki/...", "domain": "wikipedia.org"}
  ]
}
```

Max 10 liens internes + 10 externes. Exclut le boilerplate (nav, footer répétés).

### 3. `geo`

```jsonc
{
  "adresses": ["Rue du Pré 12, 1003 Lausanne"],
  "villes": ["Lausanne", "Genève"],
  "codes_postaux": ["1003", "1200"],
  "telephones": ["+41 21 123 45 67"],
  "emails": ["contact@exemple.ch"],
  "google_maps_embed": true,
  "gbp_mentioned": false
}
```

### 4. `semantique`

```jsonc
{
  "entites_nommees": ["Jean Dupont", "MCVA Consulting SA", "Valais"],
  "mots_cles_frequents": [
    {"word": "fiduciaire", "count": 12},
    {"word": "audit", "count": 8}
  ],
  "flesch_score": 65.2,
  "mots_total": 850,
  "lang_detected": "fr"
}
```

### 5. `schema_org`

```jsonc
{
  "types_detected": ["Organization", "LocalBusiness"],
  "raw_scripts": [
    "{\"@context\":\"https://schema.org\",\"@type\":\"Organization\",...}"
  ]
}
```

Max 5 scripts JSON-LD, chacun tronqué à 2000 chars si plus long.

### 6. `media`

```jsonc
{
  "images_count": 18,
  "images_without_alt": 3,
  "has_video": false,
  "has_audio": false
}
```

---

## `CrawlMetadata`

```jsonc
{
  "started_at": "2026-04-24T14:32:10.123Z",     // REQUIS — ISO 8601 UTC
  "finished_at": "2026-04-24T14:35:42.789Z",    // REQUIS
  "pages_count": 9,                             // REQUIS — nb extracted avec succès
  "pages_failed": 1,                            // REQUIS — pages en erreur (status >= 400)
  "spa_detected": false,                        // REQUIS — heuristique SPA
  "parked_domain_detected": false,              // REQUIS — domaine parqué ?
  "extractor_model": "gemma4:31b",              // REQUIS — tag Ollama utilisé
  "crawler_version": "mcva-crawler-v1.0",       // REQUIS
  "extraction_duration_ms": 182430,             // REQUIS
  "aggregate_html_hash": "b7c9f1...",           // REQUIS — hash des hashes
  "user_agent": "MCVAAuditBot/3.0"              // OPT
}
```

---

## Response

### 200 OK — succès

```jsonc
{
  "success": true,
  "audit_id": "b3e2fa1d-1234-5678-abcd-ef0123456789",
  "reference": "AUDIT-2026-013",
  "dashboard_url": "https://mcva-audit.vercel.app/audit/b3e2fa1d-...",
  "warnings": ["Parked domain confirmed by server check"]  // OPT
}
```

### 400 Bad Request — parked domain

```jsonc
{
  "success": false,
  "errors": [
    "Parked domain detected (PARKED_DOMAIN): Domaine parqué détecté: https://parked.com redirige vers sedoparking.com."
  ]
}
```

### 401 Unauthorized — auth

```jsonc
{
  "success": false,
  "errors": ["Auth failed: not_found"]  // ou: missing | invalid_format | revoked
}
```

### 403 Forbidden — scope

```jsonc
{
  "success": false,
  "errors": ["API key scope insufficient (need 'audit-import' or 'full')"]
}
```

### 422 Unprocessable Entity — validation

```jsonc
{
  "success": false,
  "errors": [
    "url: required string",
    "pages[0].html_hash: required",
    "crawl_meta.started_at: required ISO timestamp"
  ]
}
```

### 500 Internal Server Error

Problème côté serveur (DB, RPC, etc.). Logs Vercel pour détails.

---

## Contraintes et limites

| Champ | Limite |
|---|---|
| `pages[]` | Max **20 pages** par import |
| `html_truncated` | Max **50 000 chars** (tronqué si plus) |
| `schema_org.raw_scripts` | Max **5 scripts**, 2000 chars chacun |
| `maillage.top_internal_links` | Max **10** |
| `maillage.top_external_links` | Max **10** |
| `semantique.mots_cles_frequents` | Max **20** |
| Payload total body | Devrait rester < 5 MB idéalement |

---

## Exemple minimal valide

```json
{
  "schema_version": "3.0",
  "url": "https://exemple.ch",
  "sector": "services-conseil",
  "audit_type": "pre_audit",
  "quality": "eco",
  "pages": [
    {
      "url": "https://exemple.ch",
      "is_homepage": true,
      "status_code": 200,
      "html_size_bytes": 5432,
      "html_hash": "abcd1234567890",
      "html_truncated": "<html>...</html>",
      "extracted": {
        "technique": {
          "h1": ["Bienvenue"],
          "h2": [], "h3": [],
          "title": "Exemple SA",
          "meta_description": null,
          "canonical": null,
          "hreflang": [],
          "robots_meta": null,
          "viewport": true,
          "charset": "utf-8"
        },
        "maillage": {
          "internal_links_count": 0,
          "external_links_count": 0,
          "top_internal_links": [],
          "top_external_links": []
        },
        "geo": {
          "adresses": [], "villes": [], "codes_postaux": [],
          "telephones": [], "emails": [],
          "google_maps_embed": false,
          "gbp_mentioned": false
        },
        "semantique": {
          "entites_nommees": [],
          "mots_cles_frequents": [],
          "flesch_score": null,
          "mots_total": 0,
          "lang_detected": "fr"
        },
        "schema_org": { "types_detected": [], "raw_scripts": [] },
        "media": { "images_count": 0, "images_without_alt": 0, "has_video": false, "has_audio": false }
      }
    }
  ],
  "crawl_meta": {
    "started_at": "2026-04-24T14:30:00Z",
    "finished_at": "2026-04-24T14:30:05Z",
    "pages_count": 1,
    "pages_failed": 0,
    "spa_detected": false,
    "parked_domain_detected": false,
    "extractor_model": "gemma4:31b",
    "crawler_version": "mcva-crawler-v1.0",
    "extraction_duration_ms": 5000,
    "aggregate_html_hash": "aggregate_hash_here"
  }
}
```

---

## Évolution du schéma

Pour monter à `schema_version: "3.1"` il faudra :
1. Ajouter `3.1` dans `SCHEMA_VERSION_SUPPORTED` côté route API
2. Mettre à jour `src/types/local-import.ts`
3. Mettre à jour `tools/local-crawler/audit_local.py` (modèles Pydantic + constante)
4. Documenter les nouveaux champs ici
5. Déprécier l'ancien schéma avec un sunset date (6 mois)

---

## Voir aussi

- [17 — Local Crawler Setup](./17-local-crawler-setup.md)
- [18 — Troubleshooting](./18-local-crawler-troubleshooting.md)
- [16 — Database Schema](./16-database-schema.md) (section `audit_local_extractions`)
- Code TS : `src/types/local-import.ts` + `src/app/api/audit-import/from-local/route.ts`
- Code Python : `tools/local-crawler/audit_local.py`

*MCVA Consulting SA — Schéma JSON v3.0 — 2026-04-24*
