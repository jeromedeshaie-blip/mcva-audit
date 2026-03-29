import Anthropic from "@anthropic-ai/sdk";
import { QUALITY_CONFIG } from "@/lib/constants";
import type { QualityLevel, SeoData, GeoData } from "@/types/audit";

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
    .slice(0, 30)
    .map(
      (i) =>
        `[${i.item_code}] ${i.item_label} — score: ${i.score}/100 — ${i.notes || "pas de notes"}`
    )
    .join("\n");

  const prompt = `Tu es un consultant SEO/GEO senior chez MCVA Consulting, specialise en strategie de visibilite digitale et IA. Tu rediges le plan d'action d'un audit complet pour un client.

URL auditee : ${url}

## SCORES DE L'AUDIT
- Items reussis : ${passedItems.length}/${items.length}
- Items en echec ou partiels : ${failedItems.length}/${items.length}
- CORE-EEAT en echec : ${coreEeatFails.length} items
- CITE en echec : ${citeFails.length} items

## DONNEES SEO
${seoContext}

## DONNEES GEO (Visibilite IA)
${geoContext}

## CRITERES EN ECHEC (les plus critiques)
${itemsSummary}

---

Genere un plan d'action strategique de 10 a 15 recommandations. Chaque recommandation doit etre :

1. **Strategique** : regroupe plusieurs criteres lies en une action coherente (ne repete PAS chaque critere individuellement)
2. **Concrete** : donne des instructions precises et actionnables (pas de generalites)
3. **Priorisee** : commence par les quick wins a fort impact

Pour chaque action, reponds en JSON strict :
[
  {
    "priority": "P1",
    "title": "Titre concis et professionnel (max 60 chars)",
    "description": "Description detaillee en 2-4 phrases. Explique le probleme constate, la solution recommandee avec des etapes concretes, et l'impact attendu sur le SEO et/ou la visibilite IA.",
    "impact_points": 15,
    "effort": "2-3 jours",
    "category": "technique"
  }
]

Regles :
- priority : P1 = critique (faire immediatement), P2 = important (cette semaine), P3 = recommande (ce mois), P4 = optimisation (ce trimestre)
- impact_points : estimation realiste de l'amelioration du score global (1-25 pts)
- effort : duree realiste ("< 1h", "1-2h", "1 jour", "2-3 jours", "1 semaine", "2-4 semaines")
- category : "technique", "contenu", "GEO", "notoriete", ou "SEO"
- Inclus obligatoirement au moins 2 actions specifiques GEO (visibilite dans les moteurs IA)
- Les titres doivent etre professionnels (style cabinet de conseil), pas "Ameliorer X"
- Commence par les quick wins P1, termine par les actions P4 long terme

Reponds UNIQUEMENT avec le tableau JSON, sans texte avant ni apres.`;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: config.scoringModel,
      max_tokens: 4000,
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
