---
title: MCVA Audit Framework v2.0 — Lot 2A — Spécification des mesures instrumentées
version: "2.0"
status: "DRAFT — Lot 2A du chantier framework"
date: "2026-04-08"
scope: "Thèmes PERF, A11Y, TECH, ECO — 79 critères instrumentés"
owner: "Jérôme Deshaie, CEO MCVA Consulting SA"
depends_on: "Lot 1 — Référentiel atomique des 185 critères"
---

# Lot 2A — Spécification des mesures instrumentées

## Préambule

Ce document spécifie **comment mesurer concrètement** chacun des 79 critères des thèmes PERF, A11Y, TECH et ECO. Pour chaque critère :

1. **API ou outil utilisé** (nom, URL, version)
2. **Paramètres d'appel** (méthode, headers, body, query params)
3. **Champ JSON à extraire** (chemin précis dans la réponse)
4. **Formule de conversion** mesure brute → score 0-100 → étoiles 0-5
5. **Cas limites** (donnée absente, erreur API, timeout, valeur aberrante)
6. **Coût et latence** estimés

Ce document est le **cahier des charges technique** du moteur de mesure (Lot 6). Chaque critère ici doit avoir une fonction TypeScript correspondante dans `src/lib/audit-engine/measurements/`.

---

## Convention de barème universelle

Pour tous les critères, la conversion mesure brute → étoiles suit ce schéma :

```typescript
// src/lib/audit-engine/scoring.ts
export type Stars = 0 | 1 | 2 | 3 | 4 | 5;

export function scoreToStars(score: number): Stars {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  if (score >= 15) return 1;
  return 0;
}

export interface Measurement {
  criterionId: string;             // ex: "PERF-01"
  rawValue: number | string | null;
  unit: string;                    // ex: "ms", "ratio", "count"
  score: number;                   // 0-100
  stars: Stars;                    // 0-5
  status: "ok" | "warning" | "fail" | "error" | "skipped";
  source: string;                  // API utilisée
  measuredAt: string;              // ISO timestamp
  details?: Record<string, unknown>;
  error?: string;
}
```

---

## Outils et APIs externes — inventaire

| Outil | Coût | Auth | Doc |
|---|---|---|---|
| **Google PageSpeed Insights API** | Gratuit (25 000 req/jour) | API key Google Cloud | https://developers.google.com/speed/docs/insights/v5/get-started |
| **SSL Labs API v3** | Gratuit (rate-limited 1 req/s) | Aucune | https://github.com/ssllabs/ssllabs-scan/blob/master/ssllabs-api-docs-v3.md |
| **securityheaders.com API** | Gratuit | Aucune | https://securityheaders.com/api/ |
| **axe-core** (lib npm) | Gratuit (open source) | — | `npm install @axe-core/puppeteer` |
| **Puppeteer** | Gratuit | — | Pour navigation, axe-core, screenshots |
| **Lighthouse CLI** | Gratuit | — | Alternative locale à PSI API |
| **EcoIndex API** | Gratuit | Aucune | https://www.ecoindex.fr/api/ |
| **Website Carbon API** | Gratuit | Aucune | https://api.websitecarbon.com/ |
| **W3C HTML Validator** | Gratuit | Aucune | https://validator.w3.org/nu/?out=json |
| **dig (BIND)** | Local CLI | — | Pour DNS/SPF/DKIM/DMARC/DNSSEC |
| **curl** | Local CLI | — | Pour headers HTTP, redirections, taille |
| **Wappalyzer CLI** | Gratuit | — | `npm install wappalyzer` |

**Aucun coût récurrent pour ces 79 critères.** Tout est gratuit ou local.

---

# THÈME 3 — Performance (20 critères)

## PERF-01 — LCP (Largest Contentful Paint)

