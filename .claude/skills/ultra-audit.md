---
name: ultra-audit
description: >
  Audit digital complet "Ultra Audit" pour les clients et prospects MCVA. Déclencher
  dès que Jérôme dit "ultra audit", "audit complet", "audit digital" suivi d'une URL
  ou d'un nom de client. Produit un rapport PDF brandé MCVA de 20+ pages couvrant 7
  domaines : SEO, GEO approfondi (Score GEO™ avec données Qwairy si disponibles),
  Performance, Accessibilité, Technique, Contenu, Benchmark. Utiliser aussi quand on
  parle d'auditer un site web prospect ou de préparer un pré-audit commercial.
  Version 2.2 — correctif détection présence locale + checklist QA.
---

# MCVA Ultra Audit v2.2 — Skill opérationnel

**Version :** 2.2  
**Mise à jour :** 6 avril 2026  
**Auteur :** Jérôme Deshaie, CEO  
**Ref template :** AUDIT-2026-001 (Zufferey Panigas), AUDIT-2026-002 (MCVA auto-diagnostic)  

**Changelog :**
| Version | Date | Changement |
|---------|------|------------|
| 1.0 | 02/04/2026 | Création — 6 domaines, 15+ pages, template Zufferey Panigas |
| 2.0 | 02/04/2026 | Section GEO enrichie (8 sous-sections), query fan-out, analyse sources/sociale, technique IA, mapping funnel TOFU/MOFU/BOFU, intégration Qwairy/Semrush |
| 2.1 | 04/04/2026 | Accessibilité RGAA 13 thèmes, RGESN 9 thèmes, pondérations ajustées |
| **2.2** | **06/04/2026** | **Correctif détection présence locale : vérification directe GBP/annuaires/Wikidata/réseaux sociaux. Ajout checklist QA pré-livraison. Origine : faux négatif GBP dans AUDIT-2026-002.** |

## Déclenchement

Jérôme dit : "ultra audit [URL]" ou "audit complet [nom client]" ou "lance l'ultra audit sur [site]"

---

## Architecture du rapport — 10 sections

```
COUVERTURE + SYNTHÈSE EXÉCUTIVE (scores 7 domaines + radar)
│
├── 1. Contexte et méthodologie
│
├── 2. AUDIT SEO — Référencement naturel (CORE-EEAT)
│   ├── 2.1 Balises title
│   ├── 2.2 Meta descriptions
│   ├── 2.3 Hiérarchie Hn
│   ├── 2.4 Données structurées (Schema.org / JSON-LD)
│   ├── 2.5 Indexation Google
│   ├── 2.6 Optimisation images
│   ├── 2.7 Structure URLs
│   └── 2.8 Maillage interne
│
├── 3. AUDIT GEO — Citabilité par les IA (Score GEO™)
│   ├── 3.1 Overview globale (mention rate, source rate, SOV, sentiment, rang)
│   ├── 3.2 Distribution par LLM (tableau provider × métriques)
│   ├── 3.3 Benchmark concurrentiel GEO (quadrant mention × source)
│   ├── 3.4 Analyse par thématique (topics × funnel TOFU/MOFU/BOFU)
│   ├── 3.5 Query Fan-Out (sous-requêtes LLMs, présence marque)
│   ├── 3.6 Analyse des sources (domaines cités, pages propres, profil)
│   ├── 3.7 Analyse sociale (plateformes citées par les LLMs)
│   └── 3.8 Analyse technique IA (robots.txt bots IA, llms.txt, sitemap)
│
├── 4. AUDIT PERFORMANCE — Core Web Vitals (15 critères)
│
├── 5. AUDIT ACCESSIBILITÉ — WCAG 2.1 AA / RGAA (13 thèmes)
│
├── 6. AUDIT TECHNIQUE — Infrastructure et sécurité
│
├── 7. AUDIT CONTENU — Structure et rédaction
│
├── 8. BENCHMARK CONCURRENTIEL (croisé SEO × GEO)
│
├── 9. PLAN D'ACTION — 3 phases
│   ├── Phase 1 — Quick Wins (0-4 semaines)
│   ├── Phase 2 — Fondations (1-3 mois)
│   └── Phase 3 — Accélération (3-6 mois)
│
└── 10. Annexes (méthodologie Score GEO™, glossaire)
```

