import Anthropic from "@anthropic-ai/sdk";
import type { AuditItem, CoreEeatDimension, CiteDimension, ItemStatus, QualityLevel } from "@/types/audit";
import { CORE_EEAT_ITEMS, EXPRESS_ITEMS, type CoreEeatItemDef } from "./core-eeat-items";
import { CITE_ITEMS, CITE_EXPRESS_ITEMS, type CiteItemDef } from "./cite-items";
import { QUALITY_CONFIG } from "@/lib/constants";

/**
 * Scoring CORE-EEAT via LLM.
 *
 * Stratégie : 1 appel LLM par dimension (8 appels parallèles en mode complet,
 * 8 appels avec moins d'items en mode express).
 * Chaque appel évalue les items d'une dimension sur le HTML scrapé.
 *
 * temperature: 0 pour maximiser la reproductibilité.
 */

const VALID_STATUSES: ItemStatus[] = ["pass", "partial", "fail"];

function validateStatus(status: unknown): ItemStatus {
  if (typeof status === "string") {
    const lower = status.toLowerCase().trim();
    if (VALID_STATUSES.includes(lower as ItemStatus)) {
      return lower as ItemStatus;
    }
  }
  return "partial";
}

interface LlmScoredItem {
  code?: string;
  status?: string;
  score?: number | string;
  notes?: string;
}

function safeParseJson(text: string): LlmScoredItem[] | null {
  // Try parsing the full text first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as LlmScoredItem[];
  } catch {
    // fall through to regex
  }

  // Try non-greedy regex extraction
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed)) return parsed as LlmScoredItem[];
  } catch {
    // fall through
  }

  // Try greedy as last resort (for nested arrays)
  const greedyMatch = text.match(/\[[\s\S]*\]/);
  if (!greedyMatch || greedyMatch[0] === jsonMatch?.[0]) return null;

  try {
    const parsed = JSON.parse(greedyMatch[0]);
    if (Array.isArray(parsed)) return parsed as LlmScoredItem[];
  } catch {
    // all parsing attempts failed
  }

  return null;
}

function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic();
}

export async function scoreItems(
  html: string,
  url: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  if (!html || html.trim().length < 50) {
    console.warn("[scorer] HTML trop court ou vide, scoring impossible");
    return [];
  }

  const items = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;

  // Group items by dimension
  const byDimension = new Map<string, CoreEeatItemDef[]>();
  for (const item of items) {
    const existing = byDimension.get(item.dimension) || [];
    existing.push(item);
    byDimension.set(item.dimension, existing);
  }

  // Score each dimension in parallel
  const config = QUALITY_CONFIG[quality];
  const notesDepth = config.notesDepth ?? "concise";
  const dimensionResults = await Promise.allSettled(
    Array.from(byDimension.entries()).map(([dimension, dimensionItems]) =>
      scoreDimension(html, url, dimension as CoreEeatDimension, dimensionItems, config.scoringModel, config.htmlMaxChars, config.maxTokensScoring, notesDepth)
    )
  );

  const results: Omit<AuditItem, "id" | "audit_id">[] = [];
  let failedDimensions = 0;

  for (const result of dimensionResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    } else {
      failedDimensions++;
      console.error("[scorer] Dimension scoring failed:", result.reason?.message || result.reason);
    }
  }

  if (failedDimensions > 0) {
    console.warn(`[scorer] ${failedDimensions}/${byDimension.size} CORE-EEAT dimensions failed`);
  }

  return results;
}

/**
 * Score a single CORE-EEAT dimension — exported for Inngest step-per-dimension pattern.
 */
export async function scoreOneDimension(
  html: string,
  url: string,
  dimension: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const allItems = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;
  const dimensionItems = allItems.filter((i) => i.dimension === dimension);
  if (dimensionItems.length === 0) return [];

  const config = QUALITY_CONFIG[quality];
  const notesDepth = config.notesDepth ?? "concise";
  return scoreDimension(html, url, dimension as CoreEeatDimension, dimensionItems, config.scoringModel, config.htmlMaxChars, config.maxTokensScoring, notesDepth);
}

/**
 * Score a single CITE dimension — exported for Inngest step-per-dimension pattern.
 */
