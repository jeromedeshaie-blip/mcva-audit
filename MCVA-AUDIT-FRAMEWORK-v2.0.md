---
title: MCVA Audit Framework v2.0 — Référentiel atomique des critères
version: "2.0"
status: "DRAFT — Lot 1 du chantier framework"
date: "2026-04-08"
owner: "Jérôme Deshaie, CEO MCVA Consulting SA"
supersedes: "Framework v1.0 (Pôle Performance) — instructions internes 2026-04"
---

# MCVA Audit Framework v2.0 — Référentiel atomique

## Préambule

Ce document est le **référentiel maître** du framework d'audit MCVA Consulting SA. Il énumère les **185 critères atomiques** répartis sur 7 thèmes, chacun mesurable de manière reproductible.

### Conventions

| Élément | Convention |
|---|---|
| **ID critère** | `{THEME}-{DIM}-{NN}` — ex. `SEO-C-01`, `GEO-CI-I-03`, `PERF-05` |
| **Notation** | 0 à 5 étoiles (★☆☆☆☆ à ★★★★★) — barème explicite par critère |
| **Type de mesure** | `INSTR` (API tierce), `SEMI` (script + interprétation), `DECL` (lecture LLM/HTML) |
| **Pondération** | Poids relatif du critère dans sa dimension parente |
| **Statut** | `MUST` (bloquant pour audit ultra), `SHOULD` (recommandé), `NICE` (bonus) |

### Barème étoiles universel

| Étoiles | Score 0-100 | Statut |
|---|---|---|
| ★★★★★ | 90-100 | Excellent — niveau de référence |
| ★★★★☆ | 75-89 | Bon — au-dessus de la norme |
| ★★★☆☆ | 55-74 | Correct — conforme aux attentes |
| ★★☆☆☆ | 35-54 | Insuffisant — amélioration nécessaire |
| ★☆☆☆☆ | 15-34 | Faible — problème significatif |
| ☆☆☆☆☆ | 0-14 | Critique — bloquant ou absent |

Chaque critère définit son propre barème de conversion mesure → étoiles dans le Lot 2 (Spécification des mesures).

### Répartition globale

| Thème | Code | Critères | Poids global |
|---|---|---|---|
| SEO — Référencement naturel | SEO | 50 | 18 % |
| GEO — Visibilité IA générative | GEO | 40 | 22 % |
| Performance — Core Web Vitals | PERF | 20 | 12 % |
| Accessibilité — WCAG 2.1 AA | A11Y | 25 | 12 % |
| Technique & Sécurité | TECH | 20 | 10 % |
| Contenu — Qualité éditoriale & citabilité LLM | CONT | 16 | 15 % |
| Éco-conception — RGESN | ECO | 14 | 6 % |
| **Score GEO™ composite (transverse)** | GEO™ | — | 5 % |
| **TOTAL** | | **185** | **100 %** |

---

# THÈME 1 — SEO (CORE-EEAT) — 50 critères

## Dimension C — Content (8 critères, poids 15 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| SEO-C-01 | Profondeur de contenu (mots) | `wc` programmatique sur balises sémantiques | INSTR | MUST |
| SEO-C-02 | Densité sémantique vs corpus secteur | TF-IDF vs top 10 résultats Google sur mot-clé cible | SEMI | SHOULD |
| SEO-C-03 | Originalité (anti-duplicate) | Copyscape API ou simhash vs top 100 SERP | INSTR | MUST |
| SEO-C-04 | Fraîcheur du contenu | `dateModified` JSON-LD ou `lastmod` sitemap | INSTR | MUST |
| SEO-C-05 | Hiérarchie Hn (H1 unique, ratio H2/mots) | Parsing DOM | INSTR | MUST |
| SEO-C-06 | Densité du mot-clé principal | Comptage occurrences / total mots | INSTR | SHOULD |
| SEO-C-07 | Couverture entités sémantiques (LSI) | NER spaCy + comptage entités liées | SEMI | SHOULD |
| SEO-C-08 | Profondeur thématique du site | Nombre de pages par cluster sémantique | SEMI | NICE |

