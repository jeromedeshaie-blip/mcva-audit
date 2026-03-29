# MCVA Consulting SA — Charte graphique v2.3

Identite visuelle de reference extraite du site mcva-consulting.ch (mars 2026).
Ce document sert de source unique pour tous les livrables MCVA : site web, app audit, PDF, presentations, emails.

---

## 1. Palette de couleurs

### 1.1 Couleurs principales

| Nom           | Hex       | OKLCh                    | Role                                           |
|---------------|-----------|--------------------------|------------------------------------------------|
| Swiss Red     | `#8B2C2C` | `oklch(0.38 0.12 25)`   | Couleur signature. Accents, eyebrows, barres, liens, ring focus |
| Coral         | `#D4553A` | `oklch(0.55 0.16 30)`   | CTA, boutons primaires (toujours en degrade avec Red, jamais seul) |
| Ink           | `#0E0E0E` | `oklch(0.13 0 0)`       | Texte principal sur fond clair                 |
| Abyss         | `#0A0808` | `oklch(0.12 0.005 25)`  | Fond des sections sombres (hero, CTA, footer). Jamais #000 |

### 1.2 Couleurs secondaires (fonds et neutres)

| Nom           | Hex       | OKLCh                    | Role                                           |
|---------------|-----------|--------------------------|------------------------------------------------|
| Paper         | `#F8F6F1` | `oklch(0.975 0.005 85)` | Fond principal (body). Jamais #FFF sauf cards  |
| Mist          | `#F2F0EB` | `oklch(0.955 0.005 85)` | Fonds alternes (cards, sections paires)        |
| Stone         | `#E8E4DD` | `oklch(0.915 0.006 85)` | Bordures, separateurs, hover leger             |
| White         | `#FFFFFF` | `oklch(1 0 0)`          | Fond cards uniquement                          |

### 1.3 Spectre lumineux (degrade signature)

Degrade diagonal ou horizontal utilise dans le logo, les barres d'accent et les elements decoratifs.
12 stops en interpolation OKLCh pour un fondu perceptuellement uniforme :

```css
linear-gradient(90deg in oklch,
  #4A1515  0%,   /* Grad-Abyss — extremite sombre */
  #6B2020  8%,
  #8B2C2C 18%,   /* Swiss Red */
  #A83D33 28%,
  #C44A38 36%,
  #D4553A 45%,   /* Coral */
  #DD7458 53%,
  #E8937A 63%,   /* Blush */
  #EDA88E 70%,
  #F5C4B0 78%,   /* Peach */
  #F7DDD0 88%,
  #F8F6F1 100%   /* Paper */
)
```

| Token du spectre  | Hex       | Usage                                          |
|-------------------|-----------|-------------------------------------------------|
| Grad-Abyss        | `#4A1515` | Extremite sombre du logo et des rubans          |
| Swiss Red         | `#8B2C2C` | Centre-gauche                                   |
| Coral             | `#D4553A` | Centre                                          |
| Blush             | `#E8937A` | Micro-connexions du logo, hover doux            |
| Peach             | `#F5C4B0` | Decorations legeres                             |

### 1.4 Couleurs fonctionnelles (scores, alertes)

| Nom           | Hex       | Usage dans les rapports                        |
|---------------|-----------|------------------------------------------------|
| Green         | `#22C55E` | Score >= 75 — Bon                              |
| Amber         | `#F59E0B` | Score 50-74 — Moyen                            |
| Orange        | `#F97316` | Score 25-49 — Faible                           |
| Red (alert)   | `#EF4444` | Score < 25 — Critique                          |

### 1.5 Couleurs de priorite (plan d'action)

| Priorite | Hex       | Label        |
|----------|-----------|--------------|
| P1       | `#DC2626` | CRITIQUE     |
| P2       | `#EA580C` | IMPORTANT    |
| P3       | `#D97706` | RECOMMANDE   |
| P4       | `#6B7280` | OPTIMISATION |

### 1.6 Chart (graphiques Recharts)

