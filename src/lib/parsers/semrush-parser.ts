// ============================================================
// Semrush CSV Parser — LEGACY (deprecated v2.1)
// ============================================================
// @deprecated Since v2.1 (2026-04-23), Semrush is replaced by AWT + GSC + GA4 + Moz + SimilarWeb + Seobility.
// Kept for backward compatibility with archived audits. New audits should use the Wizard Ultra (Phase 2C).
// ============================================================

export interface SemrushData {
  // Domain overview
  organic_traffic: number | null;
  organic_keywords: number | null;
  authority_score: number | null;
  backlinks_total: number | null;
  referring_domains: number | null;
  rank_ch: number | null;

  // Top keywords
  top_keywords: Array<{
    keyword: string;
    position: number;
    volume: number;
    url: string;
    type: "brand" | "organic";
  }>;

  // Competitors
  competitors: Array<{
    domain: string;
    rank: number | null;
    keywords: number | null;
    traffic: number | null;
    backlinks: number | null;
    authority_score: number | null;
  }>;

  // Site audit issues
  audit_issues: Array<{
    severity: "error" | "warning" | "notice";
    description: string;
    count: number;
  }>;
}

// ---------------------------------------------------------------------------
// Lightweight CSV helpers (no external library)
// ---------------------------------------------------------------------------

/** Detect delimiter: semicolon or comma */
function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

/** Split a CSV line respecting quoted fields */
function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
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

/** Parse a block of CSV text into rows of key-value objects */
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

/** Parse a numeric value, returning null when not parseable */
function num(val: string | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^\d.\-]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/** Find a header key in a row (case-insensitive, partial match) */
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
// CSV type detection based on headers
// ---------------------------------------------------------------------------

type CsvType = "organic_positions" | "backlinks" | "traffic" | "site_audit" | "competitors" | "gap" | "unknown";

function detectCsvType(headerLine: string): CsvType {
  const lower = headerLine.toLowerCase();
  if (lower.includes("position") && (lower.includes("keyword") || lower.includes("mot"))) return "organic_positions";
  if (lower.includes("backlink") || lower.includes("source url") || lower.includes("referring")) return "backlinks";
  if (lower.includes("authority score") && lower.includes("domain")) return "competitors";
  if (lower.includes("traffic") && lower.includes("domain")) return "competitors";
  if (lower.includes("organic traffic") || lower.includes("trafic")) return "traffic";
  if (lower.includes("severity") || lower.includes("issue") || lower.includes("audit")) return "site_audit";
  if (lower.includes("common keywords") || lower.includes("gap")) return "gap";
  return "unknown";
}

// ---------------------------------------------------------------------------
// Individual section parsers
// ---------------------------------------------------------------------------

function parseOrganicPositions(
  rows: Array<Record<string, string>>,
  data: SemrushData,
  brandDomain?: string
): void {
  for (const row of rows) {
    const keyword = findKey(row, "keyword", "mot-clé", "mot_cle", "query") || "";
    const position = num(findKey(row, "position", "pos", "rang"));
    const volume = num(findKey(row, "search volume", "volume", "vol"));
    const url = findKey(row, "url", "landing page", "page") || "";

    if (keyword && position !== null) {
      // Simple brand detection: keyword contains domain root or looks branded
      const domainRoot = brandDomain
        ? brandDomain.replace(/\.[^.]+$/, "").replace(/[^a-z0-9]/gi, "")
        : "";
      const isBrand =
        domainRoot.length > 2 &&
        keyword.toLowerCase().replace(/[^a-z0-9]/g, "").includes(domainRoot.toLowerCase());

      data.top_keywords.push({
        keyword,
        position: position,
        volume: volume ?? 0,
        url,
        type: isBrand ? "brand" : "organic",
      });
    }
  }

  // Also extract overview metrics from first row if available
  if (rows.length > 0) {
    const first = rows[0];
    if (!data.organic_keywords) {
      data.organic_keywords = rows.length; // number of keyword rows = keyword count
    }
  }
}

function parseBacklinks(
  rows: Array<Record<string, string>>,
  data: SemrushData
): void {
  // Backlink exports typically list individual links — count them
  if (!data.backlinks_total) {
    data.backlinks_total = rows.length;
  }

  // Count unique referring domains
  const domains = new Set<string>();
  for (const row of rows) {
    const source = findKey(row, "source url", "source", "referring url", "from url") || "";
    try {
      const domain = new URL(source.startsWith("http") ? source : `https://${source}`).hostname;
      domains.add(domain);
    } catch {
      // skip
    }
  }
  if (domains.size > 0 && !data.referring_domains) {
    data.referring_domains = domains.size;
  }
}