## Dimension O — On-page Optimization (10 critères, poids 15 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| SEO-O-01 | Title tag (longueur, unicité, mot-clé) | Parsing `<title>` + dédoublonnage crawl | INSTR | MUST |
| SEO-O-02 | Meta description (longueur, présence CTA) | Parsing `<meta name="description">` | INSTR | MUST |
| SEO-O-03 | Attributs alt des images | Comptage `<img alt="">` non vides ≥ 5 mots | INSTR | MUST |
| SEO-O-04 | Maillage interne (densité contextuelle) | Comptage liens internes / 1000 mots | INSTR | MUST |
| SEO-O-05 | Profondeur de clic depuis homepage | Crawl interne, calcul plus court chemin | SEMI | SHOULD |
| SEO-O-06 | Mobile-friendly | Google Mobile-Friendly Test API | INSTR | MUST |
| SEO-O-07 | Canonical tag présent et self-référent | Parsing `<link rel="canonical">` | INSTR | MUST |
| SEO-O-08 | Sitemap XML valide et soumis | XSD validation + check GSC | INSTR | MUST |
| SEO-O-09 | Robots.txt cohérent | Parsing + détection `Disallow: /` accidentel | INSTR | MUST |
| SEO-O-10 | URLs propres (slugs, longueur, hyphens) | Regex sur URLs crawlées | INSTR | SHOULD |

## Dimension R — Reputation (8 critères, poids 10 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| SEO-R-01 | Authority Score (Semrush) | Semrush API | INSTR | MUST |
| SEO-R-02 | Volume backlinks total | Semrush API | INSTR | MUST |
| SEO-R-03 | Diversité des domaines référents | Semrush API + ratio top 10 RD / total | INSTR | MUST |
| SEO-R-04 | Backlinks d'autorité (.edu, .gouv, .admin.ch) | Filtre TLD sur backlinks Semrush | INSTR | SHOULD |
| SEO-R-05 | Note GBP et nombre d'avis | Google Business Profile API | INSTR | MUST |
| SEO-R-06 | Taux de réponse aux avis | Calcul ratio réponses / avis | SEMI | SHOULD |
| SEO-R-07 | NAP consistency multi-plateformes | BrightLocal API ou audit manuel 8 annuaires | INSTR | SHOULD |
| SEO-R-08 | Mentions de marque hors site | Brand24 API ou Google Alerts | INSTR | NICE |

## Dimension E — Experience (6 critères, poids 10 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| SEO-E-01 | Études de cas clients nommés | Comptage cas avec nom client + résultats chiffrés | DECL | MUST |
| SEO-E-02 | Témoignages structurés | Schema.org `Review` + comptage avec photo+nom | INSTR | SHOULD |
| SEO-E-03 | Visuels originaux (anti-stock) | Reverse image search TinEye sur échantillon | SEMI | SHOULD |
| SEO-E-04 | Portfolio / réalisations | Page dédiée + comptage entrées | DECL | SHOULD |
| SEO-E-05 | Contenu vidéo de l'équipe | Comptage `<video>` ou intégrations YouTube/Vimeo propriétaires | INSTR | NICE |
| SEO-E-06 | Démonstration produit/service | Présence démo, calculateur, simulateur | DECL | NICE |

## Dimension Exp — Expertise (8 critères, poids 15 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| SEO-Exp-01 | Auteurs identifiés (schema.org Person) | JSON-LD `author` lié à `Person` | INSTR | MUST |
| SEO-Exp-02 | Page équipe complète | Comptage personnes + photos + bios ≥ 80 mots | DECL | MUST |
| SEO-Exp-03 | Certifications professionnelles visibles | Logos certifs + liens vérifiables | DECL | SHOULD |
| SEO-Exp-04 | Publications externes des experts | Comptage liens vers articles externes signés | SEMI | SHOULD |
| SEO-Exp-05 | FAQ technique structurée | Schema.org `FAQPage` + ≥ 5 Q/R | INSTR | MUST |
| SEO-Exp-06 | Vocabulaire spécialisé maîtrisé | Détection terminologie sectorielle vs corpus | SEMI | SHOULD |
| SEO-Exp-07 | Guides pédagogiques approfondis | Présence contenu long format ≥ 1500 mots avec sommaire | DECL | SHOULD |
| SEO-Exp-08 | Glossaire ou base de connaissances | Page dédiée structurée | DECL | NICE |