5 couleurs du spectre MCVA pour les series de donnees :

| Chart   | OKLCh                  | Rendu approximatif |
|---------|------------------------|--------------------|
| chart-1 | `oklch(0.38 0.12 25)` | Swiss Red          |
| chart-2 | `oklch(0.55 0.16 30)` | Coral              |
| chart-3 | `oklch(0.68 0.12 35)` | Blush fonce        |
| chart-4 | `oklch(0.78 0.08 40)` | Peach              |
| chart-5 | `oklch(0.88 0.04 45)` | Peach clair        |

---

## 2. Typographie

### 2.1 Familles

| Role     | Font           | Fallback                              | CSS Variable             | Usage                                    |
|----------|----------------|---------------------------------------|--------------------------|------------------------------------------|
| Display  | General Sans   | -apple-system, sans-serif             | `--font-general-sans`    | Titres, boutons, eyebrows, labels        |
| Body     | DM Sans        | -apple-system, BlinkMacSystemFont     | `--font-dm-sans`         | Texte courant, paragraphes               |
| Mono     | DM Mono        | SF Mono, monospace                    | `--font-dm-mono`         | Donnees techniques, scores, badges, code |

### 2.2 Graisses chargees

**General Sans** (self-hosted, woff2 dans `/src/fonts/`) :

| Poids | Fichier                    | Usage                              |
|-------|----------------------------|------------------------------------|
| 300   | GeneralSans-Light.woff2    | Sous-titres, textes legers         |
| 400   | GeneralSans-Regular.woff2  | Labels secondaires                 |
| 500   | GeneralSans-Medium.woff2   | Sous-titres, navigation, body hero |
| 600   | GeneralSans-Semibold.woff2 | Boutons, eyebrows, badges, h3      |
| 700   | GeneralSans-Bold.woff2     | h1, h2, logo wordmark              |

**DM Sans** (Google Fonts) : 300, 400, 500, 600, 700
**DM Mono** (Google Fonts) : 400, 500

### 2.3 Tracking (letter-spacing)

| Token             | Valeur    | Usage                                    |
|-------------------|-----------|------------------------------------------|
| `tracking-tight`  | `-0.02em` | Titres h1/h2 (aussi `-0.01em` sur h3-h6) |
| `tracking-wide`   | `0.15em`  | Boutons CTA                             |
| `tracking-label`  | `0.20em`  | Eyebrows, labels uppercase              |
| logo wordmark     | `0.12em`  | "MCVA" dans le logo                      |
| logo sub          | `0.25em`  | "AI CONSULTING" dans le logo             |

### 2.4 Hierarchie typographique (valeurs exactes du site)

| Element    | Font         | Size (desktop) | Weight | Line-height | Tracking   | Couleur            |
|------------|-------------|----------------|--------|-------------|------------|--------------------|
| Eyebrow    | General Sans | 12-14px        | 600    | —           | 0.20em     | Swiss Red, uppercase |
| H1         | General Sans | 72px (4.5rem)  | 700    | 1.05        | -0.025em   | Blanc (sombre) / Ink (clair) |
| H2         | General Sans | 36px (2.25rem) | 700    | —           | -0.025em   | Ink / Blanc        |
| H3         | General Sans | 18px (1.125rem)| 600    | —           | normal     | Ink / Blanc        |
| Body       | DM Sans     | 16px (1rem)    | 400    | 1.5 (24px)  | normal     | Ink                |
| Body hero  | General Sans | 18px           | 400    | 1.6 (28.8px)| normal     | white/70%          |
| Caption    | DM Sans     | 14px (0.875rem)| 400    | —           | normal     | Ink/60%            |
| Button nav | General Sans | 14px           | 600    | —           | 0.15em     | uppercase          |
| Button hero| General Sans | 18px           | 600    | —           | 0.15em     | uppercase, blanc   |
| Badge      | DM Mono     | 12px           | 500    | —           | normal     | Swiss Red, uppercase |
| Score      | DM Mono     | —              | 700    | —           | tabular-nums | couleur fonctionnelle |