**Mesure**
- **API** : Google PageSpeed Insights v5
- **URL** : `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
- **Méthode** : GET
- **Query params** :
  - `url={target_url}` (URL-encoded)
  - `strategy=mobile`
  - `category=performance`
  - `key={GOOGLE_API_KEY}`
- **Champ extrait** : `lighthouseResult.audits["largest-contentful-paint"].numericValue` (en ms)
- **Source préférée** : `loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile` (CrUX p75 réel) si disponible, sinon Lighthouse lab data en fallback

**Formule**
```typescript
function scorePERF01(lcpMs: number): number {
  if (lcpMs <= 2500) return 100;       // Bon (Google standard)
  if (lcpMs <= 4000) return 60;        // À améliorer
  return Math.max(0, 60 - (lcpMs - 4000) / 100); // Mauvais — décroissance linéaire
}
```

**Seuils étoiles**
| LCP | Score | Étoiles |
|---|---|---|
| ≤ 2 000 ms | 100 | ★★★★★ |
| ≤ 2 500 ms | 90 | ★★★★★ |
| ≤ 3 000 ms | 75 | ★★★★☆ |
| ≤ 4 000 ms | 60 | ★★★☆☆ |
| ≤ 5 000 ms | 40 | ★★☆☆☆ |
| > 5 000 ms | 20-0 | ★☆☆☆☆ ou ☆☆☆☆☆ |

**Cas limites**
- API down → statut `error`, retry 2 fois avec backoff exponentiel
- Donnée CrUX absente → fallback sur Lighthouse lab + flag `details.source = "lab"` dans le résultat
- URL inaccessible (4xx/5xx) → statut `fail`, score 0
- Timeout > 60 s → statut `error`, score `null`

**Coût** : 1 appel API gratuit, latence ~15-30 s

---

## PERF-02 — CLS (Cumulative Layout Shift)

**Mesure**
- **API** : Google PageSpeed Insights v5 (même appel que PERF-01, on extrait plusieurs métriques en une fois)
- **Champ extrait** : `lighthouseResult.audits["cumulative-layout-shift"].numericValue`
- **Source préférée** : `loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100`

**Formule**
```typescript
function scorePERF02(cls: number): number {
  if (cls <= 0.1) return 100;
  if (cls <= 0.25) return 60;
  return Math.max(0, 60 - (cls - 0.25) * 200);
}
```

**Seuils étoiles**
| CLS | Score | Étoiles |
|---|---|---|
| ≤ 0.05 | 100 | ★★★★★ |
| ≤ 0.10 | 90 | ★★★★★ |
| ≤ 0.15 | 75 | ★★★★☆ |
| ≤ 0.25 | 60 | ★★★☆☆ |
| ≤ 0.40 | 30 | ★☆☆☆☆ |
| > 0.40 | 0 | ☆☆☆☆☆ |

**Cas limites** : identiques à PERF-01.

---

## PERF-03 — INP (Interaction to Next Paint)

**Mesure**
- **API** : PSI v5 (même appel)
- **Champ extrait** : `loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT.percentile` (CrUX p75)
- **Fallback Lighthouse** : `lighthouseResult.audits["interaction-to-next-paint"].numericValue`

**Formule**
```typescript
function scorePERF03(inpMs: number): number {
  if (inpMs <= 200) return 100;
  if (inpMs <= 500) return 60;
  return Math.max(0, 60 - (inpMs - 500) / 20);
}
```

**Seuils étoiles**
| INP | Score | Étoiles |
|---|---|---|
| ≤ 150 ms | 100 | ★★★★★ |
| ≤ 200 ms | 90 | ★★★★★ |
| ≤ 300 ms | 75 | ★★★★☆ |
| ≤ 500 ms | 60 | ★★★☆☆ |
| ≤ 800 ms | 30 | ★☆☆☆☆ |
| > 800 ms | 0 | ☆☆☆☆☆ |

**Cas limites** : INP nécessite des interactions réelles. Si CrUX absent (site à faible trafic), basculer en `status: warning` avec score basé sur TBT (PERF-20) en fallback.

---

## PERF-04 — FCP (First Contentful Paint)

**Mesure**
- **API** : PSI v5 (même appel)
- **Champ extrait** : `lighthouseResult.audits["first-contentful-paint"].numericValue`
- **Source CrUX** : `loadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS.percentile`

**Formule**
```typescript
function scorePERF04(fcpMs: number): number {
  if (fcpMs <= 1800) return 100;
  if (fcpMs <= 3000) return 60;
  return Math.max(0, 60 - (fcpMs - 3000) / 50);
}
```

**Seuils étoiles**
| FCP | Score | Étoiles |
|---|---|---|
| ≤ 1 500 ms | 100 | ★★★★★ |
| ≤ 1 800 ms | 90 | ★★★★★ |
| ≤ 2 500 ms | 75 | ★★★★☆ |
| ≤ 3 000 ms | 60 | ★★★☆☆ |
| ≤ 4 500 ms | 30 | ★☆☆☆☆ |
| > 4 500 ms | 0 | ☆☆☆☆☆ |

---

## PERF-05 — TTFB (Time to First Byte)

**Mesure** (deux options, on prend la plus rapide disponible)
- **Option A** : `curl -o /dev/null -s -w '%{time_starttransfer}' {url}` (mesure locale, en secondes)
- **Option B** : PSI v5 — `lighthouseResult.audits["server-response-time"].numericValue` (en ms)

**Formule**
```typescript
function scorePERF05(ttfbMs: number): number {
  if (ttfbMs <= 200) return 100;
  if (ttfbMs <= 600) return 80;
  if (ttfbMs <= 1000) return 50;
  return Math.max(0, 50 - (ttfbMs - 1000) / 30);
}
```

**Seuils étoiles**
| TTFB | Score | Étoiles |
|---|---|---|
| ≤ 200 ms | 100 | ★★★★★ |
| ≤ 400 ms | 90 | ★★★★★ |
| ≤ 600 ms | 80 | ★★★★☆ |
| ≤ 1 000 ms | 50 | ★★★☆☆ |
| ≤ 1 800 ms | 25 | ★☆☆☆☆ |
| > 1 800 ms | 0 | ☆☆☆☆☆ |

**Cas limites** : pour mesure locale, faire 3 appels et garder la médiane (élimine les outliers réseau).

---

## PERF-06 — Poids total de la page

**Mesure**
- **Outil** : Puppeteer + interception réseau
- **Implémentation** :
```typescript
const page = await browser.newPage();
let totalBytes = 0;
page.on("response", async (response) => {
  try {
    const buffer = await response.buffer();
    totalBytes += buffer.length;
  } catch { /* ignore */ }
});
await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
```
- **Alternative** : `lighthouseResult.audits["total-byte-weight"].numericValue`

**Formule**
```typescript
function scorePERF06(bytes: number): number {
  const mb = bytes / (1024 * 1024);
  if (mb <= 0.5) return 100;
  if (mb <= 1.5) return 85;
  if (mb <= 3) return 60;
  if (mb <= 5) return 30;
  return Math.max(0, 30 - (mb - 5) * 6);
}
```

**Seuils étoiles**
| Poids | Score | Étoiles |
|---|---|---|
| ≤ 500 Ko | 100 | ★★★★★ |
| ≤ 1.0 Mo | 90 | ★★★★★ |
| ≤ 1.5 Mo | 85 | ★★★★☆ |
| ≤ 3 Mo | 60 | ★★★☆☆ |
| ≤ 5 Mo | 30 | ★☆☆☆☆ |
| > 5 Mo | 0 | ☆☆☆☆☆ |

---

## PERF-07 — Format d'image moderne (WebP/AVIF)

**Mesure**
- **Outil** : Puppeteer — interception des `Content-Type` des images
- **Calcul** : `ratio = (count(webp) + count(avif)) / count(total_images)`
- **Alternative Lighthouse** : `lighthouseResult.audits["uses-webp-images"]` (déprécié, préférer la mesure manuelle)

**Formule**
```typescript
function scorePERF07(modernRatio: number): number {
  return Math.round(modernRatio * 100);
}
```

**Seuils étoiles**
| Ratio modern | Score | Étoiles |
|---|---|---|
| ≥ 95 % | 95+ | ★★★★★ |
| ≥ 80 % | 80+ | ★★★★☆ |
| ≥ 60 % | 60+ | ★★★☆☆ |
| ≥ 35 % | 35+ | ★★☆☆☆ |
| < 35 % | 15-30 | ★☆☆☆☆ |
| 0 % | 0 | ☆☆☆☆☆ |

**Cas limites** : si la page contient 0 image, statut `skipped`, score `null`, ne pas pénaliser.

---

## PERF-08 — Lazy loading natif des images

**Mesure**
- **Outil** : Puppeteer — parsing du DOM
- **Calcul** :
```javascript
const images = await page.$$eval('img', imgs =>
  imgs.map(img => ({
    src: img.src,
    loading: img.getAttribute('loading'),
    aboveTheFold: img.getBoundingClientRect().top < window.innerHeight
  }))
);
const belowFold = images.filter(i => !i.aboveTheFold);
const lazyRatio = belowFold.length === 0 ? 1 :
  belowFold.filter(i => i.loading === 'lazy').length / belowFold.length;