## Dimension A — Authority (6 critères, poids 10 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| SEO-A-01 | Présence Wikipédia / Wikidata | Recherche API Wikidata + comptage propriétés P | INSTR | SHOULD |
| SEO-A-02 | Knowledge Graph Google | Recherche manuelle + détection panneau | SEMI | SHOULD |
| SEO-A-03 | Couverture médiatique Tier-1 | Backlinks depuis domaines presse Semrush | INSTR | SHOULD |
| SEO-A-04 | Profils sociaux actifs | LinkedIn API : followers + posts/an + engagement | INSTR | SHOULD |
| SEO-A-05 | Ancienneté du domaine | WHOIS lookup | INSTR | MUST |
| SEO-A-06 | Partenariats nommés et liés | Comptage logos partenaires avec liens dofollow | DECL | NICE |

## Dimension T — Trust (4 critères, poids 10 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| SEO-T-01 | HTTPS valide (TLS 1.3, certif ≥ 30j) | SSL Labs API | INSTR | MUST |
| SEO-T-02 | Politique de confidentialité conforme nLPD/RGPD | Présence + parsing + check `lastUpdated` | SEMI | MUST |
| SEO-T-03 | Mentions légales complètes | Présence raison sociale + IDE + RC + contact | DECL | MUST |
| SEO-T-04 | Absence de signaux négatifs | Google Safe Browsing API + Spamhaus | INSTR | MUST |

**Total SEO : 50 critères ✓**

---

# THÈME 2 — GEO (CITE) — 40 critères

## Dimension C — Citability (10 critères, poids 25 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| GEO-CI-C-01 | Authority Score Semrush | Semrush API | INSTR | MUST |
| GEO-CI-C-02 | Volume total de backlinks | Semrush API | INSTR | MUST |
| GEO-CI-C-03 | Diversité domaines référents | Semrush API | INSTR | MUST |
| GEO-CI-C-04 | Backlinks autorité (.edu/.gouv/.admin.ch) | Semrush API + filtre TLD | INSTR | SHOULD |
| GEO-CI-C-05 | Présence presse Tier-1 (Le Temps, RTS, Bilan) | Semrush + filtre médias | INSTR | SHOULD |
| GEO-CI-C-06 | Audience LinkedIn entreprise | LinkedIn API : followers + activité | INSTR | SHOULD |
| GEO-CI-C-07 | Trafic organique mensuel estimé | Semrush API | INSTR | MUST |
| GEO-CI-C-08 | Mots-clés positionnés top 10 | Semrush API | INSTR | MUST |
| GEO-CI-C-09 | Présence annuaires pro (8 cibles CH) | Audit local.ch, search.ch, Moneyhouse, GBP, Pages Jaunes, hotfrog, Yelp, OSM | SEMI | MUST |
| GEO-CI-C-10 | Partenariats stratégiques visibles | Comptage logos partenaires avec liens | DECL | SHOULD |

## Dimension I — Indexability (10 critères, poids 25 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| GEO-CI-I-01 | Robots.txt autorise les bots IA | Parsing `User-agent: GPTBot/ClaudeBot/PerplexityBot/Google-Extended` | INSTR | MUST |
| GEO-CI-I-02 | Test bot IA réel (User-Agent GPTBot) | `curl -A "GPTBot"` + check 200 OK | INSTR | MUST |
| GEO-CI-I-03 | llms.txt présent et conforme | `web_fetch /llms.txt` + validation spec llmstxt.org | INSTR | MUST |
| GEO-CI-I-04 | Schema.org Organization complet | JSON-LD : logo, sameAs, founder, foundingDate, areaServed, knowsAbout | INSTR | MUST |
| GEO-CI-I-05 | Schema.org WebSite + SearchAction | JSON-LD validé Rich Results Test API | INSTR | SHOULD |
| GEO-CI-I-06 | Rendu serveur (SSR) ou statique | Détection SPA via comparaison HTML curl vs Puppeteer | SEMI | MUST |
| GEO-CI-I-07 | URLs indexées Google | `site:domaine.ch` + GSC API si dispo | INSTR | MUST |
| GEO-CI-I-08 | Profondeur de crawl ≤ 3 clics | Crawl interne | SEMI | SHOULD |
| GEO-CI-I-09 | Item Wikidata (Q-ID) avec ≥ 10 propriétés | Wikidata API | INSTR | SHOULD |
| GEO-CI-I-10 | Sitemap dédié contenu citable (FAQ, glossaire, cas) | Parsing sitemap + classification | SEMI | NICE |

