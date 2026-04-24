# 18 — Local Crawler Troubleshooting

**Phase** : 3B v3 hybrid architecture

Liste des erreurs courantes et solutions.

---

## 🔴 Ollama — serveur LLM

### `Connection refused on localhost:11434`

Ollama n'est pas démarré.

```bash
# Vérifier
curl http://localhost:11434/api/tags

# Si erreur, démarrer
ollama serve &

# Vérifier que le port est pris
lsof -i :11434
```

Sur Mac, Ollama peut être installé comme app (menubar). Ouvrir l'app suffit.

### `Model gemma4:31b not found`

```bash
# Pull le modèle
ollama pull gemma4:31b

# Lister les modèles installés
ollama list

# Si pas assez d'espace disque, supprimer les vieux modèles
ollama rm <old_model_name>
```

### `Ollama returned invalid JSON` / extraction incomplète

Gemma 4 31B peut halluciner sur des HTMLs très complexes. Options :

```bash
# Option 1 : Bascule temporaire sur le 26B MoE (plus rapide, différent)
MCVA_LOCAL_LLM=gemma4:26b python audit_local.py --url ...

# Option 2 : Réduire la taille HTML dans audit_local.py
# Éditer ligne "truncated = html[:40000]" → [:25000]

# Option 3 : Crawler moins de pages
python audit_local.py --max-pages 3 --url ...
```

### Ollama mange toute la RAM

Mac Studio 92 Go, Gemma 4 31B Q4 prend ~20 Go. Si tu as d'autres apps gourmandes (Xcode, Chrome avec 100 tabs) :

```bash
# Vérifier la RAM utilisée par Ollama
ps aux | grep ollama

# Arrêter Ollama
killall ollama

# Unload les modèles en cache (keep alive 5min par défaut)
curl http://localhost:11434/api/generate -d '{"model":"gemma4:31b","keep_alive":0}'
```

---

## 🔴 Playwright — crawler

### `chromium executable doesn't exist`

```bash
# Dans le venv du crawler
python -m playwright install chromium

# Si erreur de permissions sur Mac
sudo python -m playwright install chromium --with-deps
```

### `TimeoutError: Navigation timeout of 30000ms exceeded`

Le site est trop lent ou ne fait jamais `networkidle`.

Options :
```bash
# Augmenter le timeout dans .env
CRAWL_TIMEOUT_SECONDS=60

# Ou changer la wait condition dans audit_local.py
# Remplacer: wait_until="networkidle"
# Par:       wait_until="domcontentloaded"  # plus permissif
```

### Site SPA (Wix / Webflow) qui ne rend rien

Le script détecte automatiquement (`spa_detected: true`). Si l'extraction est vide, le site nécessite une interaction utilisateur (scroll, click). Non supporté actuellement.

Workaround : auditer manuellement en mode dégradé via le wizard Ultra 6 blocs.

### `net::ERR_CERT_AUTHORITY_INVALID`

Certificat auto-signé / expiré. Ajouter dans `audit_local.py` :
```python
# Dans context = await browser.new_context(...)
context = await browser.new_context(
    user_agent=USER_AGENT,
    locale="fr-CH",
    ignore_https_errors=True,  # ← ajouter
)
```

⚠ À utiliser uniquement pour tests/debug — pas pour audits réels.

---

## 🔴 API MCVA — upload

### `401 Auth failed: not_found`

La clé API n'existe pas ou a été révoquée.

- Vérifier dans `/settings/api-keys` qu'elle est bien "active"
- Si absente : régénérer
- Si présente mais erreur : bien copier la valeur `mcva_live_...` complète (pas juste le prefix)

### `401 Auth failed: invalid_format`

La clé ne commence pas par `mcva_live_` ou `mcva_test_`. Vérifier `.env` n'a pas de typo.

### `403 API key scope insufficient`

La clé existe mais n'a pas le scope `audit-import`. Régénérer avec le bon scope ou `full`.

### `400 Parked domain detected`

Le site cible est un domaine parqué (Nameshift, Sedo, GoDaddy...). Le serveur refuse pour éviter de gaspiller des tokens LLM. Vérifier la vraie URL du site client.

### `422 Validation errors`

Le payload JSON ne respecte pas le schéma v3.0. Lire les messages d'erreur, ils indiquent le champ manquant/invalide. Si tu as modifié le script, comparer avec `src/types/local-import.ts`.

### `500 DB insert failed`

Problème côté serveur. Vérifier :
1. Supabase est up : https://supabase.com/dashboard/project/azgszqlhdhzcaofvixqi
2. Logs Vercel : https://vercel.com/jeromedeshaie-blips-projects/mcva-audit/logs