```

**Formule** : `score = round(lazyRatio * 100)`

**Seuils étoiles** : identique à PERF-07.

**Cas limites** : si `belowFold.length === 0`, statut `skipped`.

---

## PERF-09 — Images responsive (srcset/sizes)

**Mesure**
- **Outil** : Puppeteer — parsing DOM
- **Calcul** : `ratio = count(images_avec_srcset) / count(total_images_significantes)`
- Une image est "significante" si elle fait > 200×200 px (les icônes décoratives sont exclues)

**Formule** : `score = round(ratio * 100)`

**Seuils étoiles** : identique à PERF-07.

---

## PERF-10 — Polices optimisées (woff2 + font-display)

**Mesure**
- **Outil** : Puppeteer + parsing CSS
- **Implémentation** :
```typescript
const fontFiles = await page.evaluate(() => {
  const fonts: { format: string; display: string | null }[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules || [])) {
        if (rule instanceof CSSFontFaceRule) {
          const src = rule.style.getPropertyValue('src');
          const display = rule.style.getPropertyValue('font-display');
          const isWoff2 = src.includes('woff2');
          fonts.push({ format: isWoff2 ? 'woff2' : 'other', display: display || null });
        }
      }
    } catch { /* CORS */ }
  }
  return fonts;
});
```
- **Critères validés** :
  - 100 % woff2 (pas de woff/ttf/eot)
  - 100 % `font-display: swap` (ou `optional`)

**Formule**
```typescript
function scorePERF10(fonts: Array<{format:string; display:string|null}>): number {
  if (fonts.length === 0) return 100; // Pas de fonts custom = OK
  const woff2Ratio = fonts.filter(f => f.format === 'woff2').length / fonts.length;
  const swapRatio = fonts.filter(f => f.display === 'swap' || f.display === 'optional').length / fonts.length;
  return Math.round((woff2Ratio * 0.5 + swapRatio * 0.5) * 100);
}
```

---

## PERF-11 — Compression Brotli/gzip

**Mesure**
- **Outil** : `curl -H "Accept-Encoding: br, gzip" -I {url}`
- **Champ extrait** : header `Content-Encoding` de la réponse HTML
- **Validation** : `br` (5 ★), `gzip` (4 ★), aucun (0 ★)

**Formule**
```typescript
function scorePERF11(encoding: string | null): number {
  if (encoding === 'br') return 100;
  if (encoding === 'gzip') return 80;
  if (encoding === 'deflate') return 60;
  return 0;
}
```

**Bonus** : tester aussi sur un asset CSS et JS, score = moyenne des 3.

---

## PERF-12 — CSS critique inliné

**Mesure**
- **Outil** : Puppeteer
- **Calcul** :
```typescript
const inlineCss = await page.$$eval('style', els =>
  els.reduce((sum, el) => sum + el.textContent.length, 0)
);
const externalCss = await page.$$eval('link[rel="stylesheet"]', links => links.length);
```
- **Critères** : ≥ 500 octets de CSS inline ET ≤ 14 Ko inline (au-dessus = anti-pattern)

**Formule**
```typescript
function scorePERF12(inlineBytes: number): number {
  if (inlineBytes >= 500 && inlineBytes <= 14000) return 100;
  if (inlineBytes >= 200 && inlineBytes <= 20000) return 70;
  return 30;
}
```

---

## PERF-13 — JS non bloquant (defer/async)

**Mesure**
- **Outil** : Puppeteer
- **Calcul** :
```typescript
const headScripts = await page.$$eval('head script[src]', scripts =>
  scripts.map(s => ({
    src: s.getAttribute('src'),
    async: s.hasAttribute('async'),
    defer: s.hasAttribute('defer'),
    type: s.getAttribute('type')
  }))
);
const blocking = headScripts.filter(s => !s.async && !s.defer && s.type !== 'module');
```

**Formule**
```typescript
function scorePERF13(blockingCount: number, totalHeadScripts: number): number {
  if (totalHeadScripts === 0) return 100;
  if (blockingCount === 0) return 100;
  return Math.max(0, 100 - blockingCount * 25);
}
```

---

## PERF-14 — CDN actif avec POP CH/EU

**Mesure**
- **Outil** : `curl -I {url}` + analyse headers
- **Détection des CDN courants** :
```typescript
const CDN_HEADERS = {
  cloudflare: ['cf-ray', 'cf-cache-status'],
  fastly: ['x-served-by', 'x-fastly-request-id'],
  akamai: ['x-akamai-transformed', 'akamai-grn'],
  bunny: ['cdn-loop', 'bunny-cdn'],
  vercel: ['x-vercel-id', 'x-vercel-cache'],
  netlify: ['x-nf-request-id'],
  aws_cloudfront: ['x-amz-cf-id', 'x-amz-cf-pop']
};
```
- **Bonus POP CH/EU** : si header `x-amz-cf-pop` ou `cf-ray` contient `FRA`, `ZRH`, `CDG`, `AMS`, `LHR` → score boosté

**Formule**
```typescript
function scorePERF14(cdnDetected: string | null, popLocation: string | null): number {
  if (!cdnDetected) return 0;
  const isEU = popLocation && /FRA|ZRH|CDG|AMS|LHR|MAD|MIL/i.test(popLocation);
  return isEU ? 100 : 75;
}
```

---

## PERF-15 — Cache hit ratio assets statiques

**Mesure**
- **Outil** : `curl -I` sur 5 assets statiques (CSS, JS, images) après un premier `curl` de réchauffement
- **Header analysé** : `cf-cache-status`, `x-cache`, `x-vercel-cache`
- **Ratio** : `count(HIT) / count(total_assets_testés)`

**Formule** : `score = round(hitRatio * 100)`

**Cas limites** : si aucun CDN détecté (PERF-14 = 0), statut `skipped`.

---

## PERF-16 — HTTP/2 ou HTTP/3 actif

**Mesure**
- **Outil** : `curl --http3 -I {url}` puis fallback `curl --http2 -I {url}`
- **Détection** : version dans la première ligne de la réponse (`HTTP/2`, `HTTP/3`)

**Formule**
```typescript
function scorePERF16(version: string): number {
  if (version === 'HTTP/3') return 100;
  if (version === 'HTTP/2') return 85;
  if (version === 'HTTP/1.1') return 30;
  return 0;
}
```

---

## PERF-17 — Service Worker / PWA

**Mesure**
- **Outil** : Puppeteer
- **Calcul** :
```typescript
const hasSW = await page.evaluate(() =>
  navigator.serviceWorker && navigator.serviceWorker.controller !== null
);
const manifestLink = await page.$('link[rel="manifest"]');
```

**Formule**
```typescript
function scorePERF17(hasSW: boolean, hasManifest: boolean): number {
  if (hasSW && hasManifest) return 100;
  if (hasSW || hasManifest) return 60;
  return 0; // NICE — pas pénalisé en fail
}
```

**Statut NICE** : ce critère ne descend pas en dessous de 0, pas de score négatif. Si absent → étoiles 0 mais ne tire pas le score thème vers le bas (poids relatif faible).

---

## PERF-18 — Lighthouse Performance Score global

**Mesure**
- **API** : PSI v5 (même appel)
- **Champ extrait** : `lighthouseResult.categories.performance.score` (valeur 0-1)

**Formule** : `score = round(performanceScore * 100)`

**Seuils étoiles**
| Score Lighthouse | Étoiles |
|---|---|
| ≥ 0.90 | ★★★★★ |
| ≥ 0.75 | ★★★★☆ |
| ≥ 0.55 | ★★★☆☆ |
| ≥ 0.35 | ★★☆☆☆ |
| ≥ 0.15 | ★☆☆☆☆ |
| < 0.15 | ☆☆☆☆☆ |

---

## PERF-19 — Speed Index

**Mesure**
- **API** : PSI v5
- **Champ extrait** : `lighthouseResult.audits["speed-index"].numericValue` (en ms)

**Formule**
```typescript
function scorePERF19(siMs: number): number {
  if (siMs <= 3400) return 100;
  if (siMs <= 5800) return 70;
  return Math.max(0, 70 - (siMs - 5800) / 50);
}
```

---

## PERF-20 — Total Blocking Time (TBT)

**Mesure**
- **API** : PSI v5
- **Champ extrait** : `lighthouseResult.audits["total-blocking-time"].numericValue` (en ms)

**Formule**
```typescript
function scorePERF20(tbtMs: number): number {
  if (tbtMs <= 200) return 100;
  if (tbtMs <= 600) return 60;
  return Math.max(0, 60 - (tbtMs - 600) / 20);
}
```

**Note** : TBT est utilisé en fallback de INP (PERF-03) si CrUX absent.

---

# THÈME 4 — Accessibilité (25 critères)

**Note d'architecture** : 22 des 25 critères A11Y sont mesurés via **un seul appel axe-core** sur la page. On ne fait pas un appel par critère — c'est une seule analyse qui produit un rapport JSON dont on extrait toutes les violations.

## Setup axe-core (commun à tous les critères A11Y)

```typescript
import { AxePuppeteer } from '@axe-core/puppeteer';