## Dimension T — Trustworthiness (10 critères, poids 25 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| GEO-CI-T-01 | Note moyenne avis (GBP + Trustpilot) | API GBP + Trustpilot | INSTR | MUST |
| GEO-CI-T-02 | Volume d'avis (≥ 30 GBP) | API GBP | INSTR | MUST |
| GEO-CI-T-03 | Taux de réponse aux avis | Calcul depuis API | INSTR | SHOULD |
| GEO-CI-T-04 | Diversité plateformes d'avis | Comptage plateformes ≥ 3 | SEMI | SHOULD |
| GEO-CI-T-05 | Témoignages structurés (schema.org Review) | JSON-LD + comptage | INSTR | MUST |
| GEO-CI-T-06 | Labels et certifications vérifiables | Liste + liens vérifiables | DECL | SHOULD |
| GEO-CI-T-07 | Transparence tarifaire | Détection prix publics ou fourchettes | DECL | SHOULD |
| GEO-CI-T-08 | Page "À propos" complète | Comptage critères : histoire, mission, équipe, valeurs | DECL | MUST |
| GEO-CI-T-09 | Historique daté de l'entreprise | Détection patterns temporels (jalons ≥ 3 dates) | SEMI | SHOULD |
| GEO-CI-T-10 | Statements factuels datés (auto-vérifiables) | NER + regex sur dates/chiffres/entités | SEMI | MUST |

## Dimension E — Engagement (10 critères, poids 25 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| GEO-CI-E-01 | Newsletter avec archives publiques | Présence form + comptage archives ≥ 12 | DECL | SHOULD |
| GEO-CI-E-02 | Fréquence de publication blog | Comptage articles 12 derniers mois | INSTR | MUST |
| GEO-CI-E-03 | Contenu interactif (quiz, calculateur) | Détection composants interactifs | DECL | NICE |
| GEO-CI-E-04 | Événements organisés ou sponsorisés | Page dédiée + comptage ≥ 2/an | DECL | SHOULD |
| GEO-CI-E-05 | Communauté (Slack/Discord/forum) | Présence + estimation taille | DECL | NICE |
| GEO-CI-E-06 | Diversité des formats (texte/vidéo/podcast/infographie) | Comptage formats ≥ 4/5 | SEMI | SHOULD |
| GEO-CI-E-07 | Engagement LinkedIn (taux ≥ 2 %) | LinkedIn API | INSTR | SHOULD |
| GEO-CI-E-08 | Partage social facilité | Détection boutons partage natifs | INSTR | NICE |
| GEO-CI-E-09 | UGC / contributions externes | Section témoignages avec contributions tierces | DECL | NICE |
| GEO-CI-E-10 | Cohérence cross-canal (site/social/newsletter) | Comparaison messages clés | DECL | NICE |

**Total GEO : 40 critères ✓**

---

# THÈME 3 — Performance (Core Web Vitals étendus) — 20 critères

## Dimension Core Web Vitals (5 critères, poids 50 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| PERF-01 | LCP (Largest Contentful Paint) | PageSpeed Insights API — p75 mobile CrUX | INSTR | MUST |
| PERF-02 | CLS (Cumulative Layout Shift) | PSI API — p75 | INSTR | MUST |
| PERF-03 | INP (Interaction to Next Paint) | PSI API — p75 | INSTR | MUST |
| PERF-04 | FCP (First Contentful Paint) | PSI API — p75 | INSTR | MUST |
| PERF-05 | TTFB (Time to First Byte) | `curl -w` ou PSI API | INSTR | MUST |

## Dimension Optimisation des assets (8 critères, poids 30 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| PERF-06 | Poids total de la page | `curl` + somme assets | INSTR | MUST |
| PERF-07 | Format d'image moderne (WebP/AVIF) | Comptage formats sur toutes les images | INSTR | MUST |
| PERF-08 | Lazy loading natif | `loading="lazy"` sur images below-the-fold | INSTR | SHOULD |
| PERF-09 | Images responsive (srcset/sizes) | Parsing `<img srcset>` | INSTR | SHOULD |
| PERF-10 | Polices optimisées (woff2 + font-display) | Parsing `@font-face` | INSTR | SHOULD |
| PERF-11 | Compression Brotli/gzip active | Header `Content-Encoding` | INSTR | MUST |
| PERF-12 | CSS critique inliné | Détection `<style>` inline + taille | SEMI | SHOULD |
| PERF-13 | JS non bloquant (defer/async) | Parsing `<script>` dans `<head>` | INSTR | MUST |