---

## Workflow

### Phase 1 — Crawl (5-10 min)

1. **Fetch toutes les pages** du site via `web_fetch` :
   - Homepage + toutes pages navigation + sous-pages services
   - Blog/news (1-2 articles récents)
   - Politique de confidentialité / mentions légales
   - Tout lien footer

2. **Vérifications techniques** :
   - Headers HTTP (sécurité : HSTS, CSP, X-Frame-Options)
   - Identifier la plateforme (Squarespace, WordPress, Next.js, etc.)
   - robots.txt et sitemap.xml
   - CDN, fonts externes, scripts tiers

3. **Vérifications techniques IA** :
   - robots.txt : GPTBot, ClaudeBot, PerplexityBot, Bingbot autorisés ?
   - llms.txt : présent ? contenu ?
   - sitemap.xml : valide ? couverture ?
   - Score d'accessibilité IA estimé (/100)

4. **Recherches concurrentielles** :
   - `web_search` : "[secteur] [ville] [canton]" → 4-5 concurrents
   - `web_search` : "site:[domaine]" → pages indexées
   - `web_search` : "[nom entreprise] avis" → présence en ligne

### Phase 1bis — Vérification Présence Directe (NOUVEAU v2.2)

> **RÈGLE ABSOLUE :** Ne JAMAIS écrire « Pas de [source] détecté » sans avoir effectué 
> la vérification directe correspondante ci-dessous. Si la vérification échoue (timeout, 
> 403, etc.), écrire « Vérification [source] impossible — vérification manuelle recommandée ».

#### 1bis.1 — Google Business Profile

```
# Méthode 1 : Google Places Search (PRIORITAIRE)
places_search(query="[nom_entreprise] [ville]", max_results=3)
→ Vérifier si un résultat matche le nom + l'adresse du client

# Méthode 2 : Recherche Google Maps ciblée (FALLBACK)
web_search("[nom_entreprise] [ville] [code_postal]")
→ Chercher un résultat maps.google.com dans les résultats

# Scoring :
# - places_search retourne un match exact → GBP confirmé actif
# - Pas de match via les 2 méthodes → "GBP non détecté via Google Maps/Places"
# - JAMAIS écrire "Pas de GBP" sans avoir tenté les DEUX méthodes
```

#### 1bis.2 — Annuaires suisses (fetch direct)

```
# local.ch — fetch direct
web_fetch("https://www.local.ch/fr/q/[nom_entreprise encodé]/[ville]")
→ Vérifier si la page contient le nom exact de l'entreprise

# search.ch — fetch direct
web_fetch("https://www.search.ch/tel/[nom_entreprise encodé]")
→ Vérifier si résultat retourné

# Moneyhouse — source autoritaire SA/Sàrl suisses
web_fetch("https://www.moneyhouse.ch/fr/company/[slug-entreprise]")
→ Extraire : adresse actuelle, IDE, statut, date dernier changement RC
→ COMPARER l'adresse Moneyhouse vs l'adresse déclarée sur le site

# Creditreform/FirmenWissen
web_search("[nom_entreprise] site:firmenwissen.com")
→ Si trouvé, fetch la page et vérifier date de dernière MàJ
→ Signaler si adresse obsolète (date MàJ > 2 ans)
```

#### 1bis.3 — Wikidata

```
# Recherche par IDE (identifiant unique suisse)
web_fetch("https://www.wikidata.org/w/index.php?search=[IDE]&ns0=1")
→ Vérifier si une entité existe

# Alternative : recherche par nom
web_search("[nom_entreprise] site:wikidata.org")

# Scoring :
# - Entité trouvée avec IDE correct → "Présent sur Wikidata"
# - Pas d'entité → "Absent de Wikidata — création recommandée"
```