export async function scoreOneCiteDimension(
  html: string,
  url: string,
  dimension: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const allItems = mode === "express" ? CITE_EXPRESS_ITEMS : CITE_ITEMS;
  const dimensionItems = allItems.filter((i) => i.dimension === dimension);
  if (dimensionItems.length === 0) return [];

  const config = QUALITY_CONFIG[quality];
  const notesDepth = config.notesDepth ?? "concise";
  return scoreCiteDimension(html, url, dimension as CiteDimension, dimensionItems, config.scoringModel, config.htmlMaxChars, config.maxTokensScoring, notesDepth);
}

/**
 * Get all unique dimensions for a given mode/framework.
 */
export function getCoreEeatDimensions(mode: "express" | "full"): string[] {
  const items = mode === "express" ? EXPRESS_ITEMS : CORE_EEAT_ITEMS;
  return [...new Set(items.map((i) => i.dimension))];
}

export function getCiteDimensions(mode: "express" | "full"): string[] {
  const items = mode === "express" ? CITE_EXPRESS_ITEMS : CITE_ITEMS;
  return [...new Set(items.map((i) => i.dimension))];
}

async function scoreDimension(
  html: string,
  url: string,
  dimension: CoreEeatDimension,
  items: CoreEeatItemDef[],
  model: string = "claude-sonnet-4-6",
  htmlMaxChars: number = 50000,
  maxTokens: number = 2000,
  notesDepth: "concise" | "detailed" = "concise"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const truncatedHtml = html.slice(0, htmlMaxChars);

  const itemsList = items
    .map(
      (item) =>
        `- ${item.code}: ${item.label} — ${item.description}`
    )
    .join("\n");

  const notesInstruction = notesDepth === "detailed"
    ? `"notes": "Analyse détaillée en 3-5 phrases : (1) constat factuel observé dans le HTML, (2) impact sur le référencement/visibilité IA, (3) recommandation concrète avec exemple de code/config si applicable"`
    : `"notes": "Explication concise en français (1-2 phrases)"`;

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
    ${notesInstruction}
  }
]

Règles de scoring:
- "pass" = 75-100 : le critère est pleinement satisfait
- "partial" = 25-74 : le critère est partiellement satisfait
- "fail" = 0-24 : le critère n'est pas satisfait
- Sois factuel et précis. Base ton évaluation uniquement sur ce qui est observable dans le HTML.
- Pour les critères GEO-First, sois particulièrement attentif à la compatibilité avec les moteurs IA.

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ni après.`;

  const anthropic = createAnthropicClient();

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content[0];
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

  if (!text) {
    console.warn(`[scorer] Empty response for CORE-EEAT dimension ${dimension} (model: ${model})`);
    return makeFallbackItems(items, "core_eeat");
  }

  // Parse JSON response with robust fallbacks
  const parsed = safeParseJson(text);
  if (!parsed) {
    console.warn(`[scorer] Failed to parse JSON for CORE-EEAT dimension ${dimension}`);
    return makeFallbackItems(items, "core_eeat");
  }

  // Map parsed results back to items
  return items.map((item) => {
    const found = parsed.find((p: any) => p?.code === item.code);

    const score = typeof found?.score === "number"
      ? Math.min(100, Math.max(0, Math.round(found.score)))
      : typeof found?.score === "string"
        ? Math.min(100, Math.max(0, Math.round(parseFloat(found.score)) || 50))
        : 50;

    return {
      framework: "core_eeat" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status: validateStatus(found?.status),
      score,
      notes: typeof found?.notes === "string" ? found.notes : null,
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
    if (scores.length === 0) continue;
    result[dim] = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
  }

  return result;
}

/**
 * Scoring CITE via LLM — même approche que CORE-EEAT.
 * 1 appel par dimension (4 dimensions), évalue la crédibilité du domaine.
 */
export async function scoreCiteItems(
  html: string,
  url: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  if (!html || html.trim().length < 50) {
    console.warn("[scorer] HTML trop court ou vide, scoring CITE impossible");
    return [];
  }

  const items = mode === "express" ? CITE_EXPRESS_ITEMS : CITE_ITEMS;

  const byDimension = new Map<string, CiteItemDef[]>();
  for (const item of items) {
    const existing = byDimension.get(item.dimension) || [];
    existing.push(item);
    byDimension.set(item.dimension, existing);
  }

  const config = QUALITY_CONFIG[quality];
  const notesDepth = config.notesDepth ?? "concise";
  const dimensionResults = await Promise.allSettled(
    Array.from(byDimension.entries()).map(([dimension, dimensionItems]) =>
      scoreCiteDimension(html, url, dimension as CiteDimension, dimensionItems, config.scoringModel, config.htmlMaxChars, config.maxTokensScoring, notesDepth)
    )
  );

  const results: Omit<AuditItem, "id" | "audit_id">[] = [];
  let failedDimensions = 0;

  for (const result of dimensionResults) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    } else {
      failedDimensions++;
      console.error("[scorer] CITE dimension scoring failed:", result.reason?.message || result.reason);
    }
  }

  if (failedDimensions > 0) {
    console.warn(`[scorer] ${failedDimensions}/${byDimension.size} CITE dimensions failed`);
  }

  return results;
}

async function scoreCiteDimension(
  html: string,
  url: string,
  dimension: CiteDimension,
  items: CiteItemDef[],
  model: string = "claude-sonnet-4-6",
  htmlMaxChars: number = 50000,
  maxTokens: number = 2000,
  notesDepth: "concise" | "detailed" = "concise"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const truncatedHtml = html.slice(0, htmlMaxChars);

  const dimensionLabels: Record<string, string> = {
    C: "Crédibilité",
    I: "Influence",
    T: "Confiance (Trust)",
    E: "Engagement",
  };

  const itemsList = items
    .map((item) => `- ${item.code}: ${item.label} — ${item.description}`)
    .join("\n");

  const notesInstruction = notesDepth === "detailed"
    ? `"notes": "Analyse détaillée en 3-5 phrases : (1) constat factuel observé dans le HTML, (2) impact sur le référencement/visibilité IA, (3) recommandation concrète avec exemple de code/config si applicable"`
    : `"notes": "Explication concise en français (1-2 phrases)"`;

  const prompt = `Tu es un auditeur spécialisé en crédibilité et autorité de domaine. Analyse cette page web et évalue chaque critère CITE ci-dessous.