### 2.5 Opacites du texte sur fond sombre (Abyss)

| Usage              | Opacite |
|--------------------|---------|
| Titres             | 100%    |
| Body               | 70%     |
| Sous-titres legers | 45%     |
| Tertiaire          | 40%     |

---

## 3. Logo — Swiss Network Mark v2.3

### 3.1 Structure SVG

Grille 2x2 de 4 carres arrondis (`rx="4"`) remplis du degrade diagonal du spectre.
Le carre bas-droite contient une **croix suisse** (blanche Paper `#F8F6F1`).
Des **micro-connexions Blush** (`#E8937A`, opacity 0.35-0.45) relient les blocs (masquees < 32px).

- ViewBox : `0 0 84 84`
- Carres : 28x28px, gap de 4px, position (2,2), (34,2), (2,34), (34,34)
- Croix : barres de 8x20px et 20x8px, rx=1.5

### 3.2 Degrade du logo

```
stop  0% → #4A1515
stop 20% → #6B2020
stop 40% → #8B2C2C
stop 60% → #A83D33
stop 80% → #C44A38
stop 100% → #D4553A
```

### 3.3 Tailles d'affichage

| Taille | Icone | Texte    | Sous-texte | Connexions |
|--------|-------|----------|------------|------------|
| sm     | 28px  | text-sm  | 8px        | Masquees   |
| md     | 36px  | text-lg  | 9px        | Visibles   |
| lg     | 48px  | text-2xl | 10px       | Visibles   |

### 3.4 Wordmark

```
MCVA               → General Sans Bold, tracking 0.12em
[barre 2px]         → bg Coral #D4553A, pleine largeur, my 3px
AI CONSULTING       → General Sans Medium, tracking 0.25em, uppercase
```

### 3.5 Variantes

- **Light** (sur fond sombre) : texte blanc, sous-texte `white/45%`
- **Dark** (sur fond clair) : texte Ink, sous-texte `Ink/50%`

---

## 4. Boutons

### 4.1 Styles communs

- Font : General Sans Semibold (600), uppercase, tracking `0.15em`
- Border-radius : `rounded-md` (10px)
- Transition : `all 200ms cubic-bezier(.4, 0, .2, 1)`
- Focus : ring 2px, offset 2px, couleur selon variante

### 4.2 Variantes

| Variante        | Fond                                 | Texte            | Hover                                      |
|-----------------|--------------------------------------|------------------|---------------------------------------------|
| `primary`       | Degrade `Red → Coral`                | Blanc            | Degrade `Abyss → Red`, lift -2px, shadow Red/20 |
| `secondary`     | Transparent, bordure Stone 1.5px     | Ink              | Bordure Red, texte Red                      |
| `outline`       | Transparent, bordure Red 2px         | Red              | Bg Red, texte blanc                         |
| `outline-white` | Transparent, bordure white/60% 1.5px | Blanc            | Bordure white, bg white/10%                 |
| `ghost`         | Transparent                          | Ink              | Bg Stone                                    |

### 4.3 Tailles

| Taille | Padding      | Font size |
|--------|--------------|-----------|
| sm     | `px-4 py-2`  | 14px      |
| md     | `px-6 py-3`  | 16px      |
| lg     | `px-8 py-4`  | 18px      |

---

## 5. Composants UI

### 5.1 Cards

- Fond : White `#FFFFFF`
- Border-radius : `rounded-lg` (16px)
- Bordure : Stone 1px
- Hover : lift -2px, shadow, bordure `Red/30%`
- Transition : `all 300ms`
- Jamais de changement de couleur de fond au hover

### 5.2 SectionHeading

```
[barre spectre 48x4px]  → degrade complet du spectre
EYEBROW                  → General Sans 600, 12px, uppercase, tracking 0.20em, Swiss Red
Titre                    → General Sans 700, 30-36px, tracking -0.02em, Ink
```