#### 1bis.4 — Réseaux sociaux (recherche ciblée)

```
# LinkedIn entreprise (search site: = plus fiable que recherche générique)
web_search("[nom_entreprise] site:linkedin.com/company")
→ Si trouvé, noter l'URL et le nombre de followers si visible

# Facebook
web_search("[nom_entreprise] [ville] site:facebook.com")

# Instagram
web_search("[nom_entreprise] site:instagram.com")
```

#### 1bis.5 — Synthèse Présence Locale (OBLIGATOIRE dans le rapport)

Produire systématiquement ce tableau dans la section SEO > Reputation :

```markdown
TABLEAU PRÉSENCE LOCALE

| Source | Statut | Détail | Action |
|--------|--------|--------|--------|
| Google Business Profile | ✓ Actif / ✗ Absent / ⚠ Non vérifiable | [date, nb avis] | [si absent : créer] |
| local.ch | ✓ / ✗ | [URL si trouvé] | [si absent : créer fiche] |
| search.ch | ✓ / ✗ | [URL si trouvé] | [si absent : créer fiche] |
| Moneyhouse | ✓ / ⚠ Obsolète | [adresse, date MàJ] | [si obsolète : MàJ] |
| Creditreform | ✓ / ⚠ Obsolète | [adresse, date MàJ] | [si obsolète : MàJ] |
| Wikidata | ✓ / ✗ | [URL si trouvé] | [si absent : créer entité] |
| LinkedIn (entreprise) | ✓ / ✗ | [URL, followers] | [si absent : créer] |
| Facebook | ✓ / ✗ | [URL si trouvé] | [si absent : évaluer] |
```

---

### Phase 2 — Analyse 7 domaines (10-15 min)

#### 2. SEO — CORE-EEAT (score /100)
8 dimensions : Content, On-page, Reputation, Experience, Expertise, E-E-A-T signals, Authority, Trust.
Chaque critère évalué 0-100 avec statut (✓ / ~ / ✗).
Pondérations : C 15%, O 15%, R 10%, E 10%, Exp 15%, Ept 15%, A 10%, T 10%.

**Note v2.2 :** La dimension Reputation intègre désormais les résultats de la Phase 1bis (tableau présence locale). Le score GBP ne peut plus être 0 ou 5 sans vérification directe via places_search.

#### 3. GEO — Score GEO™ (score /100)

**Mode A — Estimation CITE** (par défaut, si pas de données Qwairy) :
Estimation via framework CITE (Citability, Indexability, Trustworthiness, Engagement).
Mentionner "ESTIMATION CITE" dans les headers.

**Mode B — Données réelles** (si export Qwairy fourni) :
Données monitoring LLM réel (ChatGPT, Claude, Gemini, Perplexity, Grok).
Mentionner "DONNÉES RÉELLES QWAIRY" dans les headers.
Basculer via : `Jérôme fournit l'export Qwairy → passer en Mode B`

8 sous-sections enrichies (v2.0) :
- 3.1 Overview globale (KPIs : mention rate, source rate, SOV, sentiment, rang)
- 3.2 Distribution par LLM (tableau provider × métriques)
- 3.3 Benchmark concurrentiel GEO (quadrant mention × source + topics × marques)
- 3.4 Analyse par thématique (topics × funnel TOFU/MOFU/BOFU)
- 3.5 Query Fan-Out (sous-requêtes LLMs, présence marque, priorités contenu)
- 3.6 Analyse des sources (domaines cités, pages propres, profil social/commercial/institutionnel)
- 3.7 Analyse sociale (plateformes citées, réseaux à investir)
- 3.8 Analyse technique IA (robots.txt bots IA, llms.txt, sitemap, accessibilité IA)

#### 4. Performance — Core Web Vitals (score /100)
15 critères : LCP, CLS, INP, FCP, TTFB, poids page, images, fonts, compression, CDN, JS, CSS, requêtes tierces, Service Worker, scripts inutiles.