## Dimension Infrastructure (4 critères, poids 15 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| PERF-14 | CDN actif avec POP CH/EU | Headers `cf-ray`, `x-cache`, etc. | INSTR | SHOULD |
| PERF-15 | Cache hit ratio assets statiques | Header `cf-cache-status` ou similaire | INSTR | SHOULD |
| PERF-16 | HTTP/2 ou HTTP/3 actif | Détection protocole `curl --http3` | INSTR | SHOULD |
| PERF-17 | Service Worker / PWA | Détection `serviceWorker` | INSTR | NICE |

## Dimension Lighthouse global (3 critères, poids 5 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| PERF-18 | Lighthouse Performance Score global | Lighthouse CLI ou PSI API | INSTR | MUST |
| PERF-19 | Speed Index | PSI API | INSTR | SHOULD |
| PERF-20 | Total Blocking Time (TBT) | PSI API | INSTR | SHOULD |

**Total PERF : 20 critères ✓**

---

# THÈME 4 — Accessibilité (WCAG 2.1 AA) — 25 critères

## Dimension Perceptible (8 critères, poids 32 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| A11Y-01 | Alt text sur images informatives | axe-core | INSTR | MUST |
| A11Y-02 | Images décoratives masquées (alt="" ou aria-hidden) | axe-core | INSTR | MUST |
| A11Y-03 | Contraste texte normal ≥ 4.5:1 | axe-core | INSTR | MUST |
| A11Y-04 | Contraste texte large ≥ 3:1 | axe-core | INSTR | MUST |
| A11Y-05 | Information non transmise uniquement par la couleur | axe-core | INSTR | MUST |
| A11Y-06 | Sous-titres vidéo (track captions) | Parsing `<track kind="captions">` | INSTR | SHOULD |
| A11Y-07 | Transcriptions audio | Détection lien transcription près audio | DECL | SHOULD |
| A11Y-08 | Texte redimensionnable jusqu'à 200 % sans perte | Test programmatique zoom | SEMI | SHOULD |

## Dimension Utilisable (8 critères, poids 32 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| A11Y-09 | Tous les composants accessibles au clavier | axe-core + Cypress | INSTR | MUST |
| A11Y-10 | Pas de focus trap involontaire | Test manuel ou Playwright | SEMI | MUST |
| A11Y-11 | Skip link "aller au contenu" | Détection premier `<a href="#main">` | INSTR | MUST |
| A11Y-12 | Focus visible (outline ou équivalent) | axe-core + parsing CSS `:focus-visible` | INSTR | MUST |
| A11Y-13 | Tabulation logique (pas de tabindex > 0) | axe-core | INSTR | MUST |
| A11Y-14 | Liens explicites (pas de "cliquez ici" sans contexte) | axe-core | INSTR | SHOULD |
| A11Y-15 | Titres de pages descriptifs et uniques | Parsing `<title>` + dédoublonnage | INSTR | MUST |
| A11Y-16 | Délais ajustables ou désactivables | Détection timers / animations | DECL | SHOULD |

## Dimension Compréhensible (5 critères, poids 20 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| A11Y-17 | Lang attribute correct (`html lang="fr-CH"`) | Parsing `<html lang>` | INSTR | MUST |
| A11Y-18 | Changements de langue inline déclarés | Parsing `<span lang>` sur sections étrangères | INSTR | SHOULD |
| A11Y-19 | Labels de formulaires associés | axe-core | INSTR | MUST |
| A11Y-20 | Messages d'erreur liés aux champs (aria-describedby) | axe-core | INSTR | MUST |
| A11Y-21 | Instructions de saisie claires | Détection placeholders + helpers | DECL | SHOULD |

## Dimension Robuste (4 critères, poids 16 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| A11Y-22 | HTML valide (W3C Validator) | W3C Validator API | INSTR | SHOULD |
| A11Y-23 | ARIA roles cohérents | axe-core | INSTR | SHOULD |
| A11Y-24 | aria-live sur zones dynamiques | axe-core | INSTR | SHOULD |
| A11Y-25 | Hiérarchie Hn correcte (1 H1, pas de saut) | axe-core | INSTR | MUST |

