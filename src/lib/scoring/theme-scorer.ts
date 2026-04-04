import Anthropic from "@anthropic-ai/sdk";
import type { AuditItem, ItemStatus, QualityLevel, Framework } from "@/types/audit";
import { PERF_ITEMS, PERF_PRE_AUDIT_ITEMS } from "./perf-items";
import { A11Y_ITEMS, A11Y_PRE_AUDIT_ITEMS } from "./a11y-items";
import { RGESN_ITEMS, RGESN_PRE_AUDIT_ITEMS } from "./rgesn-items";
import { TECH_ITEMS, TECH_PRE_AUDIT_ITEMS } from "./tech-items";
import { CONTENU_ITEMS, CONTENU_PRE_AUDIT_ITEMS } from "./contenu-items";
import { QUALITY_CONFIG } from "@/lib/constants";

/**
 * Generic theme scorer — scores items for perf, a11y, rgesn, tech, contenu.
 * Same pattern as CORE-EEAT/CITE scoring but for the 5 new themes.
 */

const VALID_STATUSES: ItemStatus[] = ["pass", "partial", "fail"];

interface ItemDef {
  code: string;
  label: string;
  dimension: string;
  description: string;
}

interface LlmScoredItem {
  code?: string;
  status?: string;
  score?: number | string;
  notes?: string;
}

function validateStatus(status: unknown): ItemStatus {
  if (typeof status === "string") {
    const lower = status.toLowerCase().trim();
    if (VALID_STATUSES.includes(lower as ItemStatus)) return lower as ItemStatus;
  }
  return "partial";
}

function safeParseJson(text: string): LlmScoredItem[] | null {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* fallthrough */ }

  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fallthrough */ }
  }

  const greedyMatch = text.match(/\[[\s\S]*\]/);
  if (greedyMatch && greedyMatch[0] !== jsonMatch?.[0]) {
    try {
      const parsed = JSON.parse(greedyMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fallthrough */ }
  }

  return null;
}

// ─── Item registry ───

const THEME_ITEMS: Record<string, { full: ItemDef[]; preAudit: ItemDef[] }> = {
  perf: { full: PERF_ITEMS, preAudit: PERF_PRE_AUDIT_ITEMS },
  a11y: { full: A11Y_ITEMS, preAudit: A11Y_PRE_AUDIT_ITEMS },
  rgesn: { full: RGESN_ITEMS, preAudit: RGESN_PRE_AUDIT_ITEMS },
  tech: { full: TECH_ITEMS, preAudit: TECH_PRE_AUDIT_ITEMS },
  contenu: { full: CONTENU_ITEMS, preAudit: CONTENU_PRE_AUDIT_ITEMS },
};

const THEME_PROMPTS: Record<string, string> = {
  perf: "Tu es un expert en performance web. Évalue les critères de performance suivants en analysant le HTML.",
  a11y: "Tu es un expert en accessibilité web (RGAA/WCAG). Évalue les critères d'accessibilité suivants en analysant le HTML.",
  rgesn: "Tu es un expert en éco-conception numérique (RGESN). Évalue les critères d'éco-conception suivants en analysant le HTML. Si un critère n'est pas auditable à distance, mets le statut 'partial' avec une note explicative.",
  tech: "Tu es un expert en audit technique web. Évalue les critères techniques suivants en analysant le HTML et les en-têtes HTTP.",
  contenu: "Tu es un expert en stratégie de contenu web. Évalue les critères de qualité de contenu suivants en analysant le HTML.",
};

// ─── Main scoring function ───

/**
 * Score all items for a given theme.
 * @param theme - "perf" | "a11y" | "rgesn" | "tech" | "contenu"
 * @param html - Scraped HTML
 * @param url - Audit URL
 * @param mode - "express" (pre_audit) or "full" (complet/ultra)
 * @param quality - LLM quality tier
 */
