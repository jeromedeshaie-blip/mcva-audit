# MCVA Audit v4 — Score GEO™ Protocol v0 (REF-2026-016)

**Version** : 4.0-draft
**Date** : 2026-05-25
**Statut** : En cours d'exécution
**Documents fondateurs** :
- Cahier MCVA n°1 *Mesurer la citabilité IA après mai 2026* (V0, 25.05.2026)
- REF-2026-015 — Panier de référence v0.1
- REF-2026-016 — Protocole de mesure et codage Score GEO™ v0

**Timeline critique** : Mi-juin 2026 — démarrage captures Cahier n°2 (≤ 3 semaines)
**Repo** : `jeromedeshaie-blip/mcva-audit`

---

## 1. Bascule stratégique

La plateforme v2.1 (audit SEO/GEO) + LLM Watch v2 (monitoring automatique) sont **conservés**, mais le **Score GEO™** propriétaire au sens du protocole REF-2026-016 est un **produit éditorial distinct** qui nécessite codage humain assisté.

### Architecture à 2 produits validée

| Produit | Cible | Méthode |
|---|---|---|
| **Score GEO™** (le "vrai", REF-2026-016) | Cahiers MCVA + mandats premium | Codage humain par annotateurs entraînés, 5 LLMs, 7 thèmes, pondération propriétaire, audit externe possible |
| **Score GEO Live™** (renommage LLM Watch v2) | Monitoring continu clients, pré-audit | LLM-as-judge automatique, 4 LLMs, 4 composantes simplifiées, "estimation rapide non auditée" |

### Justification éditoriale (Cahier n°1)

> "Un score produit par un système automatique se réplique trivialement et perd son autorité ; un score produit par une méthode codifiée, appliquée par des annotateurs entraînés, sous contrôle de fiabilité inter-juges, et adossé à une grille publique sur sa structure mais propriétaire sur sa pondération, constitue un actif éditorial durable."

---

## 2. Référentiel à respecter (REF-2026-016)

### 2.1 Modèles standards : 5 LLMs

| Code | Modèle | Statut plateforme actuelle |
|---|---|---|
| `GPT` | ChatGPT (gpt-4o-2024-11-20) | ✅ intégré |
| `CLAUDE` | Claude (claude-sonnet-4-5-20250929) | ✅ intégré |
| `PRPLX` | Perplexity (sonar-pro) | ✅ intégré |
| `GEMINI` | Gemini (gemini-2.5-pro) | ✅ intégré |
| `MSTRL` | Mistral (Le Chat / API) | ❌ **À ajouter** |

### 2.2 Conditions de capture

- Session vierge, sans historique
- Interface publique standard du modèle
- Aucun system prompt personnalisé
- Aucun mode connecté (sauf si défaut du modèle, à consigner)

### 2.3 Identifiant unique de mesure

Format obligatoire :
```
[code_panier]-[id_requête]-[code_modèle]-[itération]-[timestamp_ISO]
```

Exemple : `C2-V1.D.07-CLAUDE-T0-20260615T1430CEST`

### 2.4 Champs obligatoires par réponse (7)

1. Identifiant unique
2. Texte intégral de la requête
3. Texte intégral de la réponse (sans coupure)
4. Métadonnées d'exécution (modèle, version, interface, langue, horodatage)
5. Identifiant de l'opérateur
6. Statut : `complete | refus | vide | erreur | clarification | partial`
7. Liens sortants présents dans la réponse

### 2.5 Grille de codage à 7 thèmes

**Codés par annotateur sur échelle entière 0-10** :
- T1 — Présence citationnelle
- T2 — Proéminence éditoriale
- T3 — Contexte de citation
- T4 — Exactitude factuelle
- T5 — Ancrage des sources

**Calculés en aval (variance)** :
- T6 — Cohérence inter-modèles (variance sur T1-T5 entre 5 LLMs)
- T7 — Stabilité temporelle (variance sur T1-T5 entre T0/T1/T2)

### 2.6 Pondération propriétaire

`Σ (Score_thème_i × Pondération_i) × 10` où Σ porte sur les 7 thèmes, chaque Score_thème_i dans [0,10], pondération privée par mandat.

Échelle finale : **0-100** pour lisibilité dirigeant.

### 2.7 Contrôle inter-juges

- 10-15% des réponses double-codées
- Tirage aléatoire stratifié par (vertical × famille requête × modèle)
- Seuil cohérence par thème : **≥ 75%** (scores à distance 0 ou 1)
- Re-calibrage déclenché si seuil non atteint
- Arbitrage Senior Éditorial dans la semaine

### 2.8 Dossier d'archive obligatoire (conservation 24-48 mois)