---

## 🔴 Script Python

### `ModuleNotFoundError: No module named 'playwright'`

Le venv n'est pas activé.

```bash
cd tools/local-crawler
source .venv/bin/activate   # ← devrait afficher (.venv) devant
python audit_local.py --url ...
```

### `MCVA_API_KEY manquante dans .env`

Le script ne trouve pas le `.env`. Vérifier :
```bash
pwd   # Devrais être dans tools/local-crawler
ls -la .env   # Le fichier doit exister
cat .env | grep MCVA_API_KEY   # La clé doit y être
```

### `json.decoder.JSONDecodeError: Expecting value`

Gemma a retourné un JSON cassé. Le script devrait retomber sur `build_empty_extraction()` automatiquement. Si ça persiste sur toutes les pages, c'est un problème Ollama (voir section Ollama).

### `asyncio RuntimeError: This event loop is already running`

Bug Python-Playwright sur certains macOS. Fix :
```bash
pip install --upgrade playwright pydantic
python -m playwright install chromium --force
```

### Script s'arrête sans message après "Crawling..."

Playwright a planté silencieusement. Debug :
```bash
# Lancer avec logs verbose
PLAYWRIGHT_DEBUG=1 python audit_local.py --url https://mcva.ch --sector tech-saas --dry-run
```

---

## 🔴 Permissions macOS

### `Operation not permitted` sur cache/output

macOS bloque l'accès aux dossiers sensibles. Déplacer le projet hors de iCloud/Desktop :

```bash
# Bouger vers ~/Dev ou ~/Projects
mv /Users/jeromedeshaie/Desktop/mcva-audit ~/Projects/
```

### Playwright bloqué par Gatekeeper

```bash
# Autoriser explicitement
sudo xattr -dr com.apple.quarantine ~/Library/Caches/ms-playwright/
```

---

## 🔴 Performance / Timeouts

### Extraction trop lente (>5 min pour 10 pages)

Probable que Gemma soit swap en mémoire. Check :
```bash
# Monitor Ollama pendant l'extraction
vm_stat 1   # dans un autre terminal

# Si swap actif → RAM saturée
# Solutions:
# - Fermer d'autres apps (Chrome, Xcode, etc.)
# - Bascule temporaire sur gemma4:26b (16 Go au lieu de 20 Go)
# - Ou gemma4:e4b (4 Go, qualité moindre)
```

### Upload timeout (60s Vercel)

Si le payload est > ~10 MB, l'upload peut timeout. Vérifier :
```bash
# Taille du payload produit
ls -lh output/*.json | tail -1
```

Si trop gros → réduire `MAX_PAGES_PER_CRAWL` ou truncate `html_truncated` dans le code.

---

## 🟡 Diagnostics généraux

### Dry-run d'abord

**Toujours** tester avec `--dry-run` avant un vrai audit si tu as changé quelque chose :
```bash
python audit_local.py --url https://exemple.ch --sector tech-saas --dry-run
```

Puis inspecter `output/*.json` à la main.

### Check de santé global

```bash
# 1. Python + venv
python --version
pip list | grep -E "playwright|pydantic|requests"

# 2. Ollama + Gemma
curl -s http://localhost:11434/api/tags | python -m json.tool

# 3. API MCVA + auth
curl -s https://mcva-audit.vercel.app/api/audit-import/from-local
# Devrais retourner un JSON avec schema_version, docs, etc.

# 4. Test avec ta clé
curl -s -X POST https://mcva-audit.vercel.app/api/audit-import/from-local \
  -H "X-MCVA-Import-Key: $MCVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"foo":"bar"}'
# Devrait retourner 422 avec errors[] — prouve que l'auth passe
```

---

## Quand tout échoue

1. **Logs Vercel** : https://vercel.com/jeromedeshaie-blips-projects/mcva-audit/logs (filter `/api/audit-import`)
2. **Logs Ollama** : vérifier le terminal où `ollama serve` tourne
3. **Dashboard Supabase** : https://supabase.com/dashboard/project/azgszqlhdhzcaofvixqi (table `audit_local_extractions`)
4. **Demander de l'aide** : ouvrir une issue GitHub avec le JSON output + message d'erreur complet

---

## Voir aussi

- [17 — Local Crawler Setup](./17-local-crawler-setup.md)
- [19 — Schéma JSON LocalImportPayload](./19-local-import-schema.md)

*MCVA Consulting SA — Troubleshooting v3.0 — 2026-04-24*