async function runAxeAnalysis(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const results = await new AxePuppeteer(page)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  await browser.close();
  return results;
}
```

Le résultat `results` contient :
- `results.violations` : tableau des règles violées
- `results.passes` : tableau des règles validées
- `results.incomplete` : tableau des règles indéterminées
- `results.inapplicable` : tableau des règles non applicables

**Mapping critère MCVA → règle axe-core** (table complète ci-dessous).

## Mapping A11Y MCVA ↔ axe-core

| ID | Critère | Règle(s) axe-core | Calcul |
|---|---|---|---|
| A11Y-01 | Alt text images informatives | `image-alt`, `role-img-alt` | `100 - violations.length × 15` |
| A11Y-02 | Images décoratives masquées | `image-redundant-alt`, `presentation-role-conflict` | `100 - violations.length × 20` |
| A11Y-03 | Contraste texte normal ≥ 4.5:1 | `color-contrast` (filter sur texte normal) | `100 - violations.length × 10` |
| A11Y-04 | Contraste texte large ≥ 3:1 | `color-contrast` (filter sur texte large) | `100 - violations.length × 15` |
| A11Y-05 | Info pas que par couleur | `link-in-text-block` | `100 - violations.length × 20` |
| A11Y-06 | Sous-titres vidéo | `video-caption` | `100 - violations.length × 30` |
| A11Y-07 | Transcriptions audio | `audio-caption` | `100 - violations.length × 30` |
| A11Y-08 | Zoom 200% sans perte | `meta-viewport` (no user-scalable=no) | binaire 100/0 |
| A11Y-09 | Composants accessibles clavier | `focusable-content`, `tabindex` | `100 - violations.length × 15` |
| A11Y-10 | Pas de focus trap involontaire | `focus-order-semantics` | `100 - violations.length × 25` |
| A11Y-11 | Skip link | `bypass`, `skip-link` | binaire 100/0 |
| A11Y-12 | Focus visible | `focus-visible` (custom check) | binaire 100/40 |
| A11Y-13 | Tabulation logique (tabindex ≤ 0) | `tabindex` | `100 - violations.length × 25` |
| A11Y-14 | Liens explicites | `link-name` | `100 - violations.length × 12` |
| A11Y-15 | Title page descriptif unique | `document-title` + crawl multi-pages | binaire 100/30 |
| A11Y-16 | Délais ajustables | `meta-refresh` | binaire 100/0 |
| A11Y-17 | Lang attribute correct | `html-has-lang`, `html-lang-valid`, `html-xml-lang-mismatch` | binaire 100/0 |
| A11Y-18 | Changements de langue inline | `valid-lang` | `100 - violations.length × 20` |
| A11Y-19 | Labels formulaires associés | `label`, `form-field-multiple-labels` | `100 - violations.length × 15` |
| A11Y-20 | Messages d'erreur liés | `aria-input-field-name` | `100 - violations.length × 20` |
| A11Y-21 | Instructions de saisie | (custom check) | DECL — analyse manuelle |
| A11Y-22 | HTML valide | W3C Validator API | voir détail ci-dessous |
| A11Y-23 | ARIA roles cohérents | `aria-roles`, `aria-valid-attr`, `aria-required-attr` | `100 - violations.length × 10` |
| A11Y-24 | aria-live sur zones dynamiques | `aria-live-region` (custom) | DECL partiel |
| A11Y-25 | Hiérarchie Hn correcte | `heading-order`, `page-has-heading-one` | binaire 100/40 |

## Fonction générique de scoring axe

```typescript
interface AxeViolation {
  id: string;
  nodes: { target: string[] }[];
}

function scoreFromAxeViolations(
  violations: AxeViolation[],
  ruleIds: string[],
  penaltyPerViolation: number = 15
): number {
  const relevant = violations.filter(v => ruleIds.includes(v.id));
  const totalNodes = relevant.reduce((sum, v) => sum + v.nodes.length, 0);
  return Math.max(0, 100 - totalNodes * penaltyPerViolation);
}
```

## A11Y-22 — HTML valide (W3C Validator)

**Mesure**
- **API** : `https://validator.w3.org/nu/?out=json&doc={encoded_url}`
- **Méthode** : GET
- **Champ extrait** : `messages[]` filtré sur `type === 'error'`

**Formule**
```typescript
function scoreA11Y22(errorCount: number): number {
  if (errorCount === 0) return 100;
  if (errorCount <= 3) return 85;
  if (errorCount <= 10) return 60;
  if (errorCount <= 30) return 30;
  return 0;
}
```

**Coût** : 1 appel API gratuit, latence ~5-10 s

## Cas limites globaux thème A11Y