#### 5. Accessibilité — WCAG 2.1 AA / RGAA (score /100)
13 thèmes RGAA : images, cadres, couleurs, multimédia, tableaux, liens, scripts, éléments obligatoires, structuration, présentation, formulaires, navigation, consultation.

#### 6. Technique — Infrastructure (score /100)
Critères : HTTPS, responsive, plateforme, DNS, CSP, HSTS, robots.txt IA, llms.txt, sitemap, schema.org, multi-langue, hébergement, anomalies 404.

#### 7. Contenu — Qualité éditoriale (score /100)
Critères : volume, lisibilité, structure Hn, contenu dupliqué, fraîcheur, auteur, liens internes/externes, CTA, FAQ, profondeur sémantique, maillage thématique, formats variés, calendrier éditorial, persona.

### Phase 3 — Scoring (2-3 min)

Score global = moyenne pondérée des 7 domaines :
- SEO : 20%
- GEO : 25%
- Performance : 12%
- Accessibilité : 12%
- Technique : 8%
- Contenu : 15%
- Éco-conception : 8%

Seuils : 0-25 Critique · 26-50 Émergent · 51-75 Visible · 76-100 Leader

### Phase 4 — Benchmark concurrentiel

Comparer le client vs 1-3 concurrents sur les 7 dimensions.
Tableau comparatif + identification des forces/faiblesses relatives.

### Phase 5 — Plan d'action 3 phases

- Phase 1 — Quick Wins (0-4 semaines) : actions contrôlables, effort faible, impact immédiat
- Phase 2 — Fondations (1-3 mois) : actions structurelles, effort moyen, autorité web
- Phase 3 — Accélération (3-6 mois) : différenciation, leadership, notoriété

Chaque action : numérotée, impact SEO (★), impact GEO (★), effort, catégorie.
En Mode B (Qwairy) : ajouter contenus à produire par topic × funnel (TOFU/MOFU/BOFU).

### Phase 6 — Génération PDF

- Lire le skill `mcva-brand-identity v3.2` pour les couleurs et la charte
- HTML → PDF via wkhtmltopdf
- Design brandé MCVA : gradients nommés, palette rouge spectre, glassmorphism cards
- Scores en badges colorés (vert >70, orange 40-69, rouge <40)
- Référence : AUDIT-[AAAA]-[NNN]
- 20-25 pages standard

### Phase 7 — Livraison

- Sauver le PDF dans /mnt/user-data/outputs/
- Présenter via `present_files`
- Résumé concis : score global, top 3 constats, impact Phase 1 estimé

---

## Checklist QA pré-livraison (NOUVEAU v2.2)

Avant de livrer tout audit (interne ou client), vérifier :

- [ ] GBP vérifié via `places_search` (pas uniquement web_search)
- [ ] Adresse Moneyhouse comparée à l'adresse du site client
- [ ] Au moins 3 annuaires CH vérifiés par fetch direct
- [ ] Wikidata vérifié par IDE ou nom
- [ ] Tableau synthèse présence locale présent dans la section Reputation
- [ ] Aucune mention "non détecté" sans vérification directe correspondante
- [ ] Si le client fournit des screenshots GSC → scores ajustés aux données réelles
- [ ] Données Semrush "n/a" ≠ "inexistant" → toujours expliquer le seuil de détection
- [ ] Aucune mention d'Arneo/Mantu dans le rapport (règle SR-EDIT)
- [ ] Score GEO™ : mentionner clairement si estimation CITE ou données réelles Qwairy

---

## Coût de production

Sur plan Max (~200 CHF/mois) : **0 CHF incrémental par audit**.
Valeur marché : 3 500 — 6 000 CHF (augmentée vs v1 grâce à la profondeur GEO).

## Format de nommage

Fichier : `AUDIT_DIGITAL_[INITIALES_CLIENT]_MCVA-[AAAA]-[NNN].pdf`

---

*MCVA Consulting SA · Skill ultra-audit v2.2 · 6 avril 2026*  
*Document confidentiel — Usage interne uniquement*
