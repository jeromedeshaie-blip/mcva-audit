/**
 * Définition des 15 items Performance.
 * Les 5 items marqués `isPreAudit: true` (CWV) sont utilisés dans le pré-audit.
 * L'audit complet/ultra utilise les 15 items.
 */

export interface PerfItemDef {
  code: string;
  label: string;
  dimension: string; // "cwv" | "assets" | "js_css"
  description: string;
  isPreAudit: boolean;
}

export const PERF_ITEMS: PerfItemDef[] = [
  // === CWV — Core Web Vitals (5 items, all isPreAudit) ===
  { code: "PERF01", label: "LCP (Largest Contentful Paint) < 2.5s", dimension: "cwv", description: "Le plus grand élément visible se charge en moins de 2,5 secondes.", isPreAudit: true },
  { code: "PERF02", label: "CLS (Cumulative Layout Shift) < 0.1", dimension: "cwv", description: "La stabilité visuelle est assurée : pas de décalages de mise en page inattendus.", isPreAudit: true },
  { code: "PERF03", label: "INP (Interaction to Next Paint) < 200ms", dimension: "cwv", description: "Les interactions utilisateur obtiennent une réponse visuelle en moins de 200 ms.", isPreAudit: true },
  { code: "PERF04", label: "FCP (First Contentful Paint) < 1.8s", dimension: "cwv", description: "Le premier contenu visible s'affiche en moins de 1,8 seconde.", isPreAudit: true },
  { code: "PERF05", label: "TTFB (Time to First Byte) < 800ms", dimension: "cwv", description: "Le serveur répond en moins de 800 ms après la requête initiale.", isPreAudit: true },

  // === Assets (5 items) ===
  { code: "PERF06", label: "Poids total de la page < 2 Mo", dimension: "assets", description: "Le poids total de la page (HTML, CSS, JS, images, fonts) reste sous les 2 Mo.", isPreAudit: false },
  { code: "PERF07", label: "Images optimisées (WebP/AVIF, lazy loading)", dimension: "assets", description: "Les images utilisent des formats modernes (WebP/AVIF) et le chargement différé (lazy loading).", isPreAudit: false },
  { code: "PERF08", label: "Fonts web optimisées (≤2 familles, swap/optional)", dimension: "assets", description: "Maximum 2 familles de polices web, avec font-display: swap ou optional pour éviter le FOIT.", isPreAudit: false },
  { code: "PERF09", label: "Compression activée (gzip/brotli)", dimension: "assets", description: "Les ressources textuelles sont servies avec compression gzip ou brotli.", isPreAudit: false },
  { code: "PERF10", label: "CDN pour les ressources statiques", dimension: "assets", description: "Les ressources statiques (images, JS, CSS) sont servies via un CDN pour réduire la latence.", isPreAudit: false },

  // === JS/CSS (5 items) ===
  { code: "PERF11", label: "JavaScript non bloquant (defer/async)", dimension: "js_css", description: "Les scripts JS utilisent defer ou async pour ne pas bloquer le rendu de la page.", isPreAudit: false },
  { code: "PERF12", label: "CSS critique inliné / au-dessus de la ligne de flottaison", dimension: "js_css", description: "Le CSS critique est inliné ou chargé en priorité pour un rendu rapide au-dessus de la ligne de flottaison.", isPreAudit: false },
  { code: "PERF13", label: "Requêtes tierces limitées (analytics, widgets)", dimension: "js_css", description: "Le nombre de requêtes vers des domaines tiers (analytics, widgets, pubs) est maîtrisé.", isPreAudit: false },
  { code: "PERF14", label: "Service Worker / cache stratégique", dimension: "js_css", description: "Un Service Worker ou une stratégie de cache HTTP est en place pour les ressources récurrentes.", isPreAudit: false },
  { code: "PERF15", label: "Pas de scripts inutiles ou redondants", dimension: "js_css", description: "Aucun script JS inutilisé, dupliqué ou obsolète n'est chargé sur la page.", isPreAudit: false },
];

export const PERF_PRE_AUDIT_ITEMS = PERF_ITEMS.filter((item) => item.isPreAudit);

// Verify counts
if (PERF_ITEMS.length !== 15) {
  console.warn(`Expected 15 PERF items, got ${PERF_ITEMS.length}`);
}
if (PERF_PRE_AUDIT_ITEMS.length !== 5) {
  console.warn(`Expected 5 pre-audit PERF items, got ${PERF_PRE_AUDIT_ITEMS.length}`);
}