**Total A11Y : 25 critères ✓**

---

# THÈME 5 — Technique & Sécurité — 20 critères

## Dimension Infrastructure (5 critères, poids 25 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| TECH-01 | Redirection 301 HTTP → HTTPS | `curl -I http://...` | INSTR | MUST |
| TECH-02 | Grade SSL Labs ≥ A | SSL Labs API | INSTR | MUST |
| TECH-03 | TLS 1.3 actif | SSL Labs API | INSTR | SHOULD |
| TECH-04 | DNSSEC activé | `dig +dnssec` | INSTR | NICE |
| TECH-05 | CAA records DNS | `dig CAA` | INSTR | NICE |

## Dimension Headers de sécurité (6 critères, poids 30 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| TECH-06 | HSTS (max-age ≥ 1 an, includeSubDomains, preload) | securityheaders.com API | INSTR | MUST |
| TECH-07 | Content-Security-Policy strict (pas de unsafe-inline) | securityheaders.com API | INSTR | MUST |
| TECH-08 | X-Frame-Options (DENY ou SAMEORIGIN) | securityheaders.com API | INSTR | MUST |
| TECH-09 | Referrer-Policy (strict-origin-when-cross-origin min) | securityheaders.com API | INSTR | SHOULD |
| TECH-10 | Permissions-Policy avec restrictions | securityheaders.com API | INSTR | SHOULD |
| TECH-11 | Grade securityheaders.com ≥ A | securityheaders.com API | INSTR | MUST |

## Dimension Email & DNS (3 critères, poids 15 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| TECH-12 | SPF record valide | `dig TXT` + parsing | INSTR | MUST |
| TECH-13 | DKIM record (≥ 2048 bits) | `dig TXT _domainkey` | INSTR | MUST |
| TECH-14 | DMARC `p=quarantine` ou `p=reject` | `dig TXT _dmarc` | INSTR | MUST |

## Dimension Stack & dépendances (4 critères, poids 20 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| TECH-15 | Détection technologies (Wappalyzer) | Wappalyzer CLI | INSTR | MUST |
| TECH-16 | CMS / framework à jour (CVE check) | Wappalyzer + check NVD | SEMI | SHOULD |
| TECH-17 | Subresource Integrity sur scripts tiers | Parsing `<script integrity>` | INSTR | SHOULD |
| TECH-18 | Cookies sécurisés (SameSite, Secure, HttpOnly) | Parsing headers `Set-Cookie` | INSTR | MUST |

## Dimension Crawlabilité (2 critères, poids 10 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| TECH-19 | 0 erreur console JavaScript | Puppeteer console listener | INSTR | SHOULD |
| TECH-20 | 0 lien interne cassé (404) | Crawl interne + check status | INSTR | MUST |

**Total TECH : 20 critères ✓**

---

# THÈME 6 — Contenu (qualité éditoriale & citabilité LLM) — 16 critères

> Set Contenu v2 — validé 07.04.2026. Conservé tel quel, avec mesure formalisée.

## Dimension Qualité éditoriale (6 critères, poids 35 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| CONT-01 | Longueur appropriée au type de page | `wc` + classification (service ≥ 400, article ≥ 800, landing ≥ 200, pilier ≥ 1500) | INSTR | MUST |
| CONT-02 | Lisibilité Flesch ≥ 50 (formule Kandel-Moles FR) | Calcul programmatique | INSTR | MUST |
| CONT-03 | Originalité du contenu | Copyscape API ou simhash | INSTR | MUST |
| CONT-04 | Fraîcheur datée visible | `dateModified` JSON-LD < 365 j sur pages stratégiques | INSTR | MUST |
| CONT-05 | Auteur identifié (nom, photo, fonction, lien bio) | JSON-LD `author Person` complet | INSTR | MUST |
| CONT-06 | Citations sourcées (références externes vérifiables) | Comptage liens externes vers sources autorité | INSTR | SHOULD |

