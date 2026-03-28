# MCVA Consulting SA — Charte Graphique v2.3

Référence appliquée sur le site mcva-consulting.ch. À utiliser pour tout projet MCVA.

---

## 1. Couleurs

### Palette principale

| Token             | Hex       | Usage                                    |
|-------------------|-----------|------------------------------------------|
| `mcva-red`        | `#8B2C2C` | Rouge signature, accents, textes clés    |
| `mcva-coral`      | `#D4553A` | CTA, liens actifs, hover                 |
| `mcva-black`      | `#0E0E0E` | Texte principal sur fond clair           |
| `mcva-abyss`      | `#0A0808` | Fond sections sombres (hero, CTA, IA)    |

### Palette secondaire (fonds clairs)

| Token             | Hex       | Usage                                    |
|-------------------|-----------|------------------------------------------|
| `mcva-paper`      | `#F8F6F1` | Fond principal du site (body)            |
| `mcva-stone`      | `#E8E4DD` | Bordures, séparateurs, hover léger       |
| `mcva-mist`       | `#F2F0EB` | Fonds alternés (cartes, sections)        |

### Spectre lumineux (dégradé signature)

Le dégradé diagonal qui traverse le logo et les éléments graphiques :

```
#4A1515 → #6B2020 → #8B2C2C → #A83D33 → #C44A38 → #D4553A → #E8937A → #F5C4B0 → #F8F6F1
```

| Token               | Hex       | Position dans le spectre                 |
|----------------------|-----------|------------------------------------------|
| `mcva-grad-abyss`   | `#4A1515` | Extrémité sombre                         |
| `mcva-red`           | `#8B2C2C` | Centre-gauche                            |
| `mcva-coral`         | `#D4553A` | Centre                                   |
| `mcva-blush`         | `#E8937A` | Centre-droit                             |
| `mcva-peach`         | `#F5C4B0` | Clair                                    |
| `mcva-paper`         | `#F8F6F1` | Extrémité claire                         |

### CSS du dégradé complet

```css
background: linear-gradient(
  in oklch 90deg,
  #4A1515 0%, #6B2020 8%, #8B2C2C 18%, #A83D33 28%,
  #C44A38 36%, #D4553A 45%, #DD7458 53%, #E8937A 63%,
  #EDA88E 70%, #F5C4B0 78%, #F7DDD0 88%, #F8F6F1 100%
);
```

---

## 2. Typographie

### Familles

| Rôle       | Font          | Fallback                          | Usage                               |
|------------|---------------|-----------------------------------|-------------------------------------|
| Display    | General Sans  | -apple-system, sans-serif         | Titres, boutons, labels, eyebrows   |
| Body       | DM Sans       | -apple-system, sans-serif         | Texte courant, paragraphes          |
| Mono       | DM Mono       | SF Mono, monospace                | Code, données techniques, badges    |

### Graisses General Sans utilisées

| Poids | Fichier                          | Usage                        |
|-------|----------------------------------|------------------------------|
| 300   | general-sans-300.woff2           | Sous-titres légers           |
| 400   | general-sans-400.woff2           | Labels, textes secondaires   |
| 500   | general-sans-500.woff2           | Sous-titres, navigation      |
| 600   | general-sans-600.woff2           | Boutons, eyebrows, badges    |
| 700   | general-sans-700.woff2           | Titres principaux (h1, h2)   |

### Tracking (letter-spacing)

| Token             | Valeur    | Usage                                    |
|-------------------|-----------|------------------------------------------|
| `tracking-tight`  | `-0.02em` | Titres h1/h2                             |
| `tracking-wide`   | `0.15em`  | Boutons                                  |
| `tracking-label`  | `0.20em`  | Eyebrows, labels uppercase               |

### Hiérarchie type

```
Eyebrow   → General Sans 600, 12px, uppercase, tracking-label, mcva-red
H1        → General Sans 700, 48-64px, tracking-tight, text couleur selon fond
H2        → General Sans 700, 30-36px, tracking-tight
H3        → General Sans 600, 18-20px
Body      → DM Sans 400, 16px, leading-relaxed
Caption   → DM Sans 400, 14px, opacity 60%
Button    → General Sans 600, uppercase, tracking-wide
Badge     → DM Mono 500, 12px, uppercase
```

---

## 3. Logo — Swiss Network Mark v2.3

### Structure

Grille 2×2 de 4 carrés arrondis (`rx="4"`) avec dégradé diagonal du spectre.
Le carré bas-droite contient une **croix suisse** (blanche `#F8F6F1`).
Des **micro-connexions Blush** (`#E8937A`, opacity 0.35–0.45) relient les blocs.

### Dimensions SVG

- ViewBox : `0 0 84 84`
- Carrés : 28×28px, gap de 4px
- Croix : barres de 8×20px et 20×8px, rx=1.5

### Tailles d'affichage

| Taille | Icon | Texte     | Sous-texte | Connexions |
|--------|------|-----------|------------|------------|
| sm     | 28px | text-sm   | 8px        | Masquées   |
| md     | 36px | text-lg   | 9px        | Visibles   |
| lg     | 48px | text-2xl  | 10px       | Visibles   |

### Wordmark

```
MCVA                → General Sans Bold, tracking 0.12em
────────────────     → Barre 2px, bg-mcva-coral
AI CONSULTING       → General Sans Medium, tracking 0.25em, uppercase, opacity 45% (fond sombre) / 50% (fond clair)
```