### 5.3 Badges / Tags

- Font : DM Mono 500, 12px, uppercase
- Fond : Mist `#F2F0EB`
- Texte : Swiss Red `#8B2C2C`
- Border-radius : `rounded-full` (pill 9999px)

### 5.4 Barre d'accent spectrale

Barre de 4px de haut, positionnee `absolute top-0 left-0 right-0`.
Utilise le degrade complet 12 stops en oklch (voir section 1.3).
Presente en haut des sections sombres et en separateur decoratif.

---

## 6. Layout et espacement

### 6.1 Sections

| Breakpoint | Padding vertical |
|------------|-----------------|
| Mobile     | `py-20` (80px)  |
| Desktop    | `py-28` (112px) |

### 6.2 Fonds de section

| Type               | Fond                | Texte                          |
|--------------------|---------------------|--------------------------------|
| Standard (clair)   | Paper `#F8F6F1`     | Ink `#0E0E0E`                  |
| Alterne (clair)    | Mist `#F2F0EB`      | Ink `#0E0E0E`                  |
| Sombre             | Abyss `#0A0808`     | Blanc, accents Red/Coral       |

### 6.3 Border-radius

| Token        | Valeur | Usage            |
|--------------|--------|------------------|
| `radius-sm`  | 6px    | Petits elements  |
| `radius-md`  | 10px   | Boutons          |
| `radius-lg`  | 16px   | Cards            |
| pill         | 9999px | Badges, tags     |

---

## 7. Animations

### 7.1 Canvas (site web)

6 animations Canvas 2D alignees sur le spectre, lazy-loaded (`ssr: false`).
Toutes respectent `prefers-reduced-motion`.

| Animation            | Section          | Description                          |
|----------------------|------------------|--------------------------------------|
| HeroGlowRibbon       | Hero             | 5 rubans degrade spectre             |
| NetworkConstellation | A propos hero    | Nodes + connexions spectre           |
| DataPulseFlow        | CTA              | 80 particules ascendantes            |
| SwissGridBreathing   | Expertises       | Croix suisses pulsantes              |
| PillarActivation     | Section IA       | 4 barres M/C/V/A spectre            |
| LuminousRingStat     | Stats (a propos) | Anneaux avec arcs spectre            |

### 7.2 Transitions CSS

- Duration standard : `200ms`
- Easing : `cubic-bezier(.4, 0, .2, 1)`
- Skeleton loading : pulse 1.5s ease-in-out infinite, fond degrade Mist

---

## 8. Directives pour la generation PDF (@react-pdf/renderer)

### 8.1 Polices

`@react-pdf/renderer` ne supporte pas les Google Fonts ni les variables CSS.
Enregistrer les polices locales avec `Font.register()` :

```typescript
import { Font } from "@react-pdf/renderer";

Font.register({
  family: "GeneralSans",
  fonts: [
    { src: "/fonts/GeneralSans-Light.woff2", fontWeight: 300 },
    { src: "/fonts/GeneralSans-Regular.woff2", fontWeight: 400 },
    { src: "/fonts/GeneralSans-Medium.woff2", fontWeight: 500 },
    { src: "/fonts/GeneralSans-Semibold.woff2", fontWeight: 600 },
    { src: "/fonts/GeneralSans-Bold.woff2", fontWeight: 700 },
  ],
});

Font.register({
  family: "DMMono",
  src: "https://fonts.gstatic.com/s/dmmono/v14/aFTU7PB1QTsUX8KYhh2aBYyMcKdI.woff2",
  fontWeight: 400,
});
```

### 8.2 Palette PDF

```typescript
const MCVA = {
  // Identite
  red:       "#8B2C2C",
  coral:     "#D4553A",
  ink:       "#0E0E0E",
  abyss:     "#0A0808",
  paper:     "#F8F6F1",
  mist:      "#F2F0EB",
  stone:     "#E8E4DD",
  white:     "#FFFFFF",
  // Spectre
  gradAbyss: "#4A1515",
  blush:     "#E8937A",
  peach:     "#F5C4B0",
  // Fonctionnelles
  green:     "#22C55E",
  amber:     "#F59E0B",
  orange:    "#F97316",
  redAlert:  "#EF4444",
  // Neutres
  gray:      "#6B7280",
  grayLight: "#F3F4F6",
};
```