## Dimension Citabilité LLM ⭐ (5 critères, poids 40 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| CONT-07 ⭐ | Statements factuels datés (≥ 3 par page stratégique) | NER + regex dates/chiffres/entités | SEMI | MUST |
| CONT-08 ⭐ | Entités nommées identifiées (≥ 5/1000 mots) | NER spaCy fr_core_news_lg | INSTR | MUST |
| CONT-09 ⭐ | Structure question/réponse (≥ 30 % H2/H3 en questions) | Regex sur Hn + détection point d'interrogation | INSTR | MUST |
| CONT-10 ⭐ | Contenu chunkable (paragraphes ≤ 3 phrases, autonomes) | Analyse paragraphes + détection références anaphoriques | SEMI | MUST |
| CONT-11 ⭐ | Tableaux et listes structurés (≥ 1 par 800 mots) | Comptage `<table>` et `<ul>/<ol>` | INSTR | MUST |

## Dimension Structure & navigation (5 critères, poids 25 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| CONT-12 | FAQ structurée avec schema.org FAQPage | Rich Results Test API | INSTR | MUST |
| CONT-13 | Liens internes contextuels (ancres descriptives) | Comptage + analyse texte ancre | INSTR | SHOULD |
| CONT-14 | Liens externes vers sources fiables (DA ≥ 60) | Comptage + check DA via Moz/Semrush | SEMI | SHOULD |
| CONT-15 | CTA explicites contextualisés (≥ 1 par page) | Détection boutons + position | DECL | MUST |
| CONT-16 | Témoignages / études de cas nommés | Comptage avec nom client + entreprise + résultats | DECL | MUST |

**Total CONT : 16 critères ✓**

---

# THÈME 7 — Éco-conception (RGESN express) — 14 critères

> Sous-ensemble pragmatique du RGESN officiel (79 critères). À renommer "Éco-conception MCVA Express" pour ne pas tromper sur le périmètre.

## Dimension Sobriété des assets (6 critères, poids 45 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| ECO-01 | Poids total de la page < 1.5 Mo | `curl` + somme assets | INSTR | MUST |
| ECO-02 | Lazy loading images systématique | Parsing `loading="lazy"` | INSTR | MUST |
| ECO-03 | Polices limitées (≤ 3 familles, ≤ 6 fichiers) | Parsing `@font-face` | INSTR | SHOULD |
| ECO-04 | Scripts tiers limités (≤ 5 domaines) | Comptage domaines tiers | INSTR | SHOULD |
| ECO-05 | Images dimensionnées (width/height HTML) | Parsing `<img>` | INSTR | SHOULD |
| ECO-06 | Requêtes HTTP totales < 50 | Comptage requêtes Puppeteer | INSTR | SHOULD |

## Dimension Sobriété UX (4 critères, poids 30 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| ECO-07 | Pagination (pas de scroll infini sur listings) | Détection pattern infinite scroll | DECL | SHOULD |
| ECO-08 | Pas d'autoplay vidéo/audio | Parsing `autoplay` attribute | INSTR | MUST |
| ECO-09 | Dark mode supporté | Parsing `prefers-color-scheme: dark` CSS | INSTR | NICE |
| ECO-10 | Print CSS défini | Parsing `@media print` | INSTR | NICE |

## Dimension Mesure d'impact (4 critères, poids 25 %)

| ID | Critère | Mesure | Type | Statut |
|---|---|---|---|---|
| ECO-11 | EcoIndex score (note A à G) | EcoIndex API (ecoindex.fr) | INSTR | MUST |
| ECO-12 | gCO2 par visite | Website Carbon API | INSTR | SHOULD |
| ECO-13 | DOM size < 1500 éléments | Puppeteer `document.querySelectorAll('*').length` | INSTR | SHOULD |
| ECO-14 | Tracking limité (≤ 2 outils analytics+marketing) | Wappalyzer + comptage trackers | INSTR | SHOULD |

**Total ECO : 14 critères ✓**

---

# Score GEO™ v2 — Composante transverse (5 % du score global)

Le Score GEO™ n'est pas un thème de critères mais une **mesure composite** issue d'un protocole de monitoring LLM, configurable selon 3 niveaux d'effort.

## Composantes (4 × 25 points = 100)

| Composante | Mesure | Source |
|---|---|---|
| **Présence** (0-25) | Mention Rate : % de prompts où la marque est citée | Monitoring LLM direct |
| **Exactitude** (0-25) | % de citations factuellement correctes | Validation manuelle ou LLM-as-judge |
| **Sentiment** (0-25) | Score sentiment moyen des citations | Analyse sentiment + LLM-as-judge |
| **Recommandation** (0-25) | Source Rate : % de prompts où le site est cité comme source | Monitoring LLM direct |