8 éléments à conserver :
1. Panier de référence figé
2. Corpus brut + identifiants + métadonnées
3. Fiches d'annotation complètes
4. Sous-corpus double-codé + écart inter-juges
5. Table entités observées du mandat
6. Pondération thématique appliquée
7. Calcul détaillé du score
8. Profil thématique restitué

---

## 3. Plan d'exécution Phase 4

### Phase 4A — Foundation (5-7 jours) ⭐ urgent

**Objectif** : Aligner la plateforme sur les conventions REF-2026-016 sans casser l'existant.

1. **Migration DB v4** — 6 nouvelles tables :
   - `score_geo_campaigns` (panier figé, dates, statut)
   - `score_geo_observed_entities` (panel d'entreprises observées par campagne)
   - `score_geo_responses` (corpus brut, identifiants uniques)
   - `score_geo_codings` (fiches annotation, scores 5 thèmes)
   - `score_geo_annotators` (calibrage, taux cohérence)
   - `score_geo_archives` (export dossier d'archive)

2. **Renommage UI** : "LLM Watch" → "Score GEO Live" partout
   - Mention explicite : "Estimation automatique. Pour le Score GEO™ propriétaire (codage humain selon REF-2026-016), contactez MCVA."

3. **Ajout Mistral** (5e LLM) :
   - `src/lib/llm-providers.ts` : ajouter provider Mistral
   - Choix : Le Chat web ou Mistral Large API
   - Test sur audit existant

4. **Format identifiants uniques** :
   - Helper `formatScoreGeoId(panier, reqId, model, iteration, timestamp)`
   - Stocké dans `score_geo_responses.unique_id`

5. **Statut réponse normalisé** :
   - Enum : `complete | refus | vide | erreur | clarification | partial`
   - Détection automatique heuristique + override manuel possible

**Livrable** : commit + tag `v4-phase-4a`

---

### Phase 4B — Module Capture Campagne (5-7 jours)

**Objectif** : Exécuter automatiquement une campagne complète (panier × 5 LLMs × itérations) et stocker le corpus.

1. **Page** `/score-geo/campaigns/new`
   - Formulaire : nom campagne, code panier, panel entités, modèles activés, itérations
   - Upload du panier (CSV ou JSON)

2. **Inngest job** `runScoreGeoCampaign`
   - Itère sur (requête × LLM × itération)
   - 645 req × 5 LLMs × 1 itération = 3 225 captures pour Cahier n°2
   - + 129 req × 5 LLMs × 2 itérations T1/T2 = 1 290 captures supplémentaires
   - Background, status updates en DB

3. **API GET `/api/score-geo/campaigns/[id]`**
   - Status, progression, erreurs

4. **Export corpus** :
   - JSON pour annotateurs (fiches préparées par réponse)
   - CSV pour analyse externe

**Livrable** : commit + tag `v4-phase-4b`

---

### Phase 4C — Interface d'annotation humaine (5-7 jours)

**Objectif** : Permettre aux annotateurs entraînés de coder les réponses sur les 5 thèmes.

1. **Page** `/score-geo/codage/[campaign_id]`
   - Liste des réponses à coder (filtre par annotateur, statut, modèle)
   - Réponse côte à côte avec fiche d'annotation

2. **Fiche d'annotation** :
   - 5 thèmes × score entier 0-10
   - Notes libres par thème
   - Sélection entités observées présentes
   - Bouton "Sauver et suivant"
   - Idempotent (annotateur peut revenir modifier)

3. **Dashboard annotateur** :
   - Réponses assignées
   - Progression (X/Y codées)
   - Temps moyen par réponse

4. **Tracking** :
   - Identifiant annotateur dans chaque fiche
   - Horodatage début/fin codage
   - Version de la grille appliquée

**Livrable** : commit + tag `v4-phase-4c`

---

### Phase 4D — Inter-juges + calcul agrégé (3-5 jours)

**Objectif** : Workflow inter-juges + calcul automatique T6/T7.

1. **Tirage stratifié** :
   - 10-15% des réponses sélectionnées (vertical × famille × modèle)
   - Double codage par 2 annotateurs indépendants
   - Vue côte-à-côte pour comparaison

2. **Calcul cohérence inter-juges** :
   - Par thème : ratio des scores à distance ≤ 1 / total scores croisés
   - Alerte automatique si < 75%
   - Trigger re-calibrage

3. **Arbitrage Senior Éditorial** :
   - Vue divergences
   - Score arbitré stocké dans `score_geo_codings.arbitrated_score`
   - Délai 1 semaine après identification

4. **Calcul Thème 6 (cohérence inter-modèles)** :
   - Variance des scores T1-T5 entre les 5 LLMs sur même requête
   - Normalisation 0-10 (formule à valider avec Data Analyst)

5. **Calcul Thème 7 (stabilité temporelle)** :
   - Variance sur sous-échantillon stabilité (129 req × 3 itérations T0/T1/T2)
   - Normalisation 0-10

**Livrable** : commit + tag `v4-phase-4d`

---

### Phase 4E — Score GEO™ global + restitution (3-5 jours)

**Objectif** : Calcul final + radar 7 axes + dossier d'archive.

1. **Configuration pondération propriétaire** :
   - Table `score_geo_weights` (campaign_id, theme_id, weight)
   - Pondération définie en amont, figée pendant la mesure
   - Non publiée (admin only)

2. **Calcul Score GEO™ par entité observée** :
   - Formule : `Σ (Score_thème × Pondération) × 10`
   - Sortie : score global 0-100 + profil 7 thèmes

3. **Restitution radar** :
   - SVG radar à 7 axes (charte v3.2)
   - Commentaire prose : 2 thèmes forts + 2 thèmes faibles + lecture stratégique
   - Génération via Claude Sonnet (action-plan adapté)

4. **Export dossier d'archive** (ZIP) :
   - Panier figé
   - Corpus brut + métadonnées
   - Fiches annotation
   - Sous-corpus double-codé
   - Table entités
   - Pondération
   - Calcul détaillé
   - Profil thématique

**Livrable** : commit + tag `v4-phase-4e`

---

### Phase 4F — Audit externe + reproductibilité (2-3 jours)

**Objectif** : Garantir conformité audit externe + comparaison T0 vs T+3.

1. **Page** `/score-geo/audit/[campaign_id]` (vue lecture seule pour auditeur tiers)
   - Pas d'accès à la pondération (confidentielle)
   - Visibilité corpus, fiches, écarts inter-juges, calcul intermédiaire

2. **5 conditions de reproductibilité** vérifiées automatiquement :
   - Panier identique entre T0 et T+3
   - Modèles identiques (sinon flag "non-strictement comparable")
   - Hygiène session identique
   - Pondération identique
   - Annotateurs entraînés sur même grille

3. **Comparaison T0 vs T+3** :
   - Vue côte-à-côte par thème
   - Delta par entité observée
   - Annotation des conditions changées

**Livrable** : commit + tag `v4-phase-4f` + `v4-release`

---

## 4. Roadmap (≤ 3 semaines)

| Semaine | Phase | Livrable |
|---|---|---|
| **S1 (25.05 → 31.05)** | 4A | Foundation + Mistral + IDs |
| **S2 (01.06 → 07.06)** | 4B | Module Capture Campagne |
| **S3 (08.06 → 14.06)** | 4C | Interface annotation |
| **S4 (15.06 → 21.06)** | 4D + 4E + 4F | Inter-juges + restitution + audit |

**15 juin = lancement captures Cahier n°2 (selon protocole §6).** Donc 4A + 4B doivent **impérativement** être livrés avant cette date.

---

## 5. Critères de succès

Avant validation v4 :

- [ ] Mistral intégré et testé (capture identique aux 4 autres LLMs)
- [ ] Format identifiant unique respecté partout
- [ ] Campagne 645 req × 5 LLMs créée et lancée en arrière-plan sans timeout
- [ ] Interface annotation fonctionnelle avec score 0-10 entier + notes
- [ ] Tirage stratifié inter-juges automatique
- [ ] Calcul T6/T7 automatique (variance)
- [ ] Pondération privée par mandat fonctionnelle
- [ ] Radar 7 axes + commentaire prose généré
- [ ] Export dossier d'archive ZIP complet
- [ ] Score GEO Live™ (LLM Watch) renommé + warning explicite

---

## 6. Points en attente arbitrage CEO (§7 du protocole)

À confirmer avant figement v4 :

1. **Échelle entière 0-10 ou décimale avec demi-points** sur T1-T5 ? → défaut entière
2. **Seuil cohérence inter-juges** déclenchant re-calibrage ? → défaut 75%
3. **Codage simultané plusieurs entités observées sur une même réponse** ? → défaut oui, une fiche par entité

---

## 7. Hors scope Phase 4 (éventuel v4.1)

- Panel d'entités observées (livrable distinct, à arbitrer en amont)
- Connecteur Mistral via API Large vs scraping Le Chat (à choisir)
- Intégration agent-mode pour captures (Anthropic Agent SDK / Claude Code SDK)
- Anonymisation automatique des cas analysés (pour Cahiers publiés)

---

*MCVA Consulting SA — Plan Phase 4 v4.0-draft — 2026-05-25*
*Document fondateur : Cahier n°1 + REF-2026-015 + REF-2026-016*
*Executeur : Claude Code (autonomous mode)*
*Validateur : Jérôme Deshaie, CEO*