- Page avec JavaScript-rendered content : axe-core attend `networkidle2` puis 2 s supplémentaires avant l'analyse
- Pages protégées par auth : statut `skipped`
- Sites avec plusieurs centaines d'images : rapport axe peut faire >5 Mo, augmenter la mémoire Puppeteer à 2 Go
- Page 4xx/5xx : statut `fail`, score 0 sur les 25 critères

---

# THÈME 5 — Technique & Sécurité (20 critères)

## TECH-01 — Redirection HTTP → HTTPS

**Mesure**
- **Commande** : `curl -I -s http://{domain}` (HTTP explicite)
- **Validation** : status `301` ou `308` ET header `Location: https://...`

**Formule**
```typescript
function scoreTECH01(statusCode: number, location: string | null): number {
  if (statusCode === 301 && location?.startsWith('https://')) return 100;
  if (statusCode === 302 && location?.startsWith('https://')) return 75;
  if (statusCode === 308 && location?.startsWith('https://')) return 100;
  if (location?.startsWith('https://')) return 60;
  return 0;
}
```

## TECH-02 — Grade SSL Labs ≥ A

**Mesure**
- **API** : `https://api.ssllabs.com/api/v3/analyze?host={domain}&publish=off&all=done`
- **Méthode** : GET (asynchrone — il faut poller jusqu'à `status === "READY"`)
- **Polling** :
```typescript
async function getSSLGrade(host: string): Promise<string> {
  let attempts = 0;
  while (attempts < 30) {
    const res = await fetch(`https://api.ssllabs.com/api/v3/analyze?host=${host}&all=done`);
    const data = await res.json();
    if (data.status === 'READY') {
      return data.endpoints[0].grade; // "A+", "A", "B", etc.
    }
    if (data.status === 'ERROR') throw new Error('SSL Labs error');
    await new Promise(r => setTimeout(r, 10000));
    attempts++;
  }
  throw new Error('SSL Labs timeout');
}
```
- **Champ extrait** : `endpoints[0].grade`

**Formule**
```typescript
function scoreTECH02(grade: string): number {
  const grades: Record<string, number> = {
    'A+': 100, 'A': 95, 'A-': 85, 'B': 70, 'C': 50, 'D': 30, 'E': 15, 'F': 0, 'T': 0, 'M': 0
  };
  return grades[grade] ?? 0;
}
```

**Coût** : Gratuit. **Latence : 60-180 s** (test exhaustif côté SSL Labs).

**Cas limites** : SSL Labs rate-limite à 1 req/s/IP. Si plusieurs audits parallèles, mettre une queue avec délai 2 s entre requêtes.

## TECH-03 — TLS 1.3 actif

**Mesure**
- Réutilise l'appel SSL Labs de TECH-02
- **Champ extrait** : `endpoints[0].details.protocols[]` — chercher `name === "TLS"` AND `version === "1.3"`

**Formule** : binaire 100 (présent) / 50 (TLS 1.2 seul) / 0 (TLS 1.1 ou inférieur).

## TECH-04 — DNSSEC activé

**Mesure**
- **Commande** : `dig +dnssec +short {domain} DNSKEY`
- **Validation** : sortie non vide ET enregistrements RRSIG présents

```bash
dig +dnssec {domain} DNSKEY @8.8.8.8 +noall +answer
```

**Formule** : binaire 100 / 0. Statut NICE.

## TECH-05 — CAA records DNS

**Mesure**
- **Commande** : `dig CAA {domain} +short`
- **Validation** : au moins un enregistrement CAA présent

**Formule** : binaire 100 / 0. Statut NICE.

## TECH-06 à TECH-11 — Headers de sécurité

**Mesure unique** (un seul appel pour tous)
- **API** : `https://api.securityheaders.com/?q={url}&followRedirects=on&hide=on`
- **Méthode** : GET
- **Headers extraits** : tous les headers de sécurité analysés sont dans le HTML de retour, ou utiliser le grade global et compléter avec `curl -I` pour les valeurs précises

**Alternative recommandée** : `curl -I -s {url}` et parser nous-mêmes (plus fiable que parser le HTML de securityheaders.com).

```typescript
async function getSecurityHeaders(url: string) {
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  return {
    hsts: res.headers.get('strict-transport-security'),
    csp: res.headers.get('content-security-policy'),
    xfo: res.headers.get('x-frame-options'),
    referrerPolicy: res.headers.get('referrer-policy'),
    permissionsPolicy: res.headers.get('permissions-policy'),
    xContentType: res.headers.get('x-content-type-options'),
  };
}
```

### TECH-06 — HSTS (max-age ≥ 1 an, includeSubDomains, preload)

```typescript
function scoreTECH06(hsts: string | null): number {
  if (!hsts) return 0;
  const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? '0');
  const hasSubdomains = /includeSubDomains/i.test(hsts);
  const hasPreload = /preload/i.test(hsts);

  if (maxAge >= 31536000 && hasSubdomains && hasPreload) return 100;
  if (maxAge >= 31536000 && hasSubdomains) return 80;
  if (maxAge >= 31536000) return 60;
  if (maxAge >= 15552000) return 40;
  return 20;
}
```

### TECH-07 — Content-Security-Policy strict

```typescript
function scoreTECH07(csp: string | null): number {
  if (!csp) return 0;
  const hasUnsafeInline = /unsafe-inline/i.test(csp);
  const hasUnsafeEval = /unsafe-eval/i.test(csp);
  const hasNonce = /nonce-/i.test(csp);
  const hasDefaultSrc = /default-src/i.test(csp);

  if (!hasUnsafeInline && !hasUnsafeEval && hasDefaultSrc) return 100;
  if (hasNonce && !hasUnsafeEval) return 85;
  if (hasDefaultSrc && !hasUnsafeEval) return 65;
  if (hasDefaultSrc) return 45;
  return 25;
}
```

### TECH-08 — X-Frame-Options

```typescript
function scoreTECH08(xfo: string | null, csp: string | null): number {
  // CSP frame-ancestors override X-Frame-Options selon spec récente
  if (csp && /frame-ancestors/i.test(csp)) return 100;
  if (xfo === 'DENY') return 100;
  if (xfo === 'SAMEORIGIN') return 90;
  if (xfo) return 50;
  return 0;
}
```

### TECH-09 — Referrer-Policy

```typescript
function scoreTECH09(rp: string | null): number {
  if (!rp) return 0;
  const strict = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
  if (strict.includes(rp.toLowerCase())) return 100;
  return 50;
}
```

### TECH-10 — Permissions-Policy