## 3 niveaux de mesure (sélectionnables par audit)

| Niveau | Prompts | LLMs | Runs | Datapoints | Usage cible | Coût LLM estimé |
|---|---|---|---|---|---|---|
| **Light** | 15 | 4 | 1 | 60 | Pré-audit, démo, test interne | < 1 CHF |
| **Standard** | 30 | 4 | 3 | 360 | Audit ultra vendu | 3-5 CHF |
| **Gold** | 50 | 4 | 3 | 600 | Audit stratégique, retainer | 8-12 CHF |

**LLMs cibles** : GPT-4o, Claude Sonnet 4.6, Perplexity Sonar Pro, Gemini 2.5 Pro

## Protocole standard (à formaliser dans Lot 3)

1. **Sélection des prompts** : 5 catégories obligatoires
   - Brand discovery (`qui est X`, `que fait X`)
   - Comparatif (`X vs concurrent`, `meilleur Y à Z`)
   - Recommandation locale (`meilleur X à [ville]`)
   - Use case (`comment résoudre [problème] avec X`)
   - Fact-checking (`combien de collaborateurs chez X`)
2. **Exécution** : appels API directs avec température fixe (0.7) et seed si supporté
3. **Scoring** : LLM-as-judge (Claude Sonnet 4.6) sur grille standardisée
4. **Stockage** : tous les datapoints bruts en base pour reproductibilité

## Seuils Score GEO™

| Score | Niveau | Interprétation |
|---|---|---|
| 0-25 | **Invisible** | La marque n'existe pas pour les LLMs |
| 26-50 | **Émergent** | Présence sporadique, pas de fiabilité |
| 51-75 | **Visible** | Présence régulière, citée en alternative |
| 76-100 | **Leader** | Référence sectorielle, citée en premier |

---

# Pondérations finales (récapitulatif)

| Thème | Poids | Critères MUST | Critères SHOULD | Critères NICE |
|---|---|---|---|---|
| SEO | 18 % | 27 | 17 | 6 |
| GEO | 22 % | 18 | 17 | 5 |
| Performance | 12 % | 11 | 8 | 1 |
| Accessibilité | 12 % | 16 | 9 | 0 |
| Technique & Sécurité | 10 % | 11 | 7 | 2 |
| Contenu | 15 % | 12 | 4 | 0 |
| Éco-conception | 6 % | 4 | 8 | 2 |
| Score GEO™ composite | 5 % | (transverse) | — | — |
| **TOTAL** | **100 %** | **99** | **70** | **16** |

**185 critères atomiques + Score GEO™ composite.**

---

# Validation et prochaines étapes

## Checklist de validation Lot 1

- [ ] Tous les critères ont un ID unique et stable
- [ ] Toutes les dimensions ont leurs poids définis
- [ ] Pondérations cohérentes (somme = 100 % par thème)
- [ ] 99 critères MUST = socle minimum d'audit ultra
- [ ] Aucun doublon entre thèmes (sauf intentionnel : Authority Score figure dans SEO-R-01 et GEO-CI-C-01 car mesure une chose unique mais comptée dans deux dimensions distinctes)
- [ ] Tous les critères ont un type de mesure défini

## Lots suivants (rappel)

- **Lot 2** — Spécification des mesures : pour chaque critère, formule exacte de conversion mesure → étoiles, seuils numériques, API utilisée, gestion des cas limites
- **Lot 3** — Protocole Score GEO™ v2 : liste des 50 prompts gold, méthode de sélection, grille LLM-as-judge
- **Lot 4** — Schéma DB Supabase : tables `audits`, `criteria`, `measurements`, `actions`, `share_tokens`
- **Lot 5** — Scoring engine : formules de pondération et agrégation thème → score global
- **Lot 6** — Moteur de mesure Node.js
- **Lot 7** — Dashboard Next.js
- **Lot 8** — Template PDF v2
- **Lot 9** — Mise à jour des instructions Pôle Performance
- **Lot 10** — Audit pilote bout-en-bout

---

*MCVA Consulting SA — Audit Framework v2.0 — Lot 1/10 — Version draft du 08.04.2026*
*Document de travail — À valider par Jérôme Deshaie avant passage au Lot 2*
