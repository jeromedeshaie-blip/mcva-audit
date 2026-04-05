/**
 * Mock scorer for dry-run mode.
 * Generates realistic-looking audit items WITHOUT calling the Anthropic API.
 * Used to test the full pipeline (init → scoring → finalize → results → PDF) at zero cost.
 */

import { CORE_EEAT_ITEMS, EXPRESS_ITEMS } from "./core-eeat-items";
import { CITE_ITEMS } from "./cite-items";
import type { ItemStatus } from "@/types/audit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random based on string seed */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 100) / 100;
}

function mockScore(seed: string): number {
  const r = seededRandom(seed);
  // Distribution: 25% fail (0-35), 35% partial (36-69), 40% pass (70-100)
  if (r < 0.25) return Math.round(10 + r * 100);
  if (r < 0.60) return Math.round(35 + r * 55);
  return Math.round(65 + r * 35);
}

function mockStatus(score: number): ItemStatus {
  if (score >= 70) return "pass";
  if (score >= 40) return "partial";
  return "fail";
}

function mockNotes(label: string, status: ItemStatus, score: number): string {
  const statusLabel = status === "pass" ? "Conforme" : status === "partial" ? "Partiellement conforme" : "Non conforme";
  return `[DRY-RUN] ${statusLabel} (${score}/100). Critere: "${label}". Ceci est une note de test generee sans appel LLM.`;
}

// ---------------------------------------------------------------------------
// CORE-EEAT mock scorer
// ---------------------------------------------------------------------------

export function mockScoreOneDimension(
  dimension: string,
  mode: "express" | "full",
): Array<{
  framework: "core_eeat";
  dimension: string;
  item_code: string;
  item_label: string;
  status: ItemStatus;
  score: number;
  notes: string;
  is_geo_first: boolean;
  is_express_item: boolean;
}> {
  const pool = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;
  const dimItems = pool.filter((i) => i.dimension === dimension);

  return dimItems.map((item) => {
    const score = mockScore(`core_eeat-${item.code}`);
    const status = mockStatus(score);
    return {
      framework: "core_eeat" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status,
      score,
      notes: mockNotes(item.label, status, score),
      is_geo_first: item.isGeoFirst ?? false,
      is_express_item: item.isExpress ?? false,
    };
  });
}

// ---------------------------------------------------------------------------
// CITE mock scorer
// ---------------------------------------------------------------------------

export function mockScoreOneCiteDimension(
  dimension: string,
): Array<{
  framework: "cite";
  dimension: string;
  item_code: string;
  item_label: string;
  status: ItemStatus;
  score: number;
  notes: string;
  is_geo_first: boolean;
  is_express_item: boolean;
}> {
  const dimItems = CITE_ITEMS.filter((i) => i.dimension === dimension);

  return dimItems.map((item) => {
    const score = mockScore(`cite-${item.code}`);
    const status = mockStatus(score);
    return {
      framework: "cite" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status,
      score,
      notes: mockNotes(item.label, status, score),
      is_geo_first: false,
      is_express_item: item.isExpress ?? false,
    };
  });
}

// ---------------------------------------------------------------------------
// Theme mock scorer (perf, a11y, rgesn, tech, contenu)
// ---------------------------------------------------------------------------

/** Theme dimension definitions (same structure as theme-scorer.ts) */
const THEME_DIMENSIONS: Record<string, string[]> = {
  perf: ["lcp", "cls", "inp", "ttfb", "resources", "caching", "compression", "images", "fonts", "scripts", "lazy_loading", "cdn", "http2", "preload", "critical_css"],
  a11y: ["perceivable_text", "perceivable_media", "perceivable_color", "operable_keyboard", "operable_navigation", "operable_timing", "understandable_language", "understandable_forms", "understandable_errors", "robust_parsing", "robust_aria", "robust_compatibility"],
  rgesn: ["ecodesign_weight", "ecodesign_requests", "ecodesign_cache", "ecodesign_images", "ecodesign_scripts", "ecodesign_fonts", "ecodesign_animations"],
  tech: ["security_https", "security_headers", "seo_robots", "seo_sitemap", "seo_canonical", "mobile_viewport", "mobile_responsive", "structured_data", "i18n_hreflang", "error_handling"],
  contenu: ["quality_depth", "quality_freshness", "quality_expertise", "structure_headings", "structure_readability", "media_images", "media_videos", "engagement_cta", "engagement_internal_links", "semantic_entities", "semantic_topical_coverage"],
};

export function mockScoreThemeDimension(
  theme: string,
  dimension: string,
): Array<{
  framework: string;
  dimension: string;
  item_code: string;
  item_label: string;
  status: ItemStatus;
  score: number;
  notes: string;
  is_geo_first: boolean;
  is_express_item: boolean;
}> {
  // Generate 2-4 items per dimension
  const seed = `${theme}-${dimension}`;
  const numItems = 2 + Math.round(seededRandom(seed + "-count") * 2);
  const items = [];

  for (let i = 0; i < numItems; i++) {
    const code = `${theme.toUpperCase().slice(0, 3)}-${dimension.slice(0, 3).toUpperCase()}${String(i + 1).padStart(2, "0")}`;
    const label = `${dimension.replace(/_/g, " ")} - critere ${i + 1}`;
    const score = mockScore(`${seed}-${i}`);
    const status = mockStatus(score);

    items.push({
      framework: theme,
      dimension,
      item_code: code,
      item_label: label,
      status,
      score,
      notes: mockNotes(label, status, score),
      is_geo_first: false,
      is_express_item: false,
    });
  }

  return items;
}