### 8.3 Structure des pages PDF

- `paddingTop: 60, paddingBottom: 60, paddingHorizontal: 50`
- Barre d'accent en haut : `height: 4, backgroundColor: MCVA.red` (ou degrade si supporte)
- Footer fixe : `position: absolute, bottom: 30`, texte "MCVA Consulting SA — Confidentiel" + pagination

### 8.4 Hierarchie type PDF

| Element       | Font         | Size  | Weight | Couleur       |
|---------------|-------------|-------|--------|---------------|
| Titre page    | GeneralSans | 22pt  | 700    | Ink           |
| Sous-titre    | GeneralSans | 12pt  | 400    | Gray          |
| Section title | GeneralSans | 14pt  | 700    | Ink           |
| Body          | GeneralSans | 10pt  | 400    | Ink           |
| Label         | GeneralSans | 9pt   | 600    | Gray          |
| Caption       | GeneralSans | 8pt   | 400    | Gray          |
| Score grand   | DMMono      | 36pt  | 700    | fonctionnelle |
| Code item     | DMMono      | 8pt   | 600    | Gray          |

---

## 9. Tokens Tailwind CSS (copier dans globals.css)

```css
@theme inline {
  /* Identite MCVA */
  --color-coral: #D4553A;
  --color-coral-light: #E8937A;
  --color-coral-peach: #F5C4B0;

  /* Typo */
  --font-sans: var(--font-dm-sans), -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: var(--font-dm-mono), 'SF Mono', monospace;
  --font-heading: var(--font-general-sans), -apple-system, sans-serif;
  --font-display: var(--font-general-sans), -apple-system, sans-serif;
}

:root {
  --background: oklch(0.975 0.005 85);    /* Paper */
  --foreground: oklch(0.13 0 0);          /* Ink */
  --primary: oklch(0.38 0.12 25);         /* Swiss Red */
  --primary-foreground: oklch(0.975 0.005 85);
  --secondary: oklch(0.915 0.006 85);     /* Stone */
  --muted: oklch(0.955 0.005 85);         /* Mist */
  --border: oklch(0.915 0.006 85);        /* Stone */
  --card: oklch(1 0 0);                   /* White */
  --ring: oklch(0.38 0.12 25);            /* Swiss Red */
  --chart-1: oklch(0.38 0.12 25);         /* Red */
  --chart-2: oklch(0.55 0.16 30);         /* Coral */
  --chart-3: oklch(0.68 0.12 35);         /* Blush fonce */
  --chart-4: oklch(0.78 0.08 40);         /* Peach */
  --chart-5: oklch(0.88 0.04 45);         /* Peach clair */
}
```

---

## 10. Regles d'usage

1. **Coral jamais en aplat seul** — toujours en degrade (`Red → Coral`) ou comme accent mineur
2. **Titres = General Sans, corps = DM Sans** — ne jamais inverser
3. **Eyebrows toujours en uppercase** avec tracking `0.20em` et couleur Swiss Red
4. **Fond sombre = Abyss** (`#0A0808`), jamais noir pur `#000`
5. **Fond clair = Paper** (`#F8F6F1`), jamais blanc pur `#FFF` sauf cards
6. **Barre d'accent** : 4px, degrade spectre complet, en haut des sections sombres
7. **Hover cards** : lift -2px + shadow, jamais de changement de fond
8. **Logo** : toujours avec la croix suisse, jamais le texte seul sans l'icone
9. **Scores** : toujours en DM Mono, `font-variant-numeric: tabular-nums`, couleur fonctionnelle
10. **PDF** : utiliser GeneralSans enregistre (pas Helvetica), palette MCVA complète