function parseCompetitors(
  rows: Array<Record<string, string>>,
  data: SemrushData
): void {
  for (const row of rows) {
    const domain = findKey(row, "domain", "competitor", "site", "url") || "";
    if (!domain) continue;

    data.competitors.push({
      domain,
      rank: num(findKey(row, "rank", "rang", "rank_ch", "position")),
      keywords: num(findKey(row, "keywords", "mots-clés", "organic keywords", "mots_cles")),
      traffic: num(findKey(row, "traffic", "trafic", "organic traffic", "visits")),
      backlinks: num(findKey(row, "backlinks", "liens", "total backlinks")),
      authority_score: num(findKey(row, "authority score", "as", "score")),
    });
  }

  // Extract domain overview from the first row if it's our domain
  if (rows.length > 0) {
    const first = rows[0];
    const traffic = num(findKey(first, "traffic", "trafic", "organic traffic"));
    const keywords = num(findKey(first, "keywords", "mots-clés", "organic keywords"));
    const as_score = num(findKey(first, "authority score", "as"));
    const backlinks = num(findKey(first, "backlinks", "liens"));
    const rank = num(findKey(first, "rank", "rang", "rank_ch"));

    if (traffic !== null && !data.organic_traffic) data.organic_traffic = traffic;
    if (keywords !== null && !data.organic_keywords) data.organic_keywords = keywords;
    if (as_score !== null && !data.authority_score) data.authority_score = as_score;
    if (backlinks !== null && !data.backlinks_total) data.backlinks_total = backlinks;
    if (rank !== null && !data.rank_ch) data.rank_ch = rank;
  }
}

function parseSiteAudit(
  rows: Array<Record<string, string>>,
  data: SemrushData
): void {
  for (const row of rows) {
    const description =
      findKey(row, "issue", "description", "problème", "check", "name") || "";
    const severityRaw = (
      findKey(row, "severity", "type", "level", "priorité", "priority") || "notice"
    ).toLowerCase();
    const count = num(findKey(row, "count", "pages", "occurrences", "nombre")) ?? 1;

    let severity: "error" | "warning" | "notice" = "notice";
    if (severityRaw.includes("err") || severityRaw.includes("critical") || severityRaw.includes("high")) {
      severity = "error";
    } else if (severityRaw.includes("warn") || severityRaw.includes("medium") || severityRaw.includes("moy")) {
      severity = "warning";
    }

    if (description) {
      data.audit_issues.push({ severity, description, count });
    }
  }
}

function parseTrafficOverview(
  rows: Array<Record<string, string>>,
  data: SemrushData
): void {
  if (rows.length === 0) return;
  // Traffic overview typically has one row or time-series; use the last row
  const row = rows[rows.length - 1];
  if (!data.organic_traffic) {
    data.organic_traffic = num(findKey(row, "organic traffic", "traffic", "trafic", "visits"));
  }
  if (!data.organic_keywords) {
    data.organic_keywords = num(findKey(row, "keywords", "mots-clés", "organic keywords"));
  }
  if (!data.authority_score) {
    data.authority_score = num(findKey(row, "authority score", "as"));
  }
  if (!data.rank_ch) {
    data.rank_ch = num(findKey(row, "rank", "rang", "rank_ch"));
  }
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse one or more Semrush CSV exports into a unified SemrushData structure.
 * Supports multiple CSVs concatenated (separated by blank lines) or a single CSV.
 */
export function parseSemrushCsv(csvContent: string): SemrushData {
  const data: SemrushData = {
    organic_traffic: null,
    organic_keywords: null,
    authority_score: null,
    backlinks_total: null,
    referring_domains: null,
    rank_ch: null,
    top_keywords: [],
    competitors: [],
    audit_issues: [],
  };

  // Strip BOM
  const content = csvContent.replace(/^\uFEFF/, "");

  // Split into blocks separated by 2+ blank lines (multiple CSVs concatenated)
  const blocks = content
    .split(/\n\s*\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  // If no multi-block split found, treat entire content as one block
  const csvBlocks = blocks.length > 0 ? blocks : [content];

  for (const block of csvBlocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 1) continue;

    const headerLine = lines[0];
    const csvType = detectCsvType(headerLine);
    const rows = parseCsvBlock(block);

    switch (csvType) {
      case "organic_positions":
        parseOrganicPositions(rows, data);
        break;
      case "backlinks":
        parseBacklinks(rows, data);
        break;
      case "competitors":
        parseCompetitors(rows, data);
        break;
      case "site_audit":
        parseSiteAudit(rows, data);
        break;
      case "traffic":
        parseTrafficOverview(rows, data);
        break;
      case "gap":
        // Gap analysis can contribute to competitors
        parseCompetitors(rows, data);
        break;
      case "unknown":
        // Try to extract any overview metrics we can
        if (rows.length > 0) {
          parseTrafficOverview(rows, data);
        }
        break;
    }
  }

  return data;
}