export function mockGetThemeDimensions(theme: string): string[] {
  return THEME_DIMENSIONS[theme] || [];
}

// ---------------------------------------------------------------------------
// GEO mock data
// ---------------------------------------------------------------------------

export function mockGeoData(url: string) {
  return {
    ai_visibility_score: 32,
    models_tested: [
      {
        model: "gpt-4o",
        mentioned: true,
        citation_text: `[DRY-RUN] ${url} est mentionné comme référence dans le domaine.`,
        sentiment: "neutral" as const,
        context: "Mentionné dans une liste de ressources.",
        quality_score: 45,
        mention_position: "listed" as const,
        is_recommended: false,
      },
      {
        model: "perplexity",
        mentioned: true,
        citation_text: `[DRY-RUN] Le site ${url} propose des services professionnels.`,
        sentiment: "positive" as const,
        context: "Cité comme acteur du secteur.",
        quality_score: 55,
        mention_position: "top3" as const,
        is_recommended: true,
      },
    ],
    brand_mentioned: true,
    brand_sentiment: "neutral" as const,
    citation_count: 2,
    models_coverage: 2,
  };
}

// ---------------------------------------------------------------------------
// Action plan mock
// ---------------------------------------------------------------------------

export function mockActionPlan(isUltra: boolean) {
  const actions = [
    { priority: "P1", title: "Optimiser les balises title et meta-description", description: "[DRY-RUN] Les balises title et meta-description doivent etre uniques et optimisees pour chaque page.", impact_points: 8, effort: "< 1h", category: "SEO", theme: "seo", kpi: "CTR organique +15%" },
    { priority: "P1", title: "Corriger les erreurs Core Web Vitals (LCP)", description: "[DRY-RUN] Le LCP depasse le seuil recommande. Optimiser les images et le rendu initial.", impact_points: 9, effort: "1-2 jours", category: "technique", theme: "perf", kpi: "LCP < 2.5s" },
    { priority: "P2", title: "Ajouter le balisage Schema.org", description: "[DRY-RUN] Aucun schema structured data detecte. Ajouter Organization, LocalBusiness ou Service.", impact_points: 7, effort: "< 1h", category: "SEO", theme: "tech", kpi: "Rich snippets SERP" },
    { priority: "P2", title: "Ameliorer l'accessibilite des formulaires", description: "[DRY-RUN] Les champs de formulaire manquent de labels associes et d'attributs aria.", impact_points: 6, effort: "1-2 jours", category: "technique", theme: "a11y", kpi: "Score a11y +20pts" },
    { priority: "P2", title: "Creer du contenu expert pour les IA generatives", description: "[DRY-RUN] Publier des contenus FAQ, How-to et definitions claires pour etre cite par les LLM.", impact_points: 8, effort: "1 semaine", category: "GEO", theme: "geo", kpi: "Citations IA x2" },
    { priority: "P3", title: "Optimiser le poids des pages (eco-conception)", description: "[DRY-RUN] Reduire le poids total des pages sous 1MB. Compresser images, minifier CSS/JS.", impact_points: 5, effort: "1-2 jours", category: "technique", theme: "rgesn", kpi: "Poids page -40%" },
    { priority: "P3", title: "Ameliorer le maillage interne", description: "[DRY-RUN] Les pages profondes manquent de liens internes. Ajouter des liens contextuels.", impact_points: 6, effort: "1-2 jours", category: "contenu", theme: "contenu", kpi: "Pages indexees +25%" },
    { priority: "P3", title: "Renforcer la securite HTTP (headers)", description: "[DRY-RUN] Ajouter les headers Content-Security-Policy, X-Frame-Options, Permissions-Policy.", impact_points: 4, effort: "< 1h", category: "technique", theme: "tech", kpi: "Score securite A+" },
    { priority: "P4", title: "Deployer une strategie de backlinks", description: "[DRY-RUN] Le profil de liens entrants est faible. Identifier des opportunites de partenariats.", impact_points: 7, effort: "1 mois", category: "notoriete", theme: "seo", kpi: "DA +10 en 6 mois" },
    { priority: "P4", title: "Mettre en place un suivi de visibilite IA", description: "[DRY-RUN] Monitorer les citations dans ChatGPT, Perplexity et Gemini mensuellement.", impact_points: 3, effort: "1-2 jours", category: "GEO", theme: "geo", kpi: "Rapport mensuel GEO" },
  ];

  if (isUltra) {
    return actions.slice(0, 10);
  }
  return actions.slice(0, 7).map(({ theme, kpi, ...rest }) => rest);
}