export async function scoreTheme(
  theme: string,
  html: string,
  url: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const registry = THEME_ITEMS[theme];
  if (!registry) throw new Error(`Unknown theme: ${theme}`);

  const items = mode === "express" ? registry.preAudit : registry.full;
  if (items.length === 0) return [];

  // Group by dimension for parallel scoring
  const byDimension = new Map<string, ItemDef[]>();
  for (const item of items) {
    const arr = byDimension.get(item.dimension) || [];
    arr.push(item);
    byDimension.set(item.dimension, arr);
  }

  const config = QUALITY_CONFIG[quality];
  const truncatedHtml = html.slice(0, config.htmlMaxChars);
  const notesDepth = config.notesDepth ?? "concise";

  // Score dimensions in batches of 3 to avoid overwhelming the API
  // (ultra + A11y = 12 dimensions; all 12 in parallel would timeout in 60s)
  const BATCH_SIZE = 3;
  const dimensionEntries = Array.from(byDimension.entries());
  const allItems: Omit<AuditItem, "id" | "audit_id">[] = [];
  let failed = 0;

  for (let i = 0; i < dimensionEntries.length; i += BATCH_SIZE) {
    const batch = dimensionEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(([dimension, dimItems]) =>
        scoreDimensionItems(
          theme,
          dimension,
          dimItems,
          truncatedHtml,
          url,
          config.scoringModel,
          config.maxTokensScoring,
          notesDepth
        )
      )
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      } else {
        failed++;
        console.error(`[theme-scorer][${theme}] Dimension failed:`, result.reason?.message);
      }
    }
  }

  if (failed > 0) {
    console.warn(`[theme-scorer][${theme}] ${failed}/${byDimension.size} dimensions failed`);
  }

  return allItems;
}

/**
 * Score a single dimension within a theme — for step-by-step API flow.
 */
export async function scoreThemeDimension(
  theme: string,
  dimension: string,
  html: string,
  url: string,
  mode: "express" | "full",
  quality: QualityLevel = "standard"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const registry = THEME_ITEMS[theme];
  if (!registry) throw new Error(`Unknown theme: ${theme}`);

  const items = mode === "express" ? registry.preAudit : registry.full;
  const dimItems = items.filter((i) => i.dimension === dimension);
  if (dimItems.length === 0) return [];

  const config = QUALITY_CONFIG[quality];
  const truncatedHtml = html.slice(0, config.htmlMaxChars);
  const notesDepth = config.notesDepth ?? "concise";

  return scoreDimensionItems(
    theme,
    dimension,
    dimItems,
    truncatedHtml,
    url,
    config.scoringModel,
    config.maxTokensScoring,
    notesDepth
  );
}

/**
 * Get all unique dimensions for a theme.
 */
export function getThemeDimensions(theme: string, mode: "express" | "full"): string[] {
  const registry = THEME_ITEMS[theme];
  if (!registry) return [];
  const items = mode === "express" ? registry.preAudit : registry.full;
  return [...new Set(items.map((i) => i.dimension))];
}

// ─── Internal ───

async function scoreDimensionItems(
  theme: string,
  dimension: string,
  items: ItemDef[],
  html: string,
  url: string,
  model: string,
  maxTokens: number,
  notesDepth: "concise" | "detailed" = "concise"
): Promise<Omit<AuditItem, "id" | "audit_id">[]> {
  const anthropic = new Anthropic();
  const systemPrompt = THEME_PROMPTS[theme] || "Tu es un auditeur web expert.";

  const criteriaList = items
    .map((i) => `- ${i.code}: ${i.label} — ${i.description}`)
    .join("\n");

  const notesInstruction = notesDepth === "detailed"
    ? `"notes": "Analyse détaillée en 3-5 phrases : (1) constat factuel observé dans le HTML, (2) impact sur le référencement/visibilité IA, (3) recommandation concrète avec exemple de code/config si applicable"`
    : `"notes": "explication courte"`;

  const prompt = `${systemPrompt}

URL analysée : ${url}

HTML (tronqué) :
${html}

Critères à évaluer (dimension "${dimension}") :
${criteriaList}

Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
[
  { "code": "${items[0].code}", "status": "pass"|"partial"|"fail", "score": 0-100, ${notesInstruction} }
]

Règles de scoring :
- pass (75-100) : critère respecté
- partial (25-74) : partiellement respecté
- fail (0-24) : non respecté ou absent
- Sois honnête, ne gonfle pas les scores.`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = safeParseJson(text);

  const framework = theme as Framework;
  const itemMap = new Map(items.map((i) => [i.code, i]));

  if (!parsed) {
    console.warn(`[theme-scorer][${theme}][${dimension}] JSON parse failed, using fallback`);
    return items.map((item) => ({
      framework,
      dimension,
      item_code: item.code,
      item_label: item.label,
      status: "partial" as const,
      score: 50,
      notes: "Évaluation automatique indisponible",
      is_geo_first: false,
      is_express_item: false,
    }));
  }

  return parsed
    .filter((r) => r.code && itemMap.has(r.code))
    .map((r) => {
      const def = itemMap.get(r.code!)!;
      const score = Math.round(Math.min(100, Math.max(0, Number(r.score) || 50)));
      return {
        framework,
        dimension,
        item_code: r.code!,
        item_label: def.label,
        status: validateStatus(r.status),
        score,
        notes: typeof r.notes === "string" ? r.notes : r.notes ? String(r.notes) : null,
        is_geo_first: false,
        is_express_item: false,
      };
    });
}