```typescript
function scoreTECH10(pp: string | null): number {
  if (!pp) return 0;
  const dangerous = ['camera', 'microphone', 'geolocation', 'payment', 'usb'];
  const restricted = dangerous.filter(d => new RegExp(`${d}=\\(\\)`).test(pp));
  return Math.round((restricted.length / dangerous.length) * 100);
}
```

### TECH-11 — Grade securityheaders.com global

```typescript
function scoreTECH11(grade: string): number {
  const map: Record<string, number> = {
    'A+': 100, 'A': 90, 'B': 75, 'C': 55, 'D': 35, 'E': 15, 'F': 0, 'R': 0
  };
  return map[grade] ?? 0;
}
```

## TECH-12 — SPF record valide

**Mesure**
- **Commande** : `dig TXT {domain} +short | grep "v=spf1"`
- **Validation** :
  - Présent (1 et 1 seul enregistrement)
  - Se termine par `-all` (strict) ou `~all` (soft fail)
  - Pas de `+all` (anti-pattern)

```typescript
function scoreTECH12(spf: string | null): number {
  if (!spf) return 0;
  if (/[+]all/.test(spf)) return 20; // anti-pattern
  if (/-all/.test(spf)) return 100;
  if (/~all/.test(spf)) return 75;
  if (/\?all/.test(spf)) return 40;
  return 30;
}
```

## TECH-13 — DKIM record (≥ 2048 bits)

**Mesure**
- **Difficulté** : DKIM nécessite un selector. Tester les selectors courants : `default`, `google`, `selector1`, `selector2`, `mail`, `dkim`
- **Commande** : `dig TXT {selector}._domainkey.{domain} +short`
- **Validation** : présence d'une clé `p=` non vide ET longueur ≥ 256 caractères (~2048 bits)

```typescript
async function detectDkim(domain: string): Promise<{found: boolean; bits: number}> {
  const selectors = ['default', 'google', 'selector1', 'selector2', 'mail', 'dkim', 's1', 'k1'];
  for (const s of selectors) {
    const result = await dig(`${s}._domainkey.${domain}`, 'TXT');
    if (result.includes('p=')) {
      const key = result.match(/p=([A-Za-z0-9+/=]+)/)?.[1] ?? '';
      const bits = key.length * 6; // base64 → bits approximatif
      return { found: true, bits };
    }
  }
  return { found: false, bits: 0 };
}
```

**Formule**
```typescript
function scoreTECH13(found: boolean, bits: number): number {
  if (!found) return 0;
  if (bits >= 2048) return 100;
  if (bits >= 1024) return 60;
  return 30;
}
```

## TECH-14 — DMARC

**Mesure**
- **Commande** : `dig TXT _dmarc.{domain} +short`
- **Validation** : présence + politique `p=`

```typescript
function scoreTECH14(dmarc: string | null): number {
  if (!dmarc || !dmarc.includes('v=DMARC1')) return 0;
  if (/p=reject/.test(dmarc)) return 100;
  if (/p=quarantine/.test(dmarc)) return 80;
  if (/p=none/.test(dmarc)) return 40;
  return 20;
}
```

## TECH-15 — Détection technologies (Wappalyzer)

**Mesure**
- **Outil** : Wappalyzer CLI ou lib `wappalyzer-core`
- **Implémentation** :
```typescript
import Wappalyzer from 'wappalyzer';
const wappalyzer = new Wappalyzer();
await wappalyzer.init();
const site = await wappalyzer.open(url);
const results = await site.analyze();
await wappalyzer.destroy();
// results.technologies[] = liste des techs détectées
```
- **Stockage** : pour information dans `details.technologies[]`, utilisé par TECH-16

**Formule** : binaire 100 (≥ 1 tech détectée) / 50 (rien détecté).

## TECH-16 — CMS / framework à jour (CVE check)

**Mesure**
- Réutilise les résultats Wappalyzer (TECH-15)
- Pour chaque tech avec une `version` détectée, requête à l'API NVD :
- **API** : `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch={cms}+{version}`

**Formule**
```typescript
function scoreTECH16(cves: Array<{severity: string}>): number {
  const critical = cves.filter(c => c.severity === 'CRITICAL').length;
  const high = cves.filter(c => c.severity === 'HIGH').length;
  const medium = cves.filter(c => c.severity === 'MEDIUM').length;

  if (critical > 0) return 0;
  if (high > 0) return 30;
  if (medium > 2) return 60;
  return 100;
}
```

## TECH-17 — Subresource Integrity sur scripts tiers

**Mesure**
- **Outil** : Puppeteer + parsing DOM
```typescript
const externalScripts = await page.$$eval('script[src]', scripts =>
  scripts
    .filter(s => {
      const src = s.getAttribute('src') || '';
      return src.startsWith('http') && !src.includes(window.location.hostname);
    })
    .map(s => ({ src: s.src, integrity: s.getAttribute('integrity') }))
);
const withSRI = externalScripts.filter(s => s.integrity);
const ratio = externalScripts.length === 0 ? 1 : withSRI.length / externalScripts.length;
```

**Formule** : `score = round(ratio * 100)`. Si pas de scripts tiers, statut `skipped`, score 100.

## TECH-18 — Cookies sécurisés

**Mesure**
- **Outil** : `curl -I` ou Puppeteer pour récupérer les `Set-Cookie` headers
- **Validation par cookie** :
  - `Secure` flag présent
  - `HttpOnly` flag présent (sauf cookies devant être lus en JS comme certains analytics)
  - `SameSite=Strict` ou `SameSite=Lax`

**Formule**
```typescript
function scoreTECH18(cookies: Array<{secure:boolean; httpOnly:boolean; sameSite:string}>): number {
  if (cookies.length === 0) return 100;
  const scores = cookies.map(c => {
    let s = 0;
    if (c.secure) s += 40;
    if (c.httpOnly) s += 30;
    if (c.sameSite === 'Strict') s += 30;
    else if (c.sameSite === 'Lax') s += 25;
    return s;
  });
  return Math.round(scores.reduce((a,b) => a+b, 0) / cookies.length);
}
```

## TECH-19 — 0 erreur console JavaScript

**Mesure**
- **Outil** : Puppeteer console listener
```typescript
const errors: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => errors.push(err.message));
await page.goto(url, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3000));
```

**Formule**
```typescript
function scoreTECH19(errorCount: number): number {
  if (errorCount === 0) return 100;
  if (errorCount <= 2) return 70;
  if (errorCount <= 5) return 40;
  return Math.max(0, 40 - (errorCount - 5) * 5);
}
```

## TECH-20 — 0 lien interne cassé (404)

