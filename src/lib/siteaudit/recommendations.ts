import type {
  SeoCheck,
  AuditRecommendation,
  PerformanceData,
  AccessibilityViolation,
} from "./types";

export function generateRecommendations(
  seoChecks: SeoCheck[],
  performance: PerformanceData,
  accessibility: AccessibilityViolation[],
  scores: {
    seo: number;
    performance: number;
    accessibility: number;
    readability: number;
  }
): AuditRecommendation[] {
  const recommendations: AuditRecommendation[] = [];

  const failedChecks = seoChecks.filter((c) => c.status === "fail");
  const warnChecks = seoChecks.filter((c) => c.status === "warn");

  // ── SEO / GEO ─────────────────────────────────────────────

  if (failedChecks.find((c) => c.id === "schema_local_business")) {
    recommendations.push({
      id: "add_local_business_schema",
      priority: "critical",
      dimension: "geo",
      title: "Ajouter un schema.org LocalBusiness",
      description:
        "Votre site ne contient aucune donnée structurée LocalBusiness. C'est la cause principale de votre faible visibilité dans ChatGPT et Gemini sur les requêtes géolocalisées.",
      action:
        'Ajouter un bloc <script type="application/ld+json"> avec @type: "LocalBusiness", incluant name, address, telephone, openingHours, geo, url.',
      impact_points: 15,
      effort: "low",
    });
  }

  if (
    failedChecks.find((c) => c.id === "schema_faq") ||
    warnChecks.find((c) => c.id === "schema_faq")
  ) {
    recommendations.push({
      id: "add_faq_schema",
      priority: "high",
      dimension: "geo",
      title: "Créer une page FAQ avec Schema.org FAQPage",
      description:
        "Les LLM extraient directement les réponses depuis les pages FAQ structurées. Une page Q&A métier serait citée par Perplexity et Claude.",
      action:
        "Créer une page /faq avec 8–12 questions/réponses métier et le markup Schema.org FAQPage correspondant.",
      impact_points: 12,
      effort: "medium",
    });
  }

  if (
    failedChecks.find((c) => c.id === "h1_present") ||
    failedChecks.find((c) => c.id === "h1_unique")
  ) {
    recommendations.push({
      id: "fix_h1",
      priority: "critical",
      dimension: "seo",
      title: "Corriger la structure H1",
      description:
        "Le H1 est le premier signal lu par les moteurs de recherche ET par les LLM pour comprendre le positionnement du site.",
      action:
        "Définir un H1 unique et explicite sur la page d'accueil incluant votre activité et localisation.",
      impact_points: 10,
      effort: "low",
    });
  }

  if (
    seoChecks.find((c) => c.id === "hreflang")?.status !== "pass"
  ) {
    recommendations.push({
      id: "add_hreflang",
      priority: "high",
      dimension: "geo",
      title: "Ajouter les balises hreflang FR/DE",
      description:
        "Critique pour le marché suisse bilingue. Sans hreflang, les LLM ne peuvent pas identifier que votre site sert aussi une clientèle alémanique.",
      action:
        'Ajouter <link rel="alternate" hreflang="fr-CH"> et <link rel="alternate" hreflang="de-CH"> dans le <head>.',
      impact_points: 8,
      effort: "medium",
    });
  }

  if (failedChecks.find((c) => c.id === "meta_description")) {
    recommendations.push({
      id: "add_meta_description",
      priority: "high",
      dimension: "seo",
      title: "Ajouter une meta description",
      description:
        "La meta description est utilisée par les LLM pour résumer le positionnement du site.",
      action:
        "Rédiger une meta description de 140–160 caractères incluant les mots-clés prioritaires.",
      impact_points: 6,
      effort: "low",
    });
  }

  // ── PERFORMANCE ───────────────────────────────────────────

  if (performance.score < 50) {
    recommendations.push({
      id: "improve_performance_critical",
      priority: "critical",
      dimension: "performance",
      title: `Performance critique — score ${performance.score}/100`,
      description: `Google pénalise fortement les sites lents. LCP actuel : ${
        Math.round((performance.lcp / 1000) * 10) / 10
      }s (objectif < 2.5s).`,
      action:
        "Compresser les images (format WebP), activer le cache navigateur, minifier CSS/JS, utiliser un CDN.",
      impact_points: 10,
      effort: "high",
    });
  } else if (performance.score < 75) {
    recommendations.push({
      id: "improve_performance",
      priority: "medium",
      dimension: "performance",
      title: `Performance à améliorer — score ${performance.score}/100`,
      description: `Le site est fonctionnel mais améliorable. Mobile : ${performance.mobile_score}/100, Desktop : ${performance.desktop_score}/100.`,
      action:
        "Optimiser les images et différer le chargement des scripts non-critiques.",
      impact_points: 6,
      effort: "medium",
    });
  }

  // ── ACCESSIBILITÉ ─────────────────────────────────────────

  const criticalViolations = accessibility.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  if (criticalViolations.length > 0) {
    recommendations.push({
      id: "fix_accessibility_critical",
      priority: "high",
      dimension: "accessibility",
      title: `${criticalViolations.length} violation(s) d'accessibilité critiques`,
      description: `Violations WCAG critiques détectées : ${criticalViolations
        .map((v) => v.description)
        .join(", ")}.`,
      action:
        "Corriger les violations critiques en priorité : contraste des couleurs, attributs alt manquants, structure des formulaires.",
      impact_points: 8,
      effort: "medium",
    });
  }

  // Tri par priorité + impact
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      b.impact_points - a.impact_points
  );
}