### Variantes

- **Light** (fond sombre) : texte blanc, sous-texte white/45%
- **Dark** (fond clair) : texte mcva-black, sous-texte mcva-black/50%

---

## 4. Boutons

### Variantes

| Variante       | Style                                                              |
|----------------|--------------------------------------------------------------------|
| `primary`      | Dégradé `mcva-red → mcva-coral`, texte blanc, hover → `abyss → red` |
| `secondary`    | Bordure `mcva-stone`, texte noir, hover → bordure/texte `mcva-red` |
| `outline`      | Bordure 2px `mcva-red`, texte red, hover → bg red + texte blanc    |
| `outline-white`| Bordure white/60%, texte blanc, hover → bg white/10%               |
| `ghost`        | Transparent, texte noir, hover → bg `mcva-stone`                  |

### Tailles

| Taille | Padding      | Font size |
|--------|--------------|-----------|
| sm     | px-4 py-2    | text-sm   |
| md     | px-6 py-3    | text-base |
| lg     | px-8 py-4    | text-lg   |

### Comportement commun

- Font : General Sans Semibold, uppercase, tracking-wide
- Border-radius : `rounded-md` (10px)
- Transition : `all 200ms`
- Hover primary : `translate-y -2px` + shadow `mcva-red/20`
- Focus : ring 2px, offset 2px, couleur selon variante

---

## 5. Composants UI

### Cards

- Fond : blanc
- Border-radius : `rounded-lg` (16px)
- Bordure : `mcva-stone` 1px
- Hover : `translate-y -2px`, shadow, bordure `mcva-red/30`
- Transition : `all 300ms`

### SectionHeading

```
[barre rouge 48×4px]
EYEBROW             → General Sans 600, 12px, uppercase, tracking-label, mcva-red
Titre principal      → General Sans 700, 30-36px, tracking-tight, mcva-black
```

### Badges

- Font : DM Mono 500, 12px, uppercase
- Fond : `mcva-mist`, texte `mcva-red`
- Border-radius : `rounded-full`

---

## 6. Espacements (sections)

| Breakpoint | Padding vertical         |
|------------|--------------------------|
| Mobile     | `py-20` (80px)           |
| Desktop    | `py-28` (112px)          |

Container max-width : adaptatif (Tailwind defaults).

---

## 7. Fonds de page

| Type de section    | Fond               | Texte                     |
|--------------------|---------------------|---------------------------|
| Standard (clair)   | `mcva-paper`        | `mcva-black`              |
| Alterné (clair)    | `mcva-mist`         | `mcva-black`              |
| Sombre (hero, CTA) | `mcva-abyss`        | `white`, accents `mcva-red/coral` |

---

## 8. Animations Canvas

6 animations Canvas 2D alignées sur le spectre, lazy-loaded (`ssr: false`).
Toutes respectent `prefers-reduced-motion`.

| Animation            | Usage              | Couleurs spectre              |
|----------------------|--------------------|-------------------------------|
| HeroGlowRibbon       | Hero background    | 5 rubans dégradé spectre      |
| NetworkConstellation | À propos hero      | Nodes + connexions spectre    |
| DataPulseFlow        | CTA background     | 80 particules ascendantes     |
| SwissGridBreathing   | Expertises bg      | Croix suisses pulsantes       |
| PillarActivation     | Section IA bg      | 4 barres M/C/V/A spectre     |
| LuminousRingStat     | Stats (à propos)   | Anneaux avec arcs spectre     |

---

## 9. Tokens Tailwind (CSS)

À placer dans `globals.css` avec `@theme` :

```css
@theme {
  --color-mcva-red: #8B2C2C;
  --color-mcva-coral: #D4553A;
  --color-mcva-black: #0E0E0E;
  --color-mcva-abyss: #0A0808;
  --color-mcva-paper: #F8F6F1;
  --color-mcva-stone: #E8E4DD;
  --color-mcva-mist: #F2F0EB;
  --color-mcva-grad-abyss: #4A1515;
  --color-mcva-blush: #E8937A;
  --color-mcva-peach: #F5C4B0;

  --font-display: 'General Sans', -apple-system, sans-serif;
  --font-sans: 'DM Sans', -apple-system, sans-serif;
  --font-mono: 'DM Mono', 'SF Mono', monospace;

  --tracking-mcva-tight: -0.02em;
  --tracking-mcva-wide: 0.15em;
  --tracking-mcva-label: 0.2em;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
```

---

## 10. Règles d'usage

1. **Jamais de corail aplat seul** → toujours en dégradé (`mcva-red → mcva-coral`) ou en accent
2. **Titres = General Sans**, corps = DM Sans — ne jamais inverser
3. **Eyebrows toujours en uppercase** avec `tracking-label` et couleur `mcva-red`
4. **Fond sombre = `mcva-abyss`** (pas noir pur `#000`)
5. **Fond clair = `mcva-paper`** (pas blanc pur `#FFF` sauf cards)
6. **Barre d'accent** : 4px de hauteur, dégradé spectre complet en haut des sections sombres
7. **Hover cards** : lift -2px + shadow, jamais de changement de couleur de fond
8. **Logo** : toujours avec la croix suisse, jamais le texte seul sans l'icône
