import Anthropic from "@anthropic-ai/sdk";
import { QUALITY_CONFIG } from "@/lib/constants";
import type { QualityLevel, SeoData, GeoData, Framework } from "@/types/audit";

/**
 * Generate a strategic action plan using LLM.
 * Extracted from Inngest functions to be reusable in direct API flow.
 */
export async function generateActionPlan(
  items: Array<{
    item_code: string;
    item_label: string;
    status: string;
    score: number;
    notes: string | null;
    dimension?: string;
    framework?: string;
  }>,
  seoData: SeoData | null,
  geoData: GeoData | null,
  url: string,
  quality: QualityLevel = "standard"
): Promise<
  Array<{
    priority: "P1" | "P2" | "P3" | "P4";
    title: string;
    description: string;
    impact_points: number;
    effort: string;
    category: string;
  }>
> {
  const config = QUALITY_CONFIG[quality];

  const failedItems = items
    .filter((item) => item.status !== "pass")
    .sort((a, b) => a.score - b.score);

  const passedItems = items.filter((item) => item.status === "pass");

  const coreEeatFails = failedItems.filter((i) => !i.item_code.startsWith("CI-"));
  const citeFails = failedItems.filter((i) => i.item_code.startsWith("CI-"));

  // Summarize SEO data context
  const seoContext = seoData
    ? [
        seoData.meta_title ? `Title: "${seoData.meta_title}"` : "Title: manquant",
        seoData.meta_description
          ? `Meta desc: "${seoData.meta_description}"`
          : "Meta desc: manquante",
        `H1: ${seoData.h1_count ?? "?"}, H2: ${seoData.h2_count ?? "?"}`,
        `Schema.org: ${seoData.has_schema_org ? (seoData.schema_types || []).join(", ") : "aucun"}`,
        `Liens internes: ${seoData.internal_links_count ?? "?"}, externes: ${seoData.external_links_count ?? "?"}`,
        `Images sans alt: ${seoData.images_without_alt ?? "?"}`,
        seoData.page_speed_score !== null && seoData.page_speed_score !== undefined
          ? `PageSpeed: ${seoData.page_speed_score}/100`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Donnees SEO non disponibles";

  // Summarize GEO data context
  const geoContext = geoData
    ? [
        `Score visibilite IA: ${geoData.ai_visibility_score}/100`,
        `Marque mentionnee: ${geoData.brand_mentioned ? "oui" : "non"}`,
        `Sentiment: ${geoData.brand_sentiment}`,
        `Citations: ${geoData.citation_count} sur ${geoData.models_coverage} modeles testes`,
        ...(geoData.models_tested || [])
          .filter((m: any) => m._actually_tested !== false)
          .map(
            (m: any) =>
              `  - ${m.model}: ${m.mentioned ? `mentionne (position: ${m.mention_position}, score: ${m.quality_score}/100)` : "non mentionne"}`
          ),
      ].join("\n")
    : "Donnees GEO non disponibles";

  const itemsSummary = failedItems
    .slice(0, 15)
    .map(
      (i) =>
        `[${i.item_code}] ${i.item_label} — ${i.score}/100`
    )
    .join("\n");

  const prompt = `Consultant SEO/GEO senior MCVA Consulting. Plan d'action strategique pour : ${url}

Echecs: ${failedItems.length}/${items.length} items. CORE-EEAT: ${coreEeatFails.length}, CITE: ${citeFails.length}.
SEO: ${seoContext}
GEO: ${geoContext}
Top echecs: ${itemsSummary}

Genere 10-15 actions en JSON strict. Format:
[{"priority":"P1","title":"max 60 chars","description":"2-3 phrases, probleme + solution concrete + impact attendu","impact_points":15,"effort":"2-3 jours","category":"technique"}]

REGLES CRITIQUES :
- P1=critique/immediat, P2=important/cette semaine, P3=recommande/ce mois, P4=optimisation/trimestre
- Categories: technique/contenu/GEO/notoriete/SEO
- Min 2 actions GEO (visibilite IA)
- Titres professionnels style cabinet de conseil (jamais "Ameliorer X")

VARIATION OBLIGATOIRE des impacts et efforts — chaque action doit avoir des valeurs DIFFERENTES et REALISTES :
- impact_points: varier entre 5 et 25 selon l'importance reelle (PAS tous a 20)
- effort: varier parmi "< 1h", "1-2h", "1 jour", "2-3 jours", "1 semaine", "2-4 semaines"
- La PREMIERE action P1 DOIT etre un quick win: effort "< 1h" ou "1-2h", concrete et actionnable immediatement (ex: ajout schema.org, correction meta, etc.)
- Les actions contenu/notoriete prennent plus de temps (1 semaine+), les actions techniques sont souvent rapides

JSON uniquement, sans texte avant ni apres.`;

  try {
    const anthropic = new Anthropic();
    // Use Haiku for action plan — it's strategic synthesis, not precise scoring
    // Much faster (~5-10s vs 20-40s for Sonnet) to stay within Vercel 60s limit
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-20250404",
      max_tokens: 2500,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content[0];
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (!text) {
      console.warn("[action-plan] Empty LLM response, falling back to basic plan");
      return generateFallbackActionPlan(failedItems);
    }

    const parsed = safeParseJsonActions(text);
    if (!parsed || parsed.length === 0) {
      console.warn("[action-plan] Failed to parse LLM response, falling back");
      return generateFallbackActionPlan(failedItems);
    }

    const validPriorities = ["P1", "P2", "P3", "P4"];
    const validCategories = ["technique", "contenu", "GEO", "notoriete", "SEO"];

    return parsed.slice(0, 15).map((action: any) => ({
      priority: validPriorities.includes(action.priority) ? action.priority : "P3",
      title:
        typeof action.title === "string"
          ? action.title.slice(0, 120)
          : "Action recommandee",
      description:
        typeof action.description === "string"
          ? action.description.slice(0, 600)
          : "",
      impact_points:
        typeof action.impact_points === "number"
          ? Math.min(25, Math.max(1, Math.round(action.impact_points)))
          : 5,
      effort:
        typeof action.effort === "string" ? action.effort.slice(0, 30) : "1-2 jours",
      category: validCategories.includes(action.category) ? action.category : "SEO",
    }));
  } catch (error) {
    console.error("[action-plan] LLM generation failed:", error);
    return generateFallbackActionPlan(failedItems);
  }
}

function safeParseJsonActions(text: string): any[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }

  const match = text.match(/\[[\s\S]*?\](?=[^[\]]*$)/);
  if (!match) {
    const greedyMatch = text.match(/\[[\s\S]*\]/);
    if (!greedyMatch) return null;
    try {
      const parsed = JSON.parse(greedyMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(match![0]);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* fall through */
  }

  return null;
}

function categorizeItem(code: string): string {
  if (code.startsWith("CI-")) {
    const citeDim = code.charAt(3);
    const citeMap: Record<string, string> = {
      C: "notoriete",
      I: "notoriete",
      T: "contenu",
      E: "contenu",
    };
    return citeMap[citeDim] || "SEO";
  }
  const prefix = code.replace(/\d+$/, "");
  const map: Record<string, string> = {
    C: "contenu",
    O: "technique",
    R: "notoriete",
    E: "contenu",
    Exp: "contenu",
    Ept: "contenu",
    A: "notoriete",
    T: "technique",
  };
  return map[prefix] || "SEO";
}

function generateFallbackActionPlan(
  failedItems: Array<{
    item_code: string;
    item_label: string;
    status: string;
    score: number;
    notes: string | null;
  }>
): Array<{
  priority: "P1" | "P2" | "P3" | "P4";
  title: string;
  description: string;
  impact_points: number;
  effort: string;
  category: string;
}> {
  return failedItems
    .sort((a, b) => a.score - b.score)
    .slice(0, 15)
    .map((item, idx) => ({
      priority: (
        idx < 3 ? "P1" : idx < 7 ? "P2" : idx < 12 ? "P3" : "P4"
      ) as "P1" | "P2" | "P3" | "P4",
      title: `Ameliorer : ${item.item_label}`,
      description:
        item.notes || `Le critere ${item.item_code} necessite une amelioration.`,
      impact_points: Math.max(1, Math.round((100 - item.score) / 5)),
      effort: item.score < 25 ? "2-3 jours" : "1-2h",
      category: categorizeItem(item.item_code),
    }));
}

// ============================================================
// Ultra Audit — Premium Action Plan (20-25 actions)
// ============================================================

type UltraActionItem = {
  item_code: string;
  item_label: string;
  status: string;
  score: number;
  notes: string | null;
  dimension?: string;
  framework?: string;
};

type UltraAction = {
  priority: "P1" | "P2" | "P3" | "P4";
  title: string;
  description: string;
  impact_points: number;
  effort: string;
  category: string;
  theme: string;
  kpi: string;
};

/**
 * Build enriched SEO context for Ultra Audit prompt.
 */
function buildUltraSeoContext(seoData: SeoData | null): string {
  if (!seoData) return "Donnees SEO non disponibles";

  const lines: (string | null)[] = [
    seoData.meta_title ? `Title: "${seoData.meta_title}"` : "Title: manquant",
    seoData.meta_title_length != null
      ? `  Longueur title: ${seoData.meta_title_length} caracteres`
      : null,
    seoData.meta_description
      ? `Meta description: "${seoData.meta_description}"`
      : "Meta description: manquante",
    seoData.meta_description_length != null
      ? `  Longueur meta desc: ${seoData.meta_description_length} caracteres`
      : null,
    `H1: ${seoData.h1_count ?? "?"}, H2: ${seoData.h2_count ?? "?"}`,
    `Schema.org: ${seoData.has_schema_org ? (seoData.schema_types || []).join(", ") : "aucun"}`,
    seoData.schema_detail
      ? `  Schemas: ${seoData.schema_detail.schemas_found.join(", ") || "aucun"} | FAQ: ${seoData.schema_detail.has_faq ? "oui" : "non"} | LocalBusiness: ${seoData.schema_detail.has_local_business ? "oui" : "non"} | Breadcrumb: ${seoData.schema_detail.has_breadcrumb ? "oui" : "non"}`
      : null,
    `Liens internes: ${seoData.internal_links_count ?? "?"}, externes: ${seoData.external_links_count ?? "?"}`,
    `Images sans alt: ${seoData.images_without_alt ?? "?"}`,
    seoData.page_speed_score != null
      ? `PageSpeed: ${seoData.page_speed_score}/100`
      : null,
    seoData.core_web_vitals
      ? `Core Web Vitals — LCP: ${seoData.core_web_vitals.lcp ?? "?"}ms, CLS: ${seoData.core_web_vitals.cls ?? "?"}, FID: ${seoData.core_web_vitals.fid ?? "?"}ms, INP: ${seoData.core_web_vitals.inp ?? "?"}ms, TTFB: ${seoData.core_web_vitals.ttfb ?? "?"}ms`
      : null,
    seoData.has_https != null ? `HTTPS: ${seoData.has_https ? "oui" : "non"}` : null,
    seoData.has_canonical != null
      ? `Canonical: ${seoData.has_canonical ? seoData.canonical_url || "oui" : "non"}`
      : null,
    seoData.has_robots_txt != null
      ? `robots.txt: ${seoData.has_robots_txt ? "present" : "absent"}`
      : null,
    seoData.has_sitemap != null
      ? `Sitemap: ${seoData.has_sitemap ? seoData.sitemap_url || "present" : "absent"}`
      : null,
    seoData.readability
      ? `Lisibilite Flesch: ${seoData.readability.flesch_score} (${seoData.readability.flesch_level}), ${seoData.readability.word_count} mots, phrases moy. ${seoData.readability.avg_sentence_length} mots`
      : null,
    seoData.organic_traffic != null
      ? `Trafic organique: ${seoData.organic_traffic}`
      : null,
    seoData.organic_keywords != null
      ? `Mots-cles organiques: ${seoData.organic_keywords}`
      : null,
    seoData.authority_score != null
      ? `Authority Score: ${seoData.authority_score}`
      : null,
    seoData.backlinks_total != null
      ? `Backlinks: ${seoData.backlinks_total} (${seoData.referring_domains ?? "?"} domaines referents)`
      : null,
    seoData.top_keywords && seoData.top_keywords.length > 0
      ? `Top keywords: ${seoData.top_keywords.slice(0, 10).map((k) => `${k.keyword} (pos ${k.position}, vol ${k.volume})`).join("; ")}`
      : null,
    seoData.performance_data
      ? `Performance mobile: ${seoData.performance_data.mobile?.score ?? "?"}/100, desktop: ${seoData.performance_data.desktop?.score ?? "?"}/100`
      : null,
  ];

  return lines.filter(Boolean).join("\n");
}

/**
 * Build enriched GEO context for Ultra Audit prompt.
 */
function buildUltraGeoContext(geoData: GeoData | null): string {
  if (!geoData) return "Donnees GEO non disponibles";

  const lines: string[] = [
    `Score visibilite IA: ${geoData.ai_visibility_score}/100`,
    `Marque mentionnee: ${geoData.brand_mentioned ? "oui" : "non"}`,
    `Sentiment global: ${geoData.brand_sentiment}`,
    `Citations: ${geoData.citation_count} sur ${geoData.models_coverage} modeles testes`,
  ];

  const testedModels = (geoData.models_tested || []).filter(
    (m) => m._actually_tested !== false
  );

  for (const m of testedModels) {
    const details = [
      m.mentioned ? "mentionne" : "non mentionne",
      m.mention_position ? `position: ${m.mention_position}` : null,
      m.quality_score != null ? `score qualite: ${m.quality_score}/100` : null,
      m.is_recommended != null
        ? `recommande: ${m.is_recommended ? "oui" : "non"}`
        : null,
      m.sentiment ? `sentiment: ${m.sentiment}` : null,
      m.context ? `contexte: "${m.context}"` : null,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(`  - ${m.model}: ${details}`);
  }

  if (geoData._all_models_failed) {
    lines.push("ATTENTION: Tous les modeles IA ont echoue lors du test.");
  }

  return lines.join("\n");
}

/**
 * Build per-framework diagnostic summaries from all items.
 */
function buildFrameworkSummaries(
  items: UltraActionItem[]
): string {
  const frameworkLabels: Record<string, string> = {
    core_eeat: "CORE-EEAT (SEO)",
    cite: "CITE (GEO / Visibilite IA)",
    perf: "Performance",
    a11y: "Accessibilite",
    rgesn: "Eco-conception (RGESN)",
    tech: "Technique",
    contenu: "Contenu",
  };

  const grouped: Record<string, UltraActionItem[]> = {};
  for (const item of items) {
    const fw = item.framework || "unknown";
    if (!grouped[fw]) grouped[fw] = [];
    grouped[fw].push(item);
  }

  const sections: string[] = [];

  for (const [fw, fwItems] of Object.entries(grouped)) {
    const label = frameworkLabels[fw] || fw;
    const passed = fwItems.filter((i) => i.status === "pass").length;
    const failed = fwItems.filter((i) => i.status !== "pass");
    const avgScore =
      fwItems.length > 0
        ? Math.round(
            fwItems.reduce((sum, i) => sum + i.score, 0) / fwItems.length
          )
        : 0;

    const failList = failed
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map((i) => `  - [${i.item_code}] ${i.item_label} — ${i.score}/100${i.notes ? ` (${i.notes})` : ""}`)
      .join("\n");

    sections.push(
      `### ${label}\nScore moyen: ${avgScore}/100 | Reussis: ${passed}/${fwItems.length} | Echecs: ${failed.length}\n${failList || "  Aucun echec"}`
    );
  }

  return sections.join("\n\n");
}

/**
 * Generate a premium Ultra Audit action plan (20-25 actions).
 * Uses Sonnet with a detailed strategic prompt.
 */
export async function generateUltraActionPlan(
  items: UltraActionItem[],
  seoData: SeoData | null,
  geoData: GeoData | null,
  url: string,
  quality: QualityLevel = "premium"
): Promise<UltraAction[]> {
  const failedItems = items
    .filter((item) => item.status !== "pass")
    .sort((a, b) => a.score - b.score);

  const passedItems = items.filter((item) => item.status === "pass");

  const seoContext = buildUltraSeoContext(seoData);
  const geoContext = buildUltraGeoContext(geoData);
  const frameworkSummaries = buildFrameworkSummaries(items);

  const prompt = `Tu es un consultant senior en stratégie digitale chez MCVA Consulting SA (Suisse).
Tu produis le plan d'action stratégique pour un Ultra Audit digital (rapport premium à CHF 4'900).

## SITE AUDITÉ
URL : ${url}
Items évalués : ${items.length} (${passedItems.length} réussis, ${failedItems.length} en échec)

## DONNÉES SEO
${seoContext}

## DONNÉES GEO (VISIBILITÉ IA)
${geoContext}

## DIAGNOSTIC PAR THÈME
${frameworkSummaries}

## CONSIGNES DE GÉNÉRATION

Génère exactement 20-25 actions en JSON. Chaque action DOIT contenir :

[{
  "priority": "P1",
  "title": "Titre stratégique cabinet de conseil (max 80 chars, jamais 'Améliorer X')",
  "description": "Paragraphe de 4-6 phrases structuré : (1) DIAGNOSTIC — constat factuel avec données chiffrées, (2) PRESCRIPTION — action concrète avec exemple de code/config/contenu si applicable, (3) IMPACT — résultat attendu chiffré",
  "impact_points": 15,
  "effort": "2-3 jours",
  "category": "technique",
  "theme": "seo",
  "kpi": "Meta description présente sur 100% des pages"
}]

## RÈGLES CRITIQUES

RÉPARTITION OBLIGATOIRE :
- Phase 1 (P1) Quick Wins : 6-8 actions, effort < 1 jour chacune
- Phase 2 (P2) Fondations : 8-10 actions, effort 1 jour à 1 semaine
- Phase 3 (P3+P4) Accélération : 6-8 actions, effort 1-4 semaines

COUVERTURE THÉMATIQUE OBLIGATOIRE :
- Min 4 actions SEO
- Min 3 actions GEO
- Min 2 actions Performance
- Min 2 actions Accessibilité
- Min 2 actions Contenu
- Min 1 action Technique
- Min 1 action Éco-conception

VARIATION OBLIGATOIRE :
- impact_points : varier 3-25
- effort : varier parmi "< 1h", "1-2h", "demi-journée", "1 jour", "2-3 jours", "1 semaine", "2 semaines", "1 mois"
- La PREMIÈRE action P1 = quick win immédiat (< 1h, très concret)

QUALITÉ DES DESCRIPTIONS :
- Chaque description est UNIQUE et SPÉCIFIQUE au site audité
- Citer les données concrètes du diagnostic
- Donner des exemples de code, schema.org, balises quand pertinent
- Jamais de formulation générique

Catégories : technique | contenu | GEO | notoriete | SEO
Thèmes : seo | geo | perf | a11y | rgesn | tech | contenu

JSON uniquement, sans texte avant ni après.`;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content[0];
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    if (!text) {
      console.warn("[ultra-action-plan] Empty LLM response, falling back to basic plan");
      return generateUltraFallbackActionPlan(failedItems);
    }

    const parsed = safeParseJsonActions(text);
    if (!parsed || parsed.length === 0) {
      console.warn("[ultra-action-plan] Failed to parse LLM response, falling back");
      return generateUltraFallbackActionPlan(failedItems);
    }

    const validPriorities = ["P1", "P2", "P3", "P4"];
    const validCategories = ["technique", "contenu", "GEO", "notoriete", "SEO"];
    const validThemes = ["seo", "geo", "perf", "a11y", "rgesn", "tech", "contenu"];

    const actions: UltraAction[] = parsed.slice(0, 25).map((action: any) => ({
      priority: validPriorities.includes(action.priority)
        ? action.priority
        : "P3",
      title:
        typeof action.title === "string"
          ? action.title.slice(0, 120)
          : "Action recommandee",
      description:
        typeof action.description === "string"
          ? action.description.slice(0, 1500)
          : "",
      impact_points:
        typeof action.impact_points === "number"
          ? Math.min(25, Math.max(1, Math.round(action.impact_points)))
          : 5,
      effort:
        typeof action.effort === "string" ? action.effort.slice(0, 30) : "1-2 jours",
      category: validCategories.includes(action.category)
        ? action.category
        : "SEO",
      theme: validThemes.includes(action.theme) ? action.theme : "seo",
      kpi:
        typeof action.kpi === "string" ? action.kpi.slice(0, 300) : "",
    }));

    // Validate theme coverage and log warnings
    validateUltraThemeCoverage(actions);

    return actions;
  } catch (error) {
    console.error("[ultra-action-plan] LLM generation failed:", error);
    return generateUltraFallbackActionPlan(failedItems);
  }
}

/**
 * Validate that Ultra Audit actions meet minimum theme coverage requirements.
 * Logs warnings if minimums are not met.
 */
function validateUltraThemeCoverage(actions: UltraAction[]): void {
  const themeMinimums: Record<string, number> = {
    seo: 4,
    geo: 3,
    perf: 2,
    a11y: 2,
    contenu: 2,
    tech: 1,
    rgesn: 1,
  };

  const themeCounts: Record<string, number> = {};
  for (const action of actions) {
    themeCounts[action.theme] = (themeCounts[action.theme] || 0) + 1;
  }

  for (const [theme, min] of Object.entries(themeMinimums)) {
    const count = themeCounts[theme] || 0;
    if (count < min) {
      console.warn(
        `[ultra-action-plan] Theme coverage warning: "${theme}" has ${count} actions (minimum: ${min})`
      );
    }
  }
}

/**
 * Fallback action plan for Ultra Audit when LLM fails.
 */
function generateUltraFallbackActionPlan(
  failedItems: UltraActionItem[]
): UltraAction[] {
  const themeFromFramework: Record<string, string> = {
    core_eeat: "seo",
    cite: "geo",
    perf: "perf",
    a11y: "a11y",
    rgesn: "rgesn",
    tech: "tech",
    contenu: "contenu",
  };

  return failedItems
    .sort((a, b) => a.score - b.score)
    .slice(0, 25)
    .map((item, idx) => ({
      priority: (
        idx < 7 ? "P1" : idx < 16 ? "P2" : idx < 22 ? "P3" : "P4"
      ) as "P1" | "P2" | "P3" | "P4",
      title: `Corriger : ${item.item_label}`,
      description:
        item.notes || `Le critere ${item.item_code} necessite une amelioration.`,
      impact_points: Math.max(1, Math.round((100 - item.score) / 4)),
      effort: item.score < 25 ? "2-3 jours" : "1-2h",
      category: categorizeItem(item.item_code),
      theme: themeFromFramework[item.framework || ""] || "seo",
      kpi: `Score ${item.item_code} > 75/100`,
    }));
}
