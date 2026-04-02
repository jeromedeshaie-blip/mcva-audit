// ============================================================
// Qwairy CSV Parser — Parse exported CSV data into structured format
// ============================================================

export interface QwairyData {
  // Global KPIs
  mention_rate: number; // percentage
  source_rate: number; // percentage
  share_of_voice: number; // percentage
  sentiment_score: number; // 0-100

  // Per-LLM breakdown
  llm_results: Array<{
    provider: string; // "ChatGPT" | "Gemini" | "Copilot" | "Perplexity" | "Grok"
    mention_rate: number;
    source_rate: number;
    sentiment: number;
    rank: number | null;
  }>;

  // Prompts analyzed
  total_prompts: number;
  total_responses: number;

  // Competitor SOV
  competitor_sov: Array<{
    brand: string;
    sov: number;
    mention_count: number;
  }>;

  // Topics
  topics: Array<{
    topic: string;
    funnel: "TOFU" | "MOFU" | "BOFU";
    mention_rate: number;
    source_rate: number;
  }>;
}

// ---------------------------------------------------------------------------
// Lightweight CSV helpers
// ---------------------------------------------------------------------------

function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsvBlock(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/['"]/g, "").trim()
  );

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function num(val: string | undefined): number | null {
  if (!val) return null;
  // Handle European format: "8,33%" -> "8.33"
  const cleaned = val
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function findKey(row: Record<string, string>, ...candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    const found = keys.find(
      (k) => k === lower || k.includes(lower) || lower.includes(k)
    );
    if (found && row[found] !== undefined) return row[found];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// CSV type detection
// ---------------------------------------------------------------------------

type QwairyCsvType = "llm_breakdown" | "competitors" | "topics" | "prompts" | "overview" | "unknown";

function detectQwairyCsvType(headerLine: string): QwairyCsvType {
  const lower = headerLine.toLowerCase();
  if (lower.includes("provider") || lower.includes("llm") || lower.includes("model")) {
    return "llm_breakdown";
  }
  if (lower.includes("brand") || lower.includes("competitor") || lower.includes("share of voice") || lower.includes("sov")) {
    return "competitors";
  }
  if (lower.includes("topic") || lower.includes("funnel") || lower.includes("tofu") || lower.includes("mofu")) {
    return "topics";
  }
  if (lower.includes("prompt") || lower.includes("question") || lower.includes("response")) {
    return "prompts";
  }
  if (lower.includes("mention") || lower.includes("source") || lower.includes("sentiment")) {
    return "overview";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/** Normalize LLM provider name to canonical form */
function normalizeProvider(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("chatgpt") || lower.includes("openai") || lower === "gpt") return "ChatGPT";
  if (lower.includes("gemini") || lower.includes("google")) return "Gemini";
  if (lower.includes("copilot") || lower.includes("microsoft") || lower.includes("bing")) return "Copilot";
  if (lower.includes("perplexity")) return "Perplexity";
  if (lower.includes("grok") || lower.includes("xai")) return "Grok";
  if (lower.includes("claude") || lower.includes("anthropic")) return "Claude";
  // Return cleaned original if unknown
  return raw.trim();
}

/** Map funnel stage labels */
function normalizeFunnel(raw: string): "TOFU" | "MOFU" | "BOFU" {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("top") || lower.includes("tofu") || lower.includes("awareness") || lower.includes("découverte")) return "TOFU";
  if (lower.includes("mid") || lower.includes("mofu") || lower.includes("consider") || lower.includes("évaluation")) return "MOFU";
  if (lower.includes("bot") || lower.includes("bofu") || lower.includes("decision") || lower.includes("décision") || lower.includes("conversion")) return "BOFU";
  return "TOFU"; // default
}

// ---------------------------------------------------------------------------
// Section parsers
// ---------------------------------------------------------------------------

function parseLlmBreakdown(
  rows: Array<Record<string, string>>,
  data: QwairyData
): void {
  for (const row of rows) {
    const provider = findKey(row, "provider", "llm", "model", "ai", "engine") || "";
    if (!provider) continue;

    const mentionRate = num(findKey(row, "mention rate", "mention_rate", "mention", "taux mention")) ?? 0;
    const sourceRate = num(findKey(row, "source rate", "source_rate", "source", "taux source")) ?? 0;
    const sentiment = num(findKey(row, "sentiment", "score", "sentiment_score")) ?? 0;
    const rank = num(findKey(row, "rank", "rang", "position", "average rank"));

    data.llm_results.push({
      provider: normalizeProvider(provider),
      mention_rate: mentionRate,
      source_rate: sourceRate,
      sentiment,
      rank,
    });
  }

  // Compute global averages from LLM breakdown if we have data
  if (data.llm_results.length > 0) {
    const count = data.llm_results.length;
    const avgMention = data.llm_results.reduce((s, r) => s + r.mention_rate, 0) / count;
    const avgSource = data.llm_results.reduce((s, r) => s + r.source_rate, 0) / count;
    const withSentiment = data.llm_results.filter((r) => r.sentiment > 0);
    const avgSentiment =
      withSentiment.length > 0
        ? withSentiment.reduce((s, r) => s + r.sentiment, 0) / withSentiment.length
        : 0;

    // Only override if not already set from overview
    if (data.mention_rate === 0) data.mention_rate = Math.round(avgMention * 100) / 100;
    if (data.source_rate === 0) data.source_rate = Math.round(avgSource * 100) / 100;
    if (data.sentiment_score === 0) data.sentiment_score = Math.round(avgSentiment);
  }
}

function parseCompetitorSov(
  rows: Array<Record<string, string>>,
  data: QwairyData
): void {
  for (const row of rows) {
    const brand = findKey(row, "brand", "competitor", "marque", "name", "nom", "cabinet", "entreprise") || "";
    if (!brand) continue;

    const sov = num(findKey(row, "share of voice", "sov", "coverage", "part de voix")) ?? 0;
    const mentions = num(findKey(row, "mentions", "mention_count", "count", "nombre")) ?? 0;

    data.competitor_sov.push({ brand, sov, mention_count: mentions });
  }

  // Derive share_of_voice for our brand (first entry or look for it)
  // The caller can use this data to identify the client's SOV
}

function parseTopics(
  rows: Array<Record<string, string>>,
  data: QwairyData
): void {
  for (const row of rows) {
    const topic = findKey(row, "topic", "sujet", "query", "prompt", "theme", "thème") || "";
    if (!topic) continue;

    const funnelRaw = findKey(row, "funnel", "stage", "étape", "phase") || "TOFU";
    const mentionRate = num(findKey(row, "mention rate", "mention_rate", "mention", "taux mention")) ?? 0;
    const sourceRate = num(findKey(row, "source rate", "source_rate", "source", "taux source")) ?? 0;

    data.topics.push({
      topic,
      funnel: normalizeFunnel(funnelRaw),
      mention_rate: mentionRate,
      source_rate: sourceRate,
    });
  }
}

function parsePrompts(
  rows: Array<Record<string, string>>,
  data: QwairyData
): void {
  // Prompt-level data: count unique prompts and total responses
  const promptSet = new Set<string>();
  let totalResponses = 0;

  for (const row of rows) {
    const prompt = findKey(row, "prompt", "question", "query", "requête") || "";
    if (prompt) promptSet.add(prompt);
    totalResponses++;
  }

  if (promptSet.size > 0) data.total_prompts = promptSet.size;
  if (totalResponses > 0) data.total_responses = totalResponses;
}

function parseOverview(
  rows: Array<Record<string, string>>,
  data: QwairyData
): void {
  if (rows.length === 0) return;
  // Overview CSV may have a single row or metric rows
  const row = rows[0];

  const mentionRate = num(findKey(row, "mention rate", "mention_rate", "mention", "taux mention"));
  const sourceRate = num(findKey(row, "source rate", "source_rate", "source", "taux source"));
  const sov = num(findKey(row, "share of voice", "sov", "part de voix"));
  const sentiment = num(findKey(row, "sentiment", "sentiment_score", "score"));
  const prompts = num(findKey(row, "prompts", "total_prompts", "nombre prompts"));
  const responses = num(findKey(row, "responses", "total_responses", "réponses"));

  if (mentionRate !== null) data.mention_rate = mentionRate;
  if (sourceRate !== null) data.source_rate = sourceRate;
  if (sov !== null) data.share_of_voice = sov;
  if (sentiment !== null) data.sentiment_score = sentiment;
  if (prompts !== null) data.total_prompts = prompts;
  if (responses !== null) data.total_responses = responses;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse one or more Qwairy CSV exports into a unified QwairyData structure.
 * Supports multiple CSVs concatenated (separated by blank lines) or a single CSV.
 */
export function parseQwairyCsv(csvContent: string): QwairyData {
  const data: QwairyData = {
    mention_rate: 0,
    source_rate: 0,
    share_of_voice: 0,
    sentiment_score: 0,
    llm_results: [],
    total_prompts: 0,
    total_responses: 0,
    competitor_sov: [],
    topics: [],
  };

  // Strip BOM
  const content = csvContent.replace(/^\uFEFF/, "");

  // Split into blocks separated by 2+ blank lines
  const blocks = content
    .split(/\n\s*\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const csvBlocks = blocks.length > 0 ? blocks : [content];

  for (const block of csvBlocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 1) continue;

    const headerLine = lines[0];
    const csvType = detectQwairyCsvType(headerLine);
    const rows = parseCsvBlock(block);

    switch (csvType) {
      case "llm_breakdown":
        parseLlmBreakdown(rows, data);
        break;
      case "competitors":
        parseCompetitorSov(rows, data);
        break;
      case "topics":
        parseTopics(rows, data);
        break;
      case "prompts":
        parsePrompts(rows, data);
        break;
      case "overview":
        parseOverview(rows, data);
        break;
      case "unknown":
        // Attempt overview parse as fallback
        if (rows.length > 0) {
          parseOverview(rows, data);
        }
        break;
    }
  }

  return data;
}