**Mesure**
- **Outil** : crawler interne maison ou `linkinator`
- **Limite** : crawler max 50 pages internes pour limiter le coût
```typescript
import { LinkChecker } from 'linkinator';
const checker = new LinkChecker();
const result = await checker.check({
  path: url,
  recurse: true,
  linksToSkip: ['mailto:', 'tel:', 'javascript:'],
  maxDepth: 2
});
const broken = result.links.filter(l => l.state === 'BROKEN');
```

**Formule**
```typescript
function scoreTECH20(brokenCount: number, totalLinks: number): number {
  if (totalLinks === 0) return 100;
  const ratio = brokenCount / totalLinks;
  if (ratio === 0) return 100;
  if (ratio < 0.01) return 90;
  if (ratio < 0.03) return 70;
  if (ratio < 0.05) return 50;
  if (ratio < 0.10) return 25;
  return 0;
}
```

---

# THÈME 7 — Éco-conception (14 critères)

## ECO-01 — Poids total < 1.5 Mo

**Mesure** : réutilise PERF-06 (même valeur, seuil différent).

**Formule**
```typescript
function scoreECO01(bytes: number): number {
  const mb = bytes / (1024 * 1024);
  if (mb <= 1.0) return 100;
  if (mb <= 1.5) return 85;
  if (mb <= 2.5) return 60;
  if (mb <= 4) return 30;
  return 0;
}
```

## ECO-02 — Lazy loading systématique

**Mesure** : réutilise PERF-08, seuils plus stricts.

```typescript
function scoreECO02(lazyRatio: number): number {
  if (lazyRatio >= 0.95) return 100;
  if (lazyRatio >= 0.80) return 80;
  if (lazyRatio >= 0.50) return 50;
  return Math.round(lazyRatio * 60);
}
```

## ECO-03 — Polices limitées (≤ 3 familles, ≤ 6 fichiers)

**Mesure**
```typescript
const fontFaces = await page.evaluate(() => {
  const families = new Set<string>();
  let fileCount = 0;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules || [])) {
        if (rule instanceof CSSFontFaceRule) {
          families.add(rule.style.getPropertyValue('font-family'));
          fileCount++;
        }
      }
    } catch { /* CORS */ }
  }
  return { families: families.size, files: fileCount };
});
```

**Formule**
```typescript
function scoreECO03(families: number, files: number): number {
  if (families <= 2 && files <= 4) return 100;
  if (families <= 3 && files <= 6) return 85;
  if (families <= 4 && files <= 8) return 60;
  if (families <= 6 && files <= 12) return 30;
  return 0;
}
```

## ECO-04 — Scripts tiers limités (≤ 5 domaines)

**Mesure**
```typescript
const thirdPartyDomains = new Set<string>();
const mainHost = new URL(url).hostname;
page.on('response', (response) => {
  const respHost = new URL(response.url()).hostname;
  if (respHost !== mainHost && response.request().resourceType() === 'script') {
    thirdPartyDomains.add(respHost);
  }
});
```

**Formule**
```typescript
function scoreECO04(domainCount: number): number {
  if (domainCount === 0) return 100;
  if (domainCount <= 3) return 100;
  if (domainCount <= 5) return 85;
  if (domainCount <= 8) return 60;
  if (domainCount <= 12) return 30;
  return 0;
}
```

## ECO-05 — Images dimensionnées (width/height)

**Mesure**
```typescript
const images = await page.$$eval('img', imgs => imgs.map(img => ({
  hasWidth: img.hasAttribute('width'),
  hasHeight: img.hasAttribute('height')
})));
const dimensioned = images.filter(i => i.hasWidth && i.hasHeight);
const ratio = images.length === 0 ? 1 : dimensioned.length / images.length;
```

**Formule** : `score = round(ratio * 100)`.

## ECO-06 — Requêtes HTTP totales < 50

**Mesure**
```typescript
let requestCount = 0;
page.on('request', () => requestCount++);
await page.goto(url, { waitUntil: 'networkidle2' });
```

**Formule**
```typescript
function scoreECO06(count: number): number {
  if (count <= 30) return 100;
  if (count <= 50) return 85;
  if (count <= 80) return 60;
  if (count <= 120) return 30;
  return 0;
}
```

## ECO-07 — Pagination (pas de scroll infini)

**Mesure**
- Détection par patterns : présence de `IntersectionObserver` + appels XHR/fetch déclenchés au scroll
- Méthode pragmatique : scroll programmatique de la page sur 5 hauteurs et compter les nouvelles requêtes
```typescript
let initialCount = 0;
let postScrollCount = 0;
page.on('request', () => initialCount++);
await page.goto(url);
const baseCount = initialCount;
await page.evaluate(() => {
  for (let i = 0; i < 5; i++) {
    window.scrollBy(0, window.innerHeight);
  }
});
await new Promise(r => setTimeout(r, 2000));
const newRequests = initialCount - baseCount;
```

**Formule** : si `newRequests > 5` et de type fetch/xhr → infinite scroll détecté → score 30. Sinon 100.

## ECO-08 — Pas d'autoplay vidéo/audio

**Mesure**
```typescript
const autoplayCount = await page.$$eval('video[autoplay], audio[autoplay]', els => els.length);
```

**Formule** : binaire 100 (0 autoplay) / 0 (≥ 1).

## ECO-09 — Dark mode supporté

**Mesure**
```typescript
const hasDarkMode = await page.evaluate(() => {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules || [])) {
        if (rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-color-scheme: dark')) {
          return true;
        }
      }
    } catch { /* CORS */ }
  }
  return false;
});
```

**Formule** : binaire 100 / 0. Statut NICE.

## ECO-10 — Print CSS défini

**Mesure**
```typescript
const hasPrintCss = await page.evaluate(() => {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules || [])) {
        if (rule instanceof CSSMediaRule && rule.conditionText.includes('print')) {
          return true;
        }
      }
    } catch { /* CORS */ }
  }
  return false;
});
```

**Formule** : binaire 100 / 0. Statut NICE.

## ECO-11 — EcoIndex score

**Mesure**
- **API** : `https://ecoindex.fr/api/v1/ecoindexes` (POST avec URL à analyser)
- **Méthode** : POST async avec polling sur le résultat
```typescript
async function getEcoIndex(url: string) {
  const submit = await fetch('https://ecoindex.fr/api/v1/ecoindexes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, host: new URL(url).hostname, width: 1920, height: 1080 })
  });
  const { id } = await submit.json();
  // Polling
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`https://ecoindex.fr/api/v1/ecoindexes/${id}`);
    const data = await res.json();
    if (data.score !== null) return data;
  }
  throw new Error('EcoIndex timeout');
}
```
- **Champ extrait** : `score` (0-100), `grade` ("A" à "G")

**Formule** : utilise directement le `score` retourné par EcoIndex (déjà sur 0-100).

## ECO-12 — gCO2 par visite

**Mesure**
- **API** : `https://api.websitecarbon.com/site?url={encoded_url}`
- **Champ extrait** : `statistics.co2.grid.grams`