URL: ${url}

HTML de la page (tronqué si nécessaire):
\`\`\`html
${truncatedHtml}
\`\`\`

Critères à évaluer (dimension ${dimensionLabels[dimension]} — ${dimension}):
${itemsList}

Pour CHAQUE critère, réponds en JSON avec un tableau d'objets:
[
  {
    "code": "CI-C01",
    "status": "pass" | "partial" | "fail",
    "score": 0-100,
    ${notesInstruction}
  }
]

Règles de scoring:
- "pass" = 75-100 : le critère est pleinement satisfait
- "partial" = 25-74 : le critère est partiellement satisfait
- "fail" = 0-24 : le critère n'est pas satisfait
- Sois factuel et précis. Base ton évaluation sur ce qui est observable dans le HTML et les signaux disponibles.

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ni après.`;

  const anthropic = createAnthropicClient();

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content[0];
  const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

  if (!text) {
    console.warn(`[scorer] Empty response for CITE dimension ${dimension} (model: ${model})`);
    return makeFallbackItems(items.map(i => ({ ...i, isGeoFirst: false })), "cite");
  }

  const parsed = safeParseJson(text);
  if (!parsed) {
    console.warn(`[scorer] Failed to parse JSON for CITE dimension ${dimension}`);
    return makeFallbackItems(items.map(i => ({ ...i, isGeoFirst: false })), "cite");
  }

  return items.map((item) => {
    const found = parsed.find((p: any) => p?.code === item.code);

    const score = typeof found?.score === "number"
      ? Math.min(100, Math.max(0, Math.round(found.score)))
      : typeof found?.score === "string"
        ? Math.min(100, Math.max(0, Math.round(parseFloat(found.score)) || 50))
        : 50;

    return {
      framework: "cite" as const,
      dimension: item.dimension,
      item_code: item.code,
      item_label: item.label,
      status: validateStatus(found?.status),
      score,
      notes: typeof found?.notes === "string" ? found.notes : null,
      is_geo_first: false,
      is_express_item: item.isExpress,
    };
  });
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

// --- Helpers ---

function makeFallbackItems(
  items: Array<{ code: string; label: string; dimension: string; isExpress: boolean; isGeoFirst: boolean }>,
  framework: "core_eeat" | "cite"
): Omit<AuditItem, "id" | "audit_id">[] {
  return items.map((item) => ({
    framework,
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
