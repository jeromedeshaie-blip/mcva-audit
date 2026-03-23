import Anthropic from "@anthropic-ai/sdk";
import type { AuditItem, CoreEeatDimension, ItemStatus } from "@/types/audit";
import { CORE_EEAT_ITEMS, EXPRESS_ITEMS, type CoreEeatItemDef } from "./core-eeat-items";

/**
 * Scoring CORE-EEAT via LLM.
 *
 * Stratégie : 1 appel LLM par dimension (8 appels parallèles en mode complet,
 * 8 appels avec moins d'items en mode express).
 * Chaque appel évalue les items d'une dimension sur le HTML scrapé.
 *
 * temperature: 0 pour maximiser la reproductibilité.
 */

const anthropic = new Anthropic();

export async function scoreItems(
  html: string,
  url: string,
  mode: "express" | "full"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const items = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;

  // Group items by dimension
  const byDimension = new Map<string, CoreEeatItemDef[]>();
  for (const item of items) {
    const existing = byDimension.get(item.dimension) || [];
    existing.push(item);
    byDimension.set(item.dimension, existing);
  }

  // Score each dimension in parallel
  const dimensionResults = await Promise.allSettled(
    Array.from(byDimension.entries()).map(([dimension, dimensionItems]) =>
      scoreDimension(html, url, dimension as CoreEeatDimension, dimensionItems)
    )
  );

  const results: Omit<AuditItem, "id" | "audit_id">[] = [];
  for (const result of dimensionResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    }
  }

  return results;
}

async function scoreDimension(
  html: string,
  url: string,
  dimension: CoreEeatDimension,
  items: CoreEeatItemDef[]
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  // Truncate HTML to avoid exceeding context limits (~50k chars)
  const truncatedHtml = html.slice(0, 50000);

  const itemsList = items
    .map(
      (item) =>
        `- ${item.code}: ${item.label} — ${item.description}`
    )
    .join("\n");

  const prompt = `Tu es un auditeur SEO/GEO expert. Analyse cette page web et évalue chaque critère ci-dessous.

URL: ${url}

HTML de la page (tronqué si nécessaire):
\`\`\`html
${truncatedHtml}
\`\`\`

Critères à évaluer (dimension ${dimension}):
${itemsList}

Pour CHAQUE critère, réponds en JSON avec un tableau d'objets:
[
  {
    "code": "C01",
    "status": "pass" | "partial" | "fail",
    "score": 0-100,
    "notes": "Explication concise en français (1-2 phrases)"
  }
]

Règles de scoring:
- "pass" = 75-100 : le critère est pleinement satisfait
- "partial" = 25-74 : le critère est partiellement satisfait
- "fail" = 0-24 : le critère n'est pas satisfait
- Sois factuel et précis. Base ton évaluation uniquement sur ce qui est observable dans le HTML.
- Pour les critères GEO-First, sois particulièrement attentif à la compatibilité avec les moteurs IA.

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ni après.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // Fallback: return items with "partial" status if parsing fails
    return items.map((item) => ({
      framework: "core_eeat" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status: "partial" as ItemStatus,
      score: 50,
      notes: "Scoring automatique non disponible — évaluation manuelle requise.",
      is_geo_first: item.isGeoFirst,
      is_express_item: item.isExpress,
    }));
  }

  const parsed: Array<{
    code: string;
    status: string;
    score: number;
    notes: string;
  }> = JSON.parse(jsonMatch[0]);

  // Map parsed results back to items
  return items.map((item) => {
    const found = parsed.find((p) => p.code === item.code);

    return {
      framework: "core_eeat" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status: (found?.status || "partial") as ItemStatus,
      score: Math.min(100, Math.max(0, found?.score ?? 50)),
      notes: found?.notes || null,
      is_geo_first: item.isGeoFirst,
      is_express_item: item.isExpress,
    };
  });
}

/**
 * Calcule les scores agrégés par dimension à partir des items scorés.
 */
export function aggregateScores(
  items: Omit<AuditItem, "id" | "audit_id">[]
): Record<string, number> {
  const byDimension = new Map<string, number[]>();

  for (const item of items) {
    const scores = byDimension.get(item.dimension) || [];
    scores.push(item.score);
    byDimension.set(item.dimension, scores);
  }

  const result: Record<string, number> = {};
  for (const [dim, scores] of byDimension) {
    result[dim] = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
  }

  return result;
}

/**
 * Calcule le score SEO consolidé (0-100) à partir des scores CORE-EEAT.
 */
export function calculateSeoScore(
  coreEeatScores: Record<string, number>
): number {
  const weights: Record<string, number> = {
    C: 0.15, O: 0.15, R: 0.10, E: 0.10,
    Exp: 0.15, Ept: 0.15, A: 0.10, T: 0.10,
  };

  let weighted = 0;
  let totalWeight = 0;

  for (const [dim, weight] of Object.entries(weights)) {
    if (coreEeatScores[dim] !== undefined) {
      weighted += coreEeatScores[dim] * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;
}