**Formule**
```typescript
function scoreECO12(grams: number): number {
  if (grams <= 0.5) return 100;
  if (grams <= 1.0) return 85;
  if (grams <= 2.0) return 65;
  if (grams <= 4.0) return 35;
  return Math.max(0, 35 - (grams - 4) * 5);
}
```

## ECO-13 — DOM size < 1500 éléments

**Mesure**
```typescript
const domSize = await page.evaluate(() => document.querySelectorAll('*').length);
```

**Formule**
```typescript
function scoreECO13(size: number): number {
  if (size <= 800) return 100;
  if (size <= 1500) return 85;
  if (size <= 2500) return 60;
  if (size <= 4000) return 30;
  return 0;
}
```

## ECO-14 — Tracking limité (≤ 2 outils)

**Mesure**
- Réutilise les résultats Wappalyzer (TECH-15) filtrés sur catégories `Analytics`, `Marketing automation`, `Tag managers`, `Advertising`

**Formule**
```typescript
function scoreECO14(trackerCount: number): number {
  if (trackerCount === 0) return 100;
  if (trackerCount <= 2) return 90;
  if (trackerCount <= 4) return 60;
  if (trackerCount <= 6) return 30;
  return 0;
}
```

---

# Architecture du moteur de mesure (Lot 6)

Pour information, voici comment ces 79 critères s'organisent côté code :

```
src/lib/audit-engine/
├── orchestrator.ts              # Lance toutes les mesures en parallèle, agrège
├── scoring.ts                   # scoreToStars, conversion universelle
├── types.ts                     # Measurement, AuditRun, etc.
├── runners/
│   ├── psi-runner.ts            # 1 appel PSI → fournit PERF-01 à PERF-20 + bonus A11Y
│   ├── ssl-labs-runner.ts       # 1 appel SSL Labs → TECH-02, TECH-03
│   ├── headers-runner.ts        # curl HEAD → TECH-06 à TECH-11
│   ├── dns-runner.ts            # dig → TECH-04, TECH-05, TECH-12, TECH-13, TECH-14
│   ├── axe-runner.ts            # 1 appel Puppeteer + axe → A11Y-01 à A11Y-25 (sauf 22)
│   ├── w3c-runner.ts            # W3C Validator → A11Y-22
│   ├── puppeteer-runner.ts      # 1 navigation → PERF-06 à PERF-17 + ECO-01 à ECO-13
│   ├── wappalyzer-runner.ts     # Wappalyzer → TECH-15, TECH-16, ECO-14
│   ├── ecoindex-runner.ts       # EcoIndex API → ECO-11
│   ├── carbon-runner.ts         # Website Carbon API → ECO-12
│   └── linkinator-runner.ts     # Crawl interne → TECH-20
├── measurements/
│   ├── perf/                    # 1 fichier par critère PERF-XX
│   ├── a11y/
│   ├── tech/
│   └── eco/
└── index.ts
```

**Optimisation clé** : on ne fait pas 79 appels réseau. On fait **~10 appels externes** qui chacun alimentent plusieurs critères :

| Appel externe | Critères alimentés | Latence |
|---|---|---|
| 1 × PageSpeed Insights | PERF-01 à 05, 18-20 (8 critères) | 15-30 s |
| 1 × Puppeteer (1 navigation) | PERF-06 à 17, ECO-01 à 10, ECO-13, A11Y-axe (35 critères) | 30-60 s |
| 1 × axe-core (sur la nav Puppeteer) | A11Y-01 à 25 sauf 22 (24 critères) | inclus dans Puppeteer |
| 1 × SSL Labs | TECH-02, 03 (2 critères) | 60-180 s |
| 5 × dig | TECH-04, 05, 12, 13, 14 (5 critères) | < 5 s |
| 1 × curl HEAD | TECH-01, 06-11, 18 (8 critères) | < 2 s |
| 1 × W3C Validator | A11Y-22 (1 critère) | 5-10 s |
| 1 × Wappalyzer | TECH-15, 16, ECO-14 (3 critères) | 10-20 s |
| 1 × EcoIndex | ECO-11 (1 critère) | 60-150 s |
| 1 × Website Carbon | ECO-12 (1 critère) | 5-10 s |
| 1 × Linkinator | TECH-20 (1 critère, crawl 50 pages) | 30-90 s |

**Latence totale estimée** : ~3-5 minutes pour les 79 critères instrumentés (parallélisation possible sauf SSL Labs et EcoIndex qui sont longs).

**Coût total** : **0 CHF** sur ces 79 critères (toutes APIs gratuites).

---

# Récapitulatif Lot 2A

| Thème | Critères | APIs externes | Statut |
|---|---|---|---|
| PERF | 20 | PSI, Puppeteer | ✅ Spec complète |
| A11Y | 25 | axe-core, W3C Validator, Puppeteer | ✅ Spec complète |
| TECH | 20 | SSL Labs, securityheaders/curl, dig, Wappalyzer, NVD, Linkinator | ✅ Spec complète |
| ECO | 14 | EcoIndex, Website Carbon, Puppeteer, Wappalyzer | ✅ Spec complète |
| **Total** | **79** | **11 APIs (toutes gratuites)** | **✅** |

---

## Validation et prochaines étapes

### Checklist de validation Lot 2A

- [ ] Toutes les APIs identifiées sont accessibles et documentées
- [ ] Toutes les formules de scoring sont déterministes (pas d'aléatoire)
- [ ] Tous les seuils sont justifiés (alignés Google Web Vitals, RGAA, OWASP)
- [ ] Tous les cas limites sont définis (timeout, donnée absente, erreur)
- [ ] Le coût total des mesures instrumentées = 0 CHF récurrent

### Lot 2B (suite directe)

Spécification des 106 critères restants (SEO, GEO, CONT). Plus complexe car :
- Beaucoup de mesures via Semrush CSV export (mode manuel)
- LLM-as-judge pour critères qualitatifs (description, originalité, vocabulaire)
- Mixage instrumentation + interprétation
- Intégration avec LLM Watch v2 pour le Score GEO™

### Lot 3.5 (en parallèle, refactoring code)

Refactoring effectif du code LLM Watch existant — adresse les 14 points faibles identifiés. Livrable = patch git appliquable au repo `mcva-audit`.

---

*MCVA Consulting SA — Audit Framework v2.0 — Lot 2A — Draft du 08.04.2026*
*79 critères instrumentés spécifiés — coût d'exécution récurrent : 0 CHF*
*Document à valider par Jérôme Deshaie avant Lot 2B et Lot 3.5*
