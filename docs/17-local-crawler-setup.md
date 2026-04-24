# 17 — Local Crawler Setup (Mac Studio M3 Ultra)

**Phase** : 3B v3 hybrid architecture
**Date** : 2026-04-24
**Pré-requis** : Mac Studio M3 Ultra avec 64 Go RAM minimum (92 Go recommandé pour Gemma 4 31B confortable)

Guide d'installation complet pour transformer ton Mac en crawler d'audit local.

---

## Step 1 — Pré-requis système

### Python 3.12+

```bash
# Vérifier la version installée
python3 --version
# Si < 3.12, installer via Homebrew
brew install python@3.12

# S'assurer que pip est à jour
python3.12 -m pip install --upgrade pip
```

### Ollama (serveur LLM local)

```bash
# Installation
curl -fsSL https://ollama.com/install.sh | sh

# Vérifier l'installation
ollama --version

# Lancer le daemon en background
ollama serve &

# Test de connexion
curl http://localhost:11434/api/tags
```

### Gemma 4 31B (modèle LLM)

```bash
# Pull du modèle (~20 GB, 5-10 min selon connexion)
ollama pull gemma4:31b

# Test que le modèle répond
ollama run gemma4:31b "Réponds en un mot: oui."
# Attendu: "Oui." ou similaire

# Vérifier la liste des modèles installés
ollama list
```

### Git + repo

```bash
# Cloner le repo si pas déjà fait
git clone git@github.com:jeromedeshaie-blip/mcva-audit.git
cd mcva-audit

# Aller dans le dossier crawler
cd tools/local-crawler
```

---

## Step 2 — Setup de l'environnement Python

```bash
# Créer un venv isolé (recommandé)
python3.12 -m venv .venv
source .venv/bin/activate

# Prompt devrait maintenant afficher (.venv) devant
# Si tu quittes le terminal, refaire: source .venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Installer le navigateur Playwright (~300 MB)
python -m playwright install chromium

# Vérifier que tout est bien installé
python -c "import playwright, pydantic, requests, rich; print('OK')"
```

---

## Step 3 — Générer une clé API MCVA

1. Ouvrir https://mcva-audit.vercel.app/settings/api-keys
2. Se connecter si besoin
3. Cliquer **"Générer une clé"**
4. Remplir :
   - **Label** : `mac-studio-local` (ou autre)
   - **Scope** : `audit-import`
5. Cliquer **Générer**
6. **COPIER IMMÉDIATEMENT** la clé affichée (format `mcva_live_xxxxx...`)
7. Elle ne sera plus jamais affichée — si perdue, il faudra en créer une nouvelle

---

## Step 4 — Configuration .env

```bash
# Dans tools/local-crawler/
cp .env.example .env

# Éditer .env avec ton éditeur préféré
nano .env
# ou
cursor .env
```

Remplir :
```bash
MCVA_API_URL=https://mcva-audit.vercel.app
MCVA_API_KEY=mcva_live_xxxxxxxxxxxxxxxxxxxxxx  # Coller ta clé ici

OLLAMA_ENDPOINT=http://localhost:11434
MCVA_LOCAL_LLM=gemma4:31b

MAX_PAGES_PER_CRAWL=10
CRAWL_TIMEOUT_SECONDS=30
USER_AGENT=MCVAAuditBot/3.0 (+https://mcva.ch/audit)

OUTPUT_DIR=./output
CACHE_DIR=./cache
```

**⚠ Sécurité** : le fichier `.env` est gitignored. Ne jamais le commit.

---

## Step 5 — Premier audit

### Test en dry-run (pas d'upload)

```bash
python audit_local.py \
  --url https://mcva.ch \
  --sector services-conseil \
  --audit-type pre_audit \
  --quality eco \
  --max-pages 3 \
  --dry-run
```

Vérifier que `output/mcva.ch-xxx.json` est créé et contient des données pertinentes.

### Audit réel

```bash
# Audit Ultra complet sur un client
python audit_local.py \
  --url https://fdmfidu.ch \
  --sector finance-fiduciaire \
  --brand "FDM Fiduciaire" \
  --audit-type ultra \
  --quality premium
```

---

## Step 6 — Vérification sur le dashboard

1. Ouvrir https://mcva-audit.vercel.app/audit-local
2. L'import doit apparaître en haut de la liste
3. Cliquer sur le nom de domaine → voir l'audit scoré
4. Téléchargement PDF possible dès que le status passe à `completed`

---

## Bonnes pratiques

### Nommer les API keys avec le contexte

| Label | Usage |
|---|---|
| `mac-studio-local` | Crawler depuis le Mac Studio principal |
| `laptop-jd-test` | Tests sur le laptop de Jérôme |
| `ci-github` | Si un jour tu veux automatiser via GitHub Actions |

### Rotation des clés

- Régénérer tous les 6 mois pour limiter l'exposition
- Révoquer immédiatement une clé si tu soupçonnes une fuite
- Une clé = une machine (pas de partage)

### Cache SHA-256

- Le dossier `cache/` contient les extractions Gemma déjà faites
- Si tu re-crawles le même site, les HTMLs identiques sont réutilisés (pas d'appel Gemma)
- Pour forcer un re-crawl complet : `rm -rf cache/`

### Performance

| Config | Temps / audit 10 pages |
|---|---|
| Crawl seul (Playwright) | 30-60 s selon site |
| Extraction Gemma 4 31B | 15-25 s |
| Upload + création audit | 2-5 s |
| **Total** | **~1-2 min** |

Le bottleneck principal est le **site** (réseau + rendering JS), pas le LLM.

### Parallélisation future

Si tu veux crawler plusieurs sites en batch :
```bash
# Simple loop bash
for url in https://site1.ch https://site2.ch https://site3.ch; do
  python audit_local.py --url "$url" --sector finance-fiduciaire --quality standard
done
```

---

## Voir aussi

- [18 — Troubleshooting Local Crawler](./18-local-crawler-troubleshooting.md)
- [19 — Schéma JSON LocalImportPayload](./19-local-import-schema.md)
- `tools/local-crawler/README.md` — version condensée de ce guide
- `src/types/local-import.ts` — types TypeScript côté web app
- `MCVA-AUDIT-v3-HYBRID-MASTER-PLAN.md` — master plan architecture v3

*MCVA Consulting SA — Setup guide v3.0 — 2026-04-24*
