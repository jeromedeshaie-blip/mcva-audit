/**
 * Ultra Audit PDF Template Renderer — v3.2 Section-Based Architecture
 * Produces a ~25-page HTML document with section-based rendering.
 * Covers: Cover, TOC, Synthèse, Radar, SEO, GEO, Perf, A11Y, Tech, Contenu,
 *         RGESN, Benchmark, Action Plan (multi-page), Methodology, Closing.
 */
import { PDF_STYLES } from "./styles";
import type {
  Audit,
  AuditScores,
  AuditItem,
  AuditAction,
  AuditTheme,
} from "@/types/audit";
import { THEME_LABELS, GLOBAL_SCORE_WEIGHTS } from "@/types/audit";
import type { PdfRenderData } from "./render";

// ─── Section gradient mapping (v3.2) ───

const SECTION_GRADIENTS: Record<string, string> = {
  synthese: "var(--grad-abyss)",
  radar: "var(--grad-abyss)",
  seo: "var(--grad-ember)",
  geo: "var(--grad-ember)",
  perf: "var(--grad-drift)",
  a11y: "var(--grad-drift)",
  tech: "var(--grad-drift)",
  contenu: "var(--grad-drift)",
  rgesn: "var(--grad-drift)",
  benchmark: "var(--grad-flare)",
  "action-plan": "var(--grad-flare)",
};

// ─── Extra CSS (v3.2 font stack) ───

const ULTRA_EXTRA_STYLES = `
  .cover-top-bar { height: 4px; background: var(--red); width: 100%; }
  .cover-content { padding: 50mm 28mm 0 28mm; flex: 1; }
  .cover-footer-text { font-size: 8pt; color: var(--gray-400); line-height: 1.6; }
  .cover-ref { font-family: 'DM Mono', 'Courier New', monospace; font-size: 8pt; color: var(--gray-400); }

  .page-inner { padding: 18mm 22mm 20mm 22mm; }

  .lead { font-size: 10pt; font-weight: 400; color: var(--gray-800); line-height: 1.65; }

  .text-red { color: var(--red); }
  .text-green { color: var(--green); }
  .text-orange { color: var(--orange); }
  .text-crit { color: var(--crit-red); }
  .text-muted { color: var(--gray-600); font-size: 8pt; }
  .text-mono { font-family: 'DM Mono', 'Courier New', monospace; font-size: 8.5pt; }

  .stars { color: var(--red); letter-spacing: -1px; }

  .bullet-list { list-style: none; padding: 0; margin: 2mm 0; }
  .bullet-list li { padding: 1.5mm 0 1.5mm 5mm; position: relative; font-size: 9pt; }
  .bullet-list li::before {
    content: ''; position: absolute; left: 0; top: 4.5mm;
    width: 5px; height: 5px; background: var(--red); border-radius: 50%;
  }

  .tbl-compact td, .tbl-compact th { padding: 2mm 2.5mm; font-size: 7.5pt; }

  .section-num {
    font-size: 42pt; font-weight: 800; color: var(--red);
    opacity: 0.6; line-height: 1; margin-bottom: 2mm;
  }
  .section-sub {
    font-family: 'DM Mono', 'Courier New', monospace; font-size: 8pt; color: var(--beige);
    margin-top: 2mm; opacity: 0.7; letter-spacing: 0.03em;
  }

  .score-badge .num {
    font-family: 'General Sans', 'Helvetica Neue', sans-serif; font-size: 22pt; font-weight: 800;
    line-height: 1; margin-bottom: 1mm;
  }
  .score-badge .lbl {
    font-family: 'DM Mono', 'Courier New', monospace; font-size: 6.5pt;
    color: var(--gray-600); letter-spacing: 0.03em;
  }
  .score-red .num { color: var(--crit-red); }
  .score-orange .num { color: var(--orange); }
  .score-green .num { color: var(--green); }

  .phase-header-dark { background: var(--black); }

  /* Override cover for golden template structure */
  .page.cover {
    background: var(--grad-abyss);
    display: flex; flex-direction: column; justify-content: space-between; padding: 0;
    width: 210mm; overflow: hidden; page-break-after: always; position: relative;
  }
  .page.cover .cover-footer {
    padding: 12mm 28mm; border-top: 1px solid rgba(255,255,255,0.08);
    position: static; display: block;
  }

  p { margin-bottom: 2.5mm; text-align: justify; hyphens: auto; }
  h3 { color: var(--red); }

  /* TOC styles */
  .toc-item {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 2mm 0; border-bottom: 1px dotted var(--gray-200);
    font-size: 9.5pt;
  }
  .toc-item-num { color: var(--red); font-weight: 700; min-width: 8mm; }
  .toc-item-label { flex: 1; }
  .toc-item-page { font-family: 'DM Mono', 'Courier New', monospace; color: var(--gray-400); font-size: 8pt; }

  /* Radar chart container */
  .radar-container { text-align: center; margin: 4mm 0; }
  .radar-container svg { max-width: 250px; }

  /* Global score hero */
  .global-score-hero {
    text-align: center; padding: 6mm; margin: 4mm 0;
    background: var(--black); border-radius: 4px; color: var(--cream);
  }
  .global-score-hero .score-value {
    font-family: 'General Sans', 'Helvetica Neue', sans-serif;
    font-size: 36pt; font-weight: 900; color: var(--white);
  }

  /* Theme section intro */
  .theme-intro { margin: 3mm 0; font-size: 9.5pt; line-height: 1.6; }

  /* Mini action table */
  .mini-action-table td { font-size: 7.5pt; padding: 1.5mm 2mm; }
  .mini-action-table th { font-size: 7pt; padding: 1.5mm 2mm; }

  /* Methodology styles */
  .method-grid { display: flex; flex-wrap: wrap; gap: 3mm; margin: 3mm 0; }
  .method-card {
    flex: 1 1 45%; padding: 3mm; border: 1px solid var(--gray-200);
    border-radius: 3px; font-size: 8pt; page-break-inside: avoid;
  }
  .method-card h4 { font-size: 8.5pt; color: var(--red); margin-bottom: 1mm; }

  /* Score scale */
  .score-scale { display: flex; gap: 2mm; margin: 3mm 0; }
  .score-scale-item { flex: 1; text-align: center; padding: 2mm; border-radius: 3px; font-size: 7.5pt; font-weight: 600; }
`;

// ─── Types ───

export interface SemrushData {
  rank_ch?: number;
  mots_cles?: number;
  trafic?: number;
  authority_score?: number;
  backlinks?: number;
  top_keywords?: {
    keyword: string;
    position: number;
    volume: number;
    status?: string;
  }[];
  competitors?: {
    site: string;
    rank?: number;
    mots_cles?: number;
    trafic?: number;
    backlinks?: number;
    authority?: number;
  }[];
}

export interface QwairyData {
  mention_rate?: number;
  source_rate?: number;
  sov?: number;
  sentiment?: number;
  prompts?: number;
  responses?: number;
  llms?: number;
  llm_distribution?: {
    provider: string;
    mention_rate: number;
    source_rate: number;
    sov: number;
    sentiment: number;
  }[];
  sov_competitors?: {
    name: string;
    mentions: number;
    coverage: number;
    sov: number;
    position_avg: number;
    llms: string;
  }[];
  sentiment_benchmark?: {
    name: string;
    sentiment: number;
    rank: number;
  }[];
  sentiment_insight?: string;
}

export interface UltraAuditData extends PdfRenderData {
  /** Per-theme scores */
  themeScores: Record<AuditTheme, number>;
  /** Optional client context */
  clientContext?: {
    clientName?: string;
    objective?: string;
    scope?: string;
    sector?: string;
  };
  /** Optional Semrush data */
  semrushData?: SemrushData;
  /** Optional Qwairy data */
  qwairyData?: QwairyData;
}

// ─── Section-based architecture ───

interface PdfSection {
  id: string;
  render: (data: UltraAuditData) => string;
}

const ULTRA_SECTIONS: PdfSection[] = [
  { id: "cover", render: renderCover },
  { id: "toc", render: renderTableOfContents },
  { id: "synthese", render: renderSynthese },
  { id: "radar", render: renderRadarPage },
  { id: "seo", render: renderSeoSection },
  { id: "geo", render: renderGeoSection },
  { id: "perf", render: renderPerfSection },
  { id: "a11y", render: renderA11ySection },
  { id: "tech", render: renderTechSection },
  { id: "contenu", render: renderContenuSection },
  { id: "rgesn", render: renderRgesnSection },
  { id: "benchmark", render: renderBenchmarkSection },
  { id: "action-plan", render: renderActionPlanSection },
  { id: "methodology", render: renderMethodology },
  { id: "closing", render: renderClosing },
];

// ─── Helpers ───

function scoreColorClass(score: number): string {
  if (score >= 75) return "score-green";
  if (score >= 50) return "score-orange";
  return "score-red";
}

function findingSeverity(score: number): string {
  if (score < 25) return "finding-crit";
  if (score < 50) return "finding-warn";
  if (score < 75) return "finding-info";
  return "finding-ok";
}

function findingLabel(score: number): string {
  if (score < 25) return "Critique";
  if (score < 50) return "Avertissement";
  if (score < 75) return "Information";
  return "OK";
}

function scoreLabel(score: number): string {
  if (score >= 75) return "Bon";
  if (score >= 50) return "Moyen";
  if (score >= 25) return "Faible";
  return "Critique";
}

function statusIcon(status: string): string {
  if (status === "pass") return "\u2713";
  if (status === "partial") return "~";
  return "\u2717";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stars(n: number): string {
  return '<span class="stars">' + "\u2605".repeat(n) + "</span>";
}

function padSection(n: number): string {
  return String(n).padStart(2, "0");
}

function impactStars(points: number): string {
  if (points >= 8) return stars(5);
  if (points >= 6) return stars(4);
  if (points >= 4) return stars(3);
  if (points >= 2) return stars(2);
  return stars(1);
}

const THEME_ORDER: AuditTheme[] = [
  "seo",
  "geo",
  "perf",
  "a11y",
  "tech",
  "contenu",
  "rgesn",
];

const SHORT_LABELS: Record<AuditTheme, string> = {
  seo: "SEO",
  geo: "Score GEO\u2122",
  perf: "Performance",
  a11y: "Accessibilit\u00e9",
  rgesn: "\u00c9co-conception",
  tech: "Technique",
  contenu: "Contenu",
};

const FRAMEWORK_MAP: Record<string, AuditTheme> = {
  core_eeat: "seo",
  cite: "geo",
  perf: "perf",
  a11y: "a11y",
  rgesn: "rgesn",
  tech: "tech",
  contenu: "contenu",
};

const THEME_FRAMEWORK: Record<AuditTheme, string> = {
  seo: "core_eeat",
  geo: "cite",
  perf: "perf",
  a11y: "a11y",
  rgesn: "rgesn",
  tech: "tech",
  contenu: "contenu",
};

const PRIORITY_LABELS: Record<string, string> = {
  P1: "CRITIQUE",
  P2: "IMPORTANT",
  P3: "RECOMMAND\u00c9",
  P4: "OPTIMISATION",
};

const CATEGORY_LABELS: Record<string, string> = {
  technique: "Technique",
  contenu: "Contenu",
  GEO: "GEO / IA",
  notoriete: "Notori\u00e9t\u00e9",
  SEO: "SEO",
};

// Section labels for TOC
const SECTION_TOC_LABELS: Record<string, string> = {
  cover: "Couverture",
  toc: "Table des mati\u00e8res",
  synthese: "Synth\u00e8se ex\u00e9cutive",
  radar: "Radar des scores & Score global",
  seo: "Audit SEO \u2014 R\u00e9f\u00e9rencement naturel",
  geo: "Audit GEO \u2014 Score GEO\u2122",
  perf: "Performance \u2014 Core Web Vitals",
  a11y: "Accessibilit\u00e9 \u2014 WCAG 2.1 AA",
  tech: "Technique \u2014 Infrastructure",
  contenu: "Contenu \u2014 Qualit\u00e9 \u00e9ditoriale",
  rgesn: "\u00c9co-conception \u2014 RGESN",
  benchmark: "Benchmark concurrentiel",
  "action-plan": "Plan d\u2019action \u2014 3 phases",
  methodology: "M\u00e9thodologie",
  closing: "Conclusion",
};

// ─── Global score ───

function computeGlobalScore(themeScores: Record<AuditTheme, number>): number {
  let total = 0;
  let weightSum = 0;
  for (const theme of Object.keys(GLOBAL_SCORE_WEIGHTS) as AuditTheme[]) {
    const score = themeScores[theme] ?? 0;
    const weight = GLOBAL_SCORE_WEIGHTS[theme];
    total += score * weight;
    weightSum += weight;
  }
  return Math.round(weightSum > 0 ? total / weightSum : 0);
}

// ─── Key findings extraction ───

interface DimensionScore {
  theme: AuditTheme;
  dimension: string;
  avgScore: number;
  itemCount: number;
  worstItem?: AuditItem;
}

function extractKeyFindings(
  items: AuditItem[],
  count: number = 3
): DimensionScore[] {
  const dimMap = new Map<
    string,
    { scores: number[]; theme: AuditTheme; items: AuditItem[] }
  >();

  for (const item of items) {
    const key = `${item.framework}::${item.dimension}`;
    if (!dimMap.has(key)) {
      const theme = FRAMEWORK_MAP[item.framework] ?? "seo";
      dimMap.set(key, { scores: [], theme, items: [] });
    }
    const entry = dimMap.get(key)!;
    entry.scores.push(item.score);
    entry.items.push(item);
  }

  const dimensions: DimensionScore[] = [];
  for (const [key, data] of dimMap) {
    const dimension = key.split("::")[1];
    const avg =
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const worst = data.items.sort((a, b) => a.score - b.score)[0];
    dimensions.push({
      theme: data.theme,
      dimension,
      avgScore: Math.round(avg),
      itemCount: data.scores.length,
      worstItem: worst,
    });
  }

  return dimensions.sort((a, b) => a.avgScore - b.avgScore).slice(0, count);
}

// ─── Items helpers ───

function itemsByTheme(items: AuditItem[], theme: AuditTheme): AuditItem[] {
  return items.filter((i) => i.framework === THEME_FRAMEWORK[theme]);
}

function groupByDimension(items: AuditItem[]): Map<string, AuditItem[]> {
  const map = new Map<string, AuditItem[]>();
  for (const item of items) {
    const dim = item.dimension || "Autre";
    if (!map.has(dim)) map.set(dim, []);
    map.get(dim)!.push(item);
  }
  return map;
}

function renderFindingsFromItems(items: AuditItem[], limit: number = 6): string {
  const sorted = [...items].sort((a, b) => a.score - b.score);
  return sorted
    .slice(0, limit)
    .map(
      (item) =>
        `<div class="finding ${findingSeverity(item.score)}">
          <span class="finding-tag">${esc(findingLabel(item.score))} \u2014 ${esc(item.item_code)}</span>
          <strong>${esc(item.item_label)}</strong>${item.notes ? `<br><span style="font-size:8pt;color:var(--gray-600);">${esc(item.notes)}</span>` : ""}
        </div>`
    )
    .join("");
}

function renderItemsTable(items: AuditItem[]): string {
  if (items.length === 0) return "";
  return `<table class="tbl-compact">
    <thead><tr><th>Code</th><th>Crit\u00e8re</th><th style="text-align:center">Statut</th><th style="text-align:right">Score</th></tr></thead>
    <tbody>
      ${items
        .map(
          (item) =>
            `<tr>
            <td class="text-mono text-muted">${esc(item.item_code)}</td>
            <td>${esc(item.item_label)}</td>
            <td style="text-align:center" class="${scoreColorClass(item.score)}">${statusIcon(item.status)}</td>
            <td style="text-align:right" class="${scoreColorClass(item.score)}"><strong>${item.score}</strong></td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

function renderMiniActionTable(actions: AuditAction[]): string {
  if (actions.length === 0) return "";
  return `<table class="mini-action-table tbl-compact">
    <thead><tr><th>#</th><th>Action</th><th>Priorit\u00e9</th><th>Impact</th><th>Effort</th></tr></thead>
    <tbody>
      ${actions.slice(0, 8).map((a, i) =>
        `<tr>
          <td class="text-mono">${i + 1}</td>
          <td>${esc(a.title)}</td>
          <td><strong>${esc(a.priority)}</strong></td>
          <td>${impactStars(a.impact_points)}</td>
          <td>${esc(a.effort)}</td>
        </tr>`
      ).join("")}
    </tbody>
  </table>`;
}

function renderDetailedPhaseTable(actions: AuditAction[]): string {
  if (actions.length === 0) return "";
  return `<table class="tbl-compact">
    <thead><tr><th>#</th><th>Action</th><th>Th\u00e8me</th><th>Impact</th><th>Effort</th><th>KPI</th></tr></thead>
    <tbody>
      ${actions.map((a, i) =>
        `<tr>
          <td class="text-mono">${i + 1}</td>
          <td>${esc(a.title)}</td>
          <td>${esc(a.theme ?? CATEGORY_LABELS[a.category] ?? a.category)}</td>
          <td>${impactStars(a.impact_points)}</td>
          <td>${esc(a.effort)}</td>
          <td class="text-muted">${esc(a.kpi ?? "\u2014")}</td>
        </tr>`
      ).join("")}
    </tbody>
  </table>`;
}

function generateThemeIntro(theme: AuditTheme, score: number, items: AuditItem[]): string {
  const total = items.length;
  const pass = items.filter((i) => i.status === "pass").length;
  const fail = items.filter((i) => i.status === "fail").length;
  const partial = items.filter((i) => i.status === "partial").length;
  const level = scoreLabel(score);

  const themeDescriptions: Record<AuditTheme, string> = {
    seo: "Le r\u00e9f\u00e9rencement naturel est \u00e9valu\u00e9 via le framework CORE-EEAT (Content, Outreach, Reputation, Experience, Expertise, Authority, Trust).",
    geo: "Le Score GEO\u2122 mesure la citabilit\u00e9 de votre marque par les IA g\u00e9n\u00e9ratives (ChatGPT, Gemini, Perplexity, Claude) via le framework CITE.",
    perf: "La performance est mesur\u00e9e via les Core Web Vitals (LCP, CLS, INP, TTFB), indicateurs cl\u00e9s pour l\u2019exp\u00e9rience utilisateur et le classement Google.",
    a11y: "L\u2019accessibilit\u00e9 est \u00e9valu\u00e9e selon les normes WCAG 2.1 niveau AA et les crit\u00e8res RGAA pour garantir l\u2019acc\u00e8s universel.",
    tech: "L\u2019infrastructure technique couvre le stack, l\u2019h\u00e9bergement, la s\u00e9curit\u00e9, le crawlabilit\u00e9 et la conformit\u00e9 des configurations.",
    contenu: "La qualit\u00e9 \u00e9ditoriale est \u00e9valu\u00e9e selon la structure, la profondeur, l\u2019E-E-A-T des contenus et la coh\u00e9rence s\u00e9mantique.",
    rgesn: "L\u2019\u00e9co-conception est \u00e9valu\u00e9e selon le R\u00e9f\u00e9rentiel G\u00e9n\u00e9ral d\u2019\u00c9coconception des Services Num\u00e9riques (RGESN).",
  };

  return `<div class="theme-intro">
    <p>${themeDescriptions[theme]}</p>
    <p>Score obtenu : <strong class="${scoreColorClass(score)}">${score}/100 (${level})</strong>.
    Sur ${total} crit\u00e8re(s) \u00e9valu\u00e9(s) : ${pass} conforme(s), ${partial} partiel(s), ${fail} non conforme(s).</p>
  </div>`;
}

function validateDataCompleteness(data: UltraAuditData): string[] {
  const warnings: string[] = [];
  if (!data.audit) warnings.push("Donn\u00e9es d\u2019audit manquantes");
  if (!data.items || data.items.length === 0) warnings.push("Aucun crit\u00e8re d\u2019audit trouv\u00e9");
  if (!data.actions || data.actions.length === 0) warnings.push("Aucune action d\u2019am\u00e9lioration g\u00e9n\u00e9r\u00e9e");
  if (!data.themeScores) warnings.push("Scores par th\u00e8me manquants");
  for (const theme of THEME_ORDER) {
    if (data.themeScores && (data.themeScores[theme] === undefined || data.themeScores[theme] === null)) {
      warnings.push(`Score manquant pour ${SHORT_LABELS[theme]}`);
    }
  }
  return warnings;
}

// ─── SVG Radar Chart ───

function generateRadarSvg(themeScores: Record<AuditTheme, number>): string {
  const themes = THEME_ORDER;
  const count = themes.length;
  const cx = 125;
  const cy = 125;
  const maxR = 100;
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2; // Start from top

  // Helper to get point on circle
  function point(index: number, radius: number): { x: number; y: number } {
    const angle = startAngle + index * angleStep;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  // Build grid circles (25, 50, 75, 100)
  let gridLines = "";
  for (const level of [25, 50, 75, 100]) {
    const r = (level / 100) * maxR;
    const pts = themes.map((_, i) => {
      const p = point(i, r);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    gridLines += `<polygon points="${pts.join(" ")}" fill="none" stroke="#E8E8E8" stroke-width="0.5"/>`;
  }

  // Build axis lines
  let axisLines = "";
  for (let i = 0; i < count; i++) {
    const p = point(i, maxR);
    axisLines += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#E8E8E8" stroke-width="0.5"/>`;
  }

  // Build data polygon
  const dataPoints = themes.map((t, i) => {
    const score = themeScores[t] ?? 0;
    const r = (score / 100) * maxR;
    const p = point(i, r);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  });
  const dataPolygon = `<polygon points="${dataPoints.join(" ")}" fill="rgba(139,44,44,0.25)" stroke="#8B2C2C" stroke-width="1.5"/>`;

  // Build data points (dots)
  let dataDots = "";
  themes.forEach((t, i) => {
    const score = themeScores[t] ?? 0;
    const r = (score / 100) * maxR;
    const p = point(i, r);
    dataDots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#8B2C2C"/>`;
  });

  // Build labels
  let labels = "";
  themes.forEach((t, i) => {
    const score = themeScores[t] ?? 0;
    const labelR = maxR + 18;
    const p = point(i, labelR);
    const anchor = p.x < cx - 5 ? "end" : p.x > cx + 5 ? "start" : "middle";
    const dy = p.y < cy - 5 ? "-2" : p.y > cy + 5 ? "8" : "3";
    labels += `<text x="${p.x.toFixed(1)}" y="${(p.y + parseFloat(dy)).toFixed(1)}" text-anchor="${anchor}" font-size="7" font-family="'DM Sans','Helvetica Neue',sans-serif" fill="#333333">${SHORT_LABELS[t]}</text>`;
    // Score value near the point
    const scoreR = (score / 100) * maxR + 10;
    const sp = point(i, scoreR);
    labels += `<text x="${sp.x.toFixed(1)}" y="${sp.y.toFixed(1)}" text-anchor="middle" font-size="6.5" font-weight="700" font-family="'DM Mono','Courier New',monospace" fill="#8B2C2C">${score}</text>`;
  });

  return `<svg viewBox="0 0 250 250" width="250" height="250" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}
    ${axisLines}
    ${dataPolygon}
    ${dataDots}
    ${labels}
  </svg>`;
}

// ─── Page footer ───

function renderPageFooter(ref: string, pageNum: number): string {
  return `<div class="page-footer">
    <span>MCVA Consulting SA \u2014 ${esc(ref)} \u2014 Confidentiel</span>
    <span>${pageNum}</span>
  </div>`;
}

// ─── Section header with gradient mapping ───

function renderSectionHeader(sectionId: string, sectionNum: string, title: string, subtitle: string): string {
  const gradient = SECTION_GRADIENTS[sectionId] ?? "var(--grad-ember)";
  return `<div class="section-header" style="background:${gradient};">
    <div class="section-header-bar"></div>
    <div class="section-num">${esc(sectionNum)}</div>
    <div class="section-title">${title}</div>
    <div class="section-sub">${subtitle}</div>
  </div>`;
}

// ─── Generic theme section renderer ───

function renderThemeSection(
  data: UltraAuditData,
  theme: AuditTheme,
  sectionNum: number,
  extraContent: string = ""
): string {
  const { audit, items, actions, themeScores } = data;
  const ref = audit.reference ?? audit.domain;
  const score = themeScores[theme] ?? 0;
  const themeItems = itemsByTheme(items, theme);
  const themeActions = actions.filter(
    (a) => a.theme === theme || a.category === theme || a.category === CATEGORY_LABELS[theme]
  );

  const sectionId = theme;
  const sectionTitle = SHORT_LABELS[theme];
  const subtitle = `${themeItems.length} crit\u00e8res \u00B7 Score ${score}/100`;

  // Page 1: header + badge + intro + top 5 findings
  let page1 = `<div class="page">
  ${renderSectionHeader(sectionId, padSection(sectionNum), `${sectionTitle}`, subtitle)}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(score)}" style="float:right; margin-left:4mm;">
      <div class="num">${score}</div>
      <div class="lbl">${esc(sectionTitle)}</div>
    </div>

    ${generateThemeIntro(theme, score, themeItems)}

    <h2>Top constats</h2>
    ${themeItems.length > 0 ? renderFindingsFromItems(themeItems, 5) : '<p class="text-muted">Aucun crit\u00e8re \u00e9valu\u00e9 pour cette th\u00e9matique.</p>'}

    ${extraContent}

    ${renderPageFooter(ref, sectionNum)}
  </div>
</div>`;

  // Page 2: full items table + mini action plan (only if there are items)
  let page2 = "";
  if (themeItems.length > 0) {
    page2 = `<div class="page">
  <div class="page-inner">
    <h2>${esc(sectionTitle)} \u2014 D\u00e9tail des crit\u00e8res</h2>
    ${renderItemsTable(themeItems)}

    ${themeActions.length > 0 ? `<h2>Actions recommand\u00e9es \u2014 ${esc(sectionTitle)}</h2>${renderMiniActionTable(themeActions)}` : ""}

    ${renderPageFooter(ref, sectionNum)}
  </div>
</div>`;
  }

  return page1 + page2;
}

// ═══════════════════════════════════════════════
// SECTION RENDERERS
// ═══════════════════════════════════════════════

// ─── COVER ───

function renderCover(data: UltraAuditData): string {
  const { audit, clientContext } = data;
  const clientName =
    clientContext?.clientName ?? audit.brand_name ?? audit.domain;
  const date = formatDate(audit.created_at);
  const ref = audit.reference ?? `AUDIT-${new Date(audit.created_at).getFullYear()}`;
  const domains = THEME_ORDER.filter((t) => t !== "rgesn")
    .map((t) => SHORT_LABELS[t])
    .join(" \u00B7 ");

  return `<div class="page cover" style="height:297mm;">
  <div class="cover-top-bar"></div>
  <div class="cover-content">
    <div class="cover-eyebrow">MCVA Consulting SA \u00B7 Audit digital</div>
    <div class="cover-title">Audit Digital<br>Complet</div>
    <div class="cover-client">${esc(clientName)}</div>
    <div class="cover-domains">${esc(domains)} \u00B7 Benchmark</div>
  </div>
  <div class="cover-footer">
    <div class="cover-footer-text">Rapport confidentiel pr\u00e9par\u00e9 par MCVA Consulting SA<br>Chemin des Cr\u00eates 7 \u2014 1997 Haute-Nendaz \u00B7 Valais \u00B7 Suisse</div>
    <div class="cover-ref" style="margin-top:3mm">${esc(ref)} \u00B7 ${esc(date)}</div>
  </div>
</div>`;
}

// ─── TABLE OF CONTENTS ───

function renderTableOfContents(data: UltraAuditData): string {
  const { audit } = data;
  const ref = audit.reference ?? audit.domain;

  // Build TOC entries with estimated page numbers
  // Pages: cover(1), toc(2), synthese(3), radar(4), seo(5-6), geo(7-8),
  // perf(9-10), a11y(11-12), tech(13-14), contenu(15-16), rgesn(17-18),
  // benchmark(19), action-plan(20-22), methodology(23), closing(24)
  const tocEntries: { num: string; label: string; page: number }[] = [
    { num: "01", label: SECTION_TOC_LABELS.synthese, page: 3 },
    { num: "02", label: SECTION_TOC_LABELS.radar, page: 4 },
    { num: "03", label: SECTION_TOC_LABELS.seo, page: 5 },
    { num: "04", label: SECTION_TOC_LABELS.geo, page: 7 },
    { num: "05", label: SECTION_TOC_LABELS.perf, page: 9 },
    { num: "06", label: SECTION_TOC_LABELS.a11y, page: 11 },
    { num: "07", label: SECTION_TOC_LABELS.tech, page: 13 },
    { num: "08", label: SECTION_TOC_LABELS.contenu, page: 15 },
    { num: "09", label: SECTION_TOC_LABELS.rgesn, page: 17 },
    { num: "10", label: SECTION_TOC_LABELS.benchmark, page: 19 },
    { num: "11", label: SECTION_TOC_LABELS["action-plan"], page: 20 },
    { num: "12", label: SECTION_TOC_LABELS.methodology, page: 23 },
    { num: "13", label: SECTION_TOC_LABELS.closing, page: 24 },
  ];

  const tocHtml = tocEntries
    .map(
      (e) =>
        `<div class="toc-item">
          <span class="toc-item-num">${e.num}</span>
          <span class="toc-item-label">${esc(e.label)}</span>
          <span class="toc-item-page">${e.page}</span>
        </div>`
    )
    .join("");

  return `<div class="page">
  ${renderSectionHeader("toc", "", "Table des mati\u00e8res", "Sommaire du rapport")}
  <div class="page-inner" style="padding-top:6mm;">
    ${tocHtml}
    ${renderPageFooter(ref, 2)}
  </div>
</div>`;
}

// ─── SYNTHESE EXECUTIVE ───

function renderSynthese(data: UltraAuditData): string {
  const { audit, items, themeScores } = data;
  const ref = audit.reference ?? audit.domain;
  const globalScore = computeGlobalScore(themeScores);
  const findings = extractKeyFindings(items, 3);
  const totalActions = data.actions.length;

  const lead = `Le site <strong>${esc(audit.domain)}</strong> a fait l\u2019objet d\u2019un audit digital complet couvrant 7 dimensions. Le score global pond\u00e9r\u00e9 est de <strong class="text-red">${globalScore}/100</strong>. ${totalActions} actions d\u2019am\u00e9lioration ont \u00e9t\u00e9 identifi\u00e9es.`;

  const badges = THEME_ORDER.filter((t) => t !== "rgesn")
    .map((t) => {
      const s = themeScores[t] ?? 0;
      return `<div class="score-badge ${scoreColorClass(s)}"><div class="num">${s}</div><div class="lbl">${esc(SHORT_LABELS[t])}</div></div>`;
    })
    .join("");

  return `<div class="page">
  ${renderSectionHeader("synthese", "01", "Synth\u00e8se ex\u00e9cutive", "Vue d\u2019ensemble \u00B7 Scores \u00B7 Constats cl\u00e9s")}
  <div class="page-inner" style="padding-top:8mm;">

    <p class="lead">${lead}</p>

    <div class="scores-row">${badges}</div>

    <div class="callout-dark" style="text-align:center; margin-top:5mm;">
      <strong style="font-size:14pt; color:var(--red);">Score global : ${globalScore}/100</strong><br>
      <span style="font-size:9pt; color:var(--beige);">${totalActions} points d\u2019am\u00e9lioration identifi\u00e9s \u00B7 Potentiel d\u2019am\u00e9lioration ${globalScore < 40 ? "majeur" : globalScore < 60 ? "significatif" : "mod\u00e9r\u00e9"}</span>
    </div>

    <h2>3 constats cl\u00e9s</h2>
    ${findings
      .map(
        (f, i) =>
          `<div class="finding ${findingSeverity(f.avgScore)}">
        <span class="finding-tag">${padSection(i + 1)} \u00B7 ${esc(SHORT_LABELS[f.theme])} \u2014 ${esc(f.dimension)}</span>
        Score moyen : <strong>${f.avgScore}/100</strong> (${f.itemCount} crit\u00e8re(s)).${f.worstItem?.notes ? ` ${esc(f.worstItem.notes)}` : ""} Niveau <strong class="${scoreColorClass(f.avgScore)}">${scoreLabel(f.avgScore)}</strong>.
      </div>`
      )
      .join("")}

    ${renderPageFooter(ref, 3)}
  </div>
</div>`;
}

// ─── RADAR PAGE ───

function renderRadarPage(data: UltraAuditData): string {
  const { audit, themeScores } = data;
  const ref = audit.reference ?? audit.domain;
  const globalScore = computeGlobalScore(themeScores);

  const radarSvg = generateRadarSvg(themeScores);

  const scoreRows = THEME_ORDER.map((t) => {
    const s = themeScores[t] ?? 0;
    const w = GLOBAL_SCORE_WEIGHTS[t];
    return `<tr>
      <td><strong>${esc(SHORT_LABELS[t])}</strong></td>
      <td style="text-align:center" class="text-mono ${scoreColorClass(s)}">${s}/100</td>
      <td style="text-align:center" class="text-mono">${(w * 100).toFixed(0)}%</td>
      <td style="text-align:center" class="${scoreColorClass(s)}">${scoreLabel(s)}</td>
    </tr>`;
  }).join("");

  return `<div class="page">
  ${renderSectionHeader("radar", "02", "Radar des scores", "Vue synth\u00e9tique \u00B7 Pond\u00e9rations \u00B7 Score global")}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="radar-container">
      ${radarSvg}
    </div>

    <div class="global-score-hero">
      <div class="score-value">${globalScore}</div>
      <div style="font-size:9pt; margin-top:2mm;">Score global pond\u00e9r\u00e9 sur 100</div>
    </div>

    <table>
      <thead><tr><th>Th\u00e9matique</th><th style="text-align:center">Score</th><th style="text-align:center">Poids</th><th style="text-align:center">Niveau</th></tr></thead>
      <tbody>${scoreRows}</tbody>
    </table>

    ${renderPageFooter(ref, 4)}
  </div>
</div>`;
}

// ─── SEO SECTION ───

function renderSeoSection(data: UltraAuditData): string {
  const { audit, items, themeScores, semrushData, actions } = data;
  const ref = audit.reference ?? audit.domain;
  const seoScore = themeScores.seo ?? 0;
  const seoItems = itemsByTheme(items, "seo");
  const dimGroups = groupByDimension(seoItems);
  const seoActions = actions.filter(
    (a) => a.theme === "seo" || a.category === "SEO"
  );

  // Build subsections by dimension
  let subsections = "";
  let subNum = 1;
  for (const [dim, dimItems] of dimGroups) {
    subsections += `<h3>3.${subNum} ${esc(dim)}</h3>`;
    const worst = [...dimItems].sort((a, b) => a.score - b.score);
    for (const item of worst.slice(0, 2)) {
      subsections += `<div class="finding ${findingSeverity(item.score)}"><span class="finding-tag">${esc(findingLabel(item.score))}</span><strong>${esc(item.item_label)}</strong>${item.notes ? ` \u2014 ${esc(item.notes)}` : ""}</div>`;
    }
    subNum++;
  }

  // Semrush KPIs
  let semrushSection = "";
  if (semrushData) {
    semrushSection += `<h2>Donn\u00e9es Semrush</h2>
    <table class="tbl-compact">
      <thead><tr><th>KPI</th><th>Valeur</th></tr></thead>
      <tbody>
        ${semrushData.rank_ch != null ? `<tr><td>Rang CH</td><td class="text-mono">${semrushData.rank_ch.toLocaleString("fr-CH")}</td></tr>` : ""}
        ${semrushData.mots_cles != null ? `<tr><td>Mots-cl\u00e9s organiques</td><td class="text-mono">${semrushData.mots_cles.toLocaleString("fr-CH")}</td></tr>` : ""}
        ${semrushData.trafic != null ? `<tr><td>Trafic organique</td><td class="text-mono">${semrushData.trafic.toLocaleString("fr-CH")}/mois</td></tr>` : ""}
        ${semrushData.authority_score != null ? `<tr><td>Authority Score</td><td class="text-mono">${semrushData.authority_score}</td></tr>` : ""}
        ${semrushData.backlinks != null ? `<tr><td>Backlinks</td><td class="text-mono">${semrushData.backlinks.toLocaleString("fr-CH")}</td></tr>` : ""}
      </tbody>
    </table>`;

    if (semrushData.top_keywords && semrushData.top_keywords.length > 0) {
      semrushSection += `<h3>Top mots-cl\u00e9s</h3>
      <table class="tbl-compact">
        <thead><tr><th>Mot-cl\u00e9</th><th style="text-align:center">Position</th><th style="text-align:right">Volume</th></tr></thead>
        <tbody>
          ${semrushData.top_keywords
            .slice(0, 10)
            .map(
              (kw) =>
                `<tr><td>${esc(kw.keyword)}</td><td style="text-align:center" class="text-mono">${kw.position}</td><td style="text-align:right" class="text-mono">${kw.volume.toLocaleString("fr-CH")}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`;
    }
  }

  // Page 1: section header + score + findings + semrush
  const page1 = `<div class="page">
  ${renderSectionHeader("seo", "03", "Audit SEO \u2014 R\u00e9f\u00e9rencement naturel", `${seoItems.length} crit\u00e8res \u00B7 Score ${seoScore}/100`)}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(seoScore)}" style="float:right; margin-left:4mm;"><div class="num">${seoScore}</div><div class="lbl">Score SEO</div></div>

    ${generateThemeIntro("seo", seoScore, seoItems)}

    ${subsections}

    ${semrushSection}

    ${renderPageFooter(ref, 5)}
  </div>
</div>`;

  // Page 2: full items table + actions
  const page2 = `<div class="page">
  <div class="page-inner">
    <h2>SEO \u2014 D\u00e9tail des crit\u00e8res</h2>
    ${renderItemsTable(seoItems)}

    ${seoActions.length > 0 ? `<h2>Actions recommand\u00e9es \u2014 SEO</h2>${renderMiniActionTable(seoActions)}` : ""}

    ${renderPageFooter(ref, 6)}
  </div>
</div>`;

  return page1 + page2;
}

// ─── GEO SECTION ───

function renderGeoSection(data: UltraAuditData): string {
  const { audit, items, themeScores, qwairyData, scores, actions } = data;
  const ref = audit.reference ?? audit.domain;
  const geoScore = themeScores.geo ?? 0;
  const geoItems = itemsByTheme(items, "geo");
  const dimGroups = groupByDimension(geoItems);
  const hasQwairy = !!qwairyData;
  const geoActions = actions.filter(
    (a) => a.theme === "geo" || a.category === "GEO"
  );

  // KPI values
  const mentionRate = hasQwairy
    ? `${qwairyData!.mention_rate ?? 0}%`
    : `~${Math.round((scores.score_geo / 100) * 30)}%`;
  const sourceRate = hasQwairy
    ? `${qwairyData!.source_rate ?? 0}%`
    : `~${Math.round((scores.score_geo / 100) * 10)}%`;
  const sov = hasQwairy
    ? `${qwairyData!.sov ?? 0}%`
    : `~${Math.round((scores.score_geo / 100) * 12)}%`;
  const sentiment = hasQwairy
    ? `${qwairyData!.sentiment ?? 0}/100`
    : `~${Math.round(50 + (scores.score_geo / 100) * 35)}/100`;

  // LLM distribution
  let llmTable = "";
  if (hasQwairy && qwairyData!.llm_distribution && qwairyData!.llm_distribution.length > 0) {
    llmTable = `<h2>Distribution par LLM</h2>
    <table class="tbl-compact">
      <thead><tr><th>Provider</th><th>Mention Rate</th><th>Source Rate</th><th>SOV</th><th>Sentiment</th></tr></thead>
      <tbody>
        ${qwairyData!.llm_distribution
          .map(
            (d) =>
              `<tr><td><strong>${esc(d.provider)}</strong></td><td class="text-mono">${d.mention_rate}%</td><td class="text-mono">${d.source_rate}%</td><td class="text-mono">${d.sov}%</td><td class="text-mono">${d.sentiment}/100</td></tr>`
          )
          .join("")}
      </tbody>
    </table>`;
  } else {
    const modelResults = scores.geo_data?.models_tested ?? [];
    if (modelResults.length > 0) {
      llmTable = `<h2>Distribution par LLM</h2>
      <table class="tbl-compact">
        <thead><tr><th>Provider</th><th>Mention</th><th>Sentiment</th><th>Observation</th></tr></thead>
        <tbody>
          ${modelResults
            .map(
              (m) =>
                `<tr><td><strong>${esc(m.model)}</strong></td><td class="text-mono">${m.mentioned ? "Oui" : "Non"}</td><td class="text-mono">${esc(m.sentiment)}</td><td>${m.context ? esc(m.context) : "\u2014"}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`;
    }
  }

  // SOV competitors benchmark
  let benchmarkGeo = "";
  if (hasQwairy && qwairyData!.sov_competitors && qwairyData!.sov_competitors.length > 0) {
    benchmarkGeo = `<h2>Benchmark concurrentiel GEO</h2>
    <table class="tbl-compact">
      <thead><tr><th>Nom</th><th style="text-align:center">Mentions</th><th style="text-align:center">Coverage</th><th style="text-align:center">SOV</th><th style="text-align:center">Pos. moy.</th><th>LLMs</th></tr></thead>
      <tbody>
        ${qwairyData!.sov_competitors
          .map(
            (c) =>
              `<tr><td><strong>${esc(c.name)}</strong></td><td style="text-align:center" class="text-mono">${c.mentions}</td><td style="text-align:center" class="text-mono">${c.coverage}%</td><td style="text-align:center" class="text-mono">${c.sov}%</td><td style="text-align:center" class="text-mono">${c.position_avg.toFixed(1)}</td><td class="text-muted">${esc(c.llms)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>`;
  } else if (scores.competitors && scores.competitors.length > 0) {
    benchmarkGeo = `<h2>Benchmark concurrentiel GEO</h2>
    <table class="tbl-compact">
      <thead><tr><th>Domaine</th><th style="text-align:center">Score GEO</th></tr></thead>
      <tbody>
        ${scores.competitors
          .map(
            (c) =>
              `<tr><td>${esc(c.domain)}</td><td style="text-align:center" class="text-mono ${scoreColorClass(c.score_geo ?? 0)}">${c.score_geo ?? "\u2014"}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>`;
  }

  // Page 1: Overview + KPIs + LLM distribution + benchmark
  const page1 = `<div class="page">
  ${renderSectionHeader("geo", "04", "Audit GEO \u2014 Score GEO\u2122", "Overview \u00B7 Distribution LLM \u00B7 Benchmark")}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(geoScore)}" style="float:right; margin-left:4mm;"><div class="num">${geoScore}</div><div class="lbl">Score GEO\u2122</div></div>

    <p class="lead">Le Score GEO\u2122 mesure la citabilit\u00e9 d\u2019une entreprise par les IA g\u00e9n\u00e9ratives sur une \u00e9chelle de 0 \u00e0 100. <strong class="${scoreColorClass(geoScore)}">Score : ${geoScore}/100 (${scoreLabel(geoScore)}).</strong></p>

    <h2>Overview globale</h2>
    <table>
      <thead><tr><th>KPI</th><th>Valeur</th><th>Interpr\u00e9tation</th></tr></thead>
      <tbody>
        <tr><td><strong>Mention Rate</strong></td><td class="text-mono">${mentionRate}</td><td>${geoScore < 30 ? "Tr\u00e8s faible" : geoScore < 60 ? "Mod\u00e9r\u00e9" : "Bon"}</td></tr>
        <tr><td><strong>Source Rate</strong></td><td class="text-mono">${sourceRate}</td><td>${geoScore < 30 ? "Le site n\u2019est pas cit\u00e9 comme source" : "Sources d\u00e9tect\u00e9es"}</td></tr>
        <tr><td><strong>Share of Voice</strong></td><td class="text-mono">${sov}</td><td>${geoScore < 30 ? "Visibilit\u00e9 tr\u00e8s limit\u00e9e" : "Pr\u00e9sence d\u00e9tect\u00e9e"}</td></tr>
        <tr><td><strong>Sentiment</strong></td><td class="text-mono">${sentiment}</td><td>${geoScore < 50 ? "Neutre" : "Positif"}</td></tr>
      </tbody>
    </table>
    ${!hasQwairy ? '<p class="text-muted">* Estimations bas\u00e9es sur les r\u00e9sultats de l\u2019analyse IA directe. Sera consolid\u00e9 avec donn\u00e9es Qwairy.</p>' : ""}

    ${llmTable}

    ${benchmarkGeo}

    ${renderPageFooter(ref, 7)}
  </div>
</div>`;

  // Page 2: Thematic analysis + query fan-out + sources + sentiment benchmark + mode callout
  let thematicTable = "";
  if (dimGroups.size > 0) {
    thematicTable = `<h2>Analyse par th\u00e9matique</h2>
    <table>
      <thead><tr><th>Dimension</th><th style="text-align:center">Crit\u00e8res</th><th style="text-align:center">Score moyen</th><th>Niveau</th></tr></thead>
      <tbody>
        ${Array.from(dimGroups.entries())
          .map(([dim, dimItems]) => {
            const avg = Math.round(
              dimItems.reduce((s, i) => s + i.score, 0) / dimItems.length
            );
            return `<tr><td><strong>${esc(dim)}</strong></td><td style="text-align:center" class="text-mono">${dimItems.length}</td><td style="text-align:center" class="text-mono ${scoreColorClass(avg)}"><strong>${avg}/100</strong></td><td class="${scoreColorClass(avg)}">${scoreLabel(avg)}</td></tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
  }

  const fanOutItems = geoItems.filter(
    (i) => i.item_code.includes("CITE") || i.dimension === "I"
  );
  let fanOut = "";
  if (fanOutItems.length > 0) {
    fanOut = `<h2>Query Fan-Out</h2>
    <p>Les LLMs d\u00e9composent les requ\u00eates en sous-requ\u00eates. Chaque sous-requ\u00eate est une opportunit\u00e9 de citation.</p>
    ${renderItemsTable(fanOutItems)}`;
  }

  const sourceItems = geoItems.filter((i) => i.dimension === "C" || i.dimension === "T");
  let sourcesSection = "";
  if (sourceItems.length > 0) {
    sourcesSection = `<h2>Analyse des sources</h2>
    ${renderFindingsFromItems(sourceItems, 3)}`;
  }

  const socialItems = geoItems.filter((i) => i.dimension === "E");
  let socialTech = "";
  if (socialItems.length > 0) {
    socialTech = `<h2>Social & Technique IA</h2>
    ${renderFindingsFromItems(socialItems, 3)}`;
  }

  // Sentiment benchmark
  let sentimentBenchmark = "";
  if (hasQwairy && qwairyData!.sentiment_benchmark && qwairyData!.sentiment_benchmark.length > 0) {
    const clientName = data.clientContext?.clientName ?? data.audit.domain;
    sentimentBenchmark = `<h2>Benchmark Sentiment</h2>
    <table class="tbl-compact">
      <thead><tr><th>Cabinet</th><th style="text-align:center">Sentiment</th><th style="text-align:center">Rang</th></tr></thead>
      <tbody>
        ${qwairyData!.sentiment_benchmark
          .sort((a, b) => a.rank - b.rank)
          .map((s) => {
            const isClient = s.name.toLowerCase().includes(clientName.toLowerCase().split(" ")[0]);
            const bg = isClient ? ' style="background:var(--cream);border-left:3px solid var(--red);font-weight:600"' : "";
            return `<tr${bg}><td>${esc(s.name)}${isClient ? " \u2605" : ""}</td><td style="text-align:center" class="text-mono ${s.sentiment >= 80 ? "text-green" : s.sentiment >= 70 ? "text-orange" : "text-crit"}">${s.sentiment}/100</td><td style="text-align:center">#${s.rank}</td></tr>`;
          })
          .join("")}
      </tbody>
    </table>
    ${qwairyData!.sentiment_insight ? `<div class="callout" style="margin-top:3mm;"><strong>Insight :</strong> ${esc(qwairyData!.sentiment_insight)}</div>` : ""}`;
  }

  const modeCallout = hasQwairy
    ? `<div class="callout" style="margin-top:4mm;"><strong class="text-green">DONN\u00c9ES R\u00c9ELLES QWAIRY</strong> \u2014 Les KPIs ci-dessus proviennent de l\u2019analyse Qwairy sur ${qwairyData!.llms ?? "5"} LLMs et ${qwairyData!.prompts ?? "10"} prompts.</div>`
    : `<div class="callout" style="margin-top:4mm;"><strong class="text-red">Note :</strong> Cette section contient des estimations bas\u00e9es sur l\u2019analyse IA directe. Elle sera enrichie avec donn\u00e9es r\u00e9elles Qwairy.</div>`;

  const page2 = `<div class="page">
  <div class="page-inner">

    ${thematicTable}
    ${fanOut}
    ${sourcesSection}
    ${socialTech}
    ${sentimentBenchmark}
    ${modeCallout}

    ${geoActions.length > 0 ? `<h2>Actions recommand\u00e9es \u2014 GEO</h2>${renderMiniActionTable(geoActions)}` : ""}

    ${renderPageFooter(ref, 8)}
  </div>
</div>`;

  return page1 + page2;
}

// ─── PERFORMANCE SECTION ───

function renderPerfSection(data: UltraAuditData): string {
  const { audit, items, themeScores, scores } = data;
  const ref = audit.reference ?? audit.domain;
  const perfScore = themeScores.perf ?? 0;
  const perfItems = itemsByTheme(items, "perf");
  const perfActions = data.actions.filter(
    (a) => a.theme === "perf" || a.category === "technique"
  );

  // Core Web Vitals table
  const cwv = scores.seo_data?.core_web_vitals;
  let cwvTable = "";
  if (cwv) {
    const metrics: { label: string; value: string; threshold: string; pass: boolean }[] = [];
    if (cwv.lcp != null)
      metrics.push({
        label: "LCP (Largest Contentful Paint)",
        value: `${(cwv.lcp / 1000).toFixed(1)}s`,
        threshold: "< 2.5s",
        pass: cwv.lcp <= 2500,
      });
    if (cwv.cls != null)
      metrics.push({
        label: "CLS (Cumulative Layout Shift)",
        value: `${cwv.cls.toFixed(2)}`,
        threshold: "< 0.1",
        pass: cwv.cls <= 0.1,
      });
    if (cwv.inp != null)
      metrics.push({
        label: "INP (Interaction to Next Paint)",
        value: `${cwv.inp}ms`,
        threshold: "< 200ms",
        pass: cwv.inp <= 200,
      });
    if (cwv.ttfb != null)
      metrics.push({
        label: "TTFB (Time to First Byte)",
        value: `${cwv.ttfb}ms`,
        threshold: "< 600ms",
        pass: cwv.ttfb <= 600,
      });

    if (metrics.length > 0) {
      cwvTable = `<h2>Core Web Vitals</h2>
      <table>
        <thead><tr><th>M\u00e9trique</th><th>Valeur</th><th>Seuil Google</th><th>Statut</th></tr></thead>
        <tbody>
          ${metrics
            .map(
              (m) =>
                `<tr><td>${esc(m.label)}</td><td class="text-mono">${esc(m.value)}</td><td class="text-mono">${esc(m.threshold)}</td><td><strong class="${m.pass ? "text-green" : "text-crit"}">\u25A0 ${m.pass ? "OK" : "Insuffisant"}</strong></td></tr>`
            )
            .join("")}
        </tbody>
      </table>`;
    }
  }

  const extraContent = `${cwvTable || '<p class="text-muted">Donn\u00e9es CWV non disponibles.</p>'}`;

  // Page 1: section header + CWV + top findings
  const page1 = `<div class="page">
  ${renderSectionHeader("perf", "05", "Performance \u2014 Core Web Vitals", `${perfItems.length} crit\u00e8res \u00B7 Score ${perfScore}/100`)}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(perfScore)}" style="float:right; margin-left:4mm;">
      <div class="num">${perfScore}</div>
      <div class="lbl">Performance</div>
    </div>

    ${generateThemeIntro("perf", perfScore, perfItems)}

    ${extraContent}

    <h2>Top constats Performance</h2>
    ${perfItems.length > 0 ? renderFindingsFromItems(perfItems, 5) : '<p class="text-muted">Aucun crit\u00e8re de performance \u00e9valu\u00e9.</p>'}

    ${renderPageFooter(ref, 9)}
  </div>
</div>`;

  // Page 2: full items + actions
  let page2 = "";
  if (perfItems.length > 0) {
    page2 = `<div class="page">
  <div class="page-inner">
    <h2>Performance \u2014 D\u00e9tail des crit\u00e8res</h2>
    ${renderItemsTable(perfItems)}

    ${perfActions.length > 0 ? `<h2>Actions recommand\u00e9es \u2014 Performance</h2>${renderMiniActionTable(perfActions)}` : ""}

    ${renderPageFooter(ref, 10)}
  </div>
</div>`;
  }

  return page1 + page2;
}

// ─── ACCESSIBILITY SECTION ───

function renderA11ySection(data: UltraAuditData): string {
  return renderThemeSection(data, "a11y", 6);
}

// ─── TECH SECTION ───

function renderTechSection(data: UltraAuditData): string {
  const { scores } = data;

  // Stack & hosting extra content
  let stackTable = "";
  const techChecks = scores.seo_data?.technical_checks;
  if (techChecks && techChecks.length > 0) {
    stackTable = `<h3>Stack & h\u00e9bergement</h3>
    <table class="tbl-compact">
      <thead><tr><th>Composant</th><th>Valeur</th><th>Statut</th></tr></thead>
      <tbody>
        ${techChecks
          .slice(0, 8)
          .map(
            (tc) =>
              `<tr><td>${esc(tc.label)}</td><td>${esc(tc.value ?? "\u2014")}</td><td class="${tc.status === "pass" ? "text-green" : tc.status === "warn" ? "text-orange" : "text-crit"}"><strong>${tc.status === "pass" ? "OK" : tc.status === "warn" ? "Attention" : "Probl\u00e8me"}</strong></td></tr>`
          )
          .join("")}
      </tbody>
    </table>`;
  }

  return renderThemeSection(data, "tech", 7, stackTable);
}

// ─── CONTENU SECTION ───

function renderContenuSection(data: UltraAuditData): string {
  const { items, themeScores, audit, actions } = data;
  const ref = audit.reference ?? audit.domain;
  const contenuScore = themeScores.contenu ?? 0;
  const contenuItems = itemsByTheme(items, "contenu");
  const contenuActions = actions.filter(
    (a) => a.theme === "contenu" || a.category === "contenu"
  );

  const strongContent = contenuItems.filter((i) => i.score >= 65);
  const weakContent = contenuItems.filter((i) => i.score < 65);

  const page1 = `<div class="page">
  ${renderSectionHeader("contenu", "08", "Contenu \u2014 Qualit\u00e9 \u00e9ditoriale", `${contenuItems.length} crit\u00e8res \u00B7 Score ${contenuScore}/100`)}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(contenuScore)}" style="float:right; margin-left:4mm;">
      <div class="num">${contenuScore}</div>
      <div class="lbl">Contenu</div>
    </div>

    ${generateThemeIntro("contenu", contenuScore, contenuItems)}

    ${strongContent.length > 0 ? `<h2>Points forts du contenu</h2>${renderFindingsFromItems(strongContent, 4)}` : ""}
    ${weakContent.length > 0 ? `<h2>Points faibles du contenu</h2>${renderFindingsFromItems(weakContent, 5)}` : ""}

    ${renderPageFooter(ref, 15)}
  </div>
</div>`;

  let page2 = "";
  if (contenuItems.length > 0) {
    page2 = `<div class="page">
  <div class="page-inner">
    <h2>Contenu \u2014 D\u00e9tail des crit\u00e8res</h2>
    ${renderItemsTable(contenuItems)}

    ${contenuActions.length > 0 ? `<h2>Actions recommand\u00e9es \u2014 Contenu</h2>${renderMiniActionTable(contenuActions)}` : ""}

    ${renderPageFooter(ref, 16)}
  </div>
</div>`;
  }

  return page1 + page2;
}

// ─── RGESN SECTION ───

function renderRgesnSection(data: UltraAuditData): string {
  const { items, themeScores, audit, actions } = data;
  const ref = audit.reference ?? audit.domain;
  const rgesnScore = themeScores.rgesn ?? 0;
  const rgesnItems = itemsByTheme(items, "rgesn");
  const rgesnActions = actions.filter(
    (a) => a.theme === "rgesn"
  );

  const page1 = `<div class="page">
  ${renderSectionHeader("rgesn", "09", "\u00c9co-conception \u2014 RGESN", `${rgesnItems.length} crit\u00e8res \u00B7 Score ${rgesnScore}/100`)}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(rgesnScore)}" style="float:right; margin-left:4mm;">
      <div class="num">${rgesnScore}</div>
      <div class="lbl">\u00c9co-conception</div>
    </div>

    ${generateThemeIntro("rgesn", rgesnScore, rgesnItems)}

    <h2>Top constats RGESN</h2>
    ${rgesnItems.length > 0 ? renderFindingsFromItems(rgesnItems, 5) : '<p class="text-muted">Aucun crit\u00e8re RGESN \u00e9valu\u00e9.</p>'}

    ${renderPageFooter(ref, 17)}
  </div>
</div>`;

  let page2 = "";
  if (rgesnItems.length > 0) {
    page2 = `<div class="page">
  <div class="page-inner">
    <h2>\u00c9co-conception \u2014 D\u00e9tail des crit\u00e8res</h2>
    ${renderItemsTable(rgesnItems)}

    ${rgesnActions.length > 0 ? `<h2>Actions recommand\u00e9es \u2014 \u00c9co-conception</h2>${renderMiniActionTable(rgesnActions)}` : ""}

    ${renderPageFooter(ref, 18)}
  </div>
</div>`;
  }

  return page1 + page2;
}

// ─── BENCHMARK SECTION ───

function renderBenchmarkSection(data: UltraAuditData): string {
  const { audit, benchmarkRanking, scores, semrushData } = data;
  const ref = audit.reference ?? audit.domain;

  if (benchmarkRanking && benchmarkRanking.domains.length > 0) {
    const sorted = [...benchmarkRanking.domains].sort(
      (a, b) => (a.rank_seo ?? 999) - (b.rank_seo ?? 999)
    );

    return `<div class="page">
  ${renderSectionHeader("benchmark", "10", "Benchmark concurrentiel", `${esc(benchmarkRanking.benchmarkName)} \u00B7 ${esc(benchmarkRanking.geographicScope)}`)}
  <div class="page-inner" style="padding-top:6mm;">

    <table>
      <thead><tr><th>#</th><th>Domaine</th><th style="text-align:center">SEO</th><th style="text-align:center">GEO</th><th style="text-align:center">Rang SEO</th><th style="text-align:center">Rang GEO</th></tr></thead>
      <tbody>
        ${sorted
          .map((d) => {
            const isClient = d.domain === benchmarkRanking.clientDomain;
            const bg = isClient
              ? 'style="background:var(--gray-100);border-left:3px solid var(--red)"'
              : "";
            return `<tr ${bg}>
              <td${isClient ? ' class="font-bold"' : ""}>${d.rank_seo ?? "\u2014"}</td>
              <td${isClient ? ' class="font-bold"' : ""}>${esc(d.domain)}</td>
              <td style="text-align:center" class="${scoreColorClass(d.score_seo ?? 0)} font-bold">${d.score_seo ?? "\u2014"}</td>
              <td style="text-align:center" class="${scoreColorClass(d.score_geo ?? 0)} font-bold">${d.score_geo ?? "\u2014"}</td>
              <td style="text-align:center">${d.rank_seo ?? "\u2014"}/${sorted.length}</td>
              <td style="text-align:center">${d.rank_geo ?? "\u2014"}/${sorted.length}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>

    ${renderPageFooter(ref, 19)}
  </div>
</div>`;
  }

  // Fallback: Semrush competitors or scores.competitors
  const competitors = semrushData?.competitors ?? [];
  const scoreCompetitors = scores.competitors ?? [];

  if (competitors.length === 0 && scoreCompetitors.length === 0) {
    return `<div class="page">
  ${renderSectionHeader("benchmark", "10", "Benchmark concurrentiel", esc(audit.domain))}
  <div class="page-inner" style="padding-top:6mm;">
    <p class="text-muted">Aucune donn\u00e9e de benchmark disponible. Lancez un benchmark pour g\u00e9n\u00e9rer cette section.</p>
    ${renderPageFooter(ref, 19)}
  </div>
</div>`;
  }

  if (competitors.length > 0) {
    return `<div class="page">
  ${renderSectionHeader("benchmark", "10", "Benchmark concurrentiel", "Donn\u00e9es Semrush")}
  <div class="page-inner" style="padding-top:6mm;">
    <table>
      <thead><tr><th>Site</th><th style="text-align:center">Rang</th><th style="text-align:center">Mots-cl\u00e9s</th><th style="text-align:right">Trafic</th><th style="text-align:center">Backlinks</th><th style="text-align:center">AS</th></tr></thead>
      <tbody>
        ${competitors
          .map(
            (c) =>
              `<tr><td><strong>${esc(c.site)}</strong></td><td style="text-align:center" class="text-mono">${c.rank ?? "\u2014"}</td><td style="text-align:center" class="text-mono">${c.mots_cles?.toLocaleString("fr-CH") ?? "\u2014"}</td><td style="text-align:right" class="text-mono">${c.trafic?.toLocaleString("fr-CH") ?? "\u2014"}</td><td style="text-align:center" class="text-mono">${c.backlinks?.toLocaleString("fr-CH") ?? "\u2014"}</td><td style="text-align:center" class="text-mono">${c.authority ?? "\u2014"}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${renderPageFooter(ref, 19)}
  </div>
</div>`;
  }

  // scoreCompetitors fallback
  return `<div class="page">
  ${renderSectionHeader("benchmark", "10", "Benchmark concurrentiel", esc(audit.domain))}
  <div class="page-inner" style="padding-top:6mm;">
    <table>
      <thead><tr><th>Domaine</th><th style="text-align:center">Score SEO</th><th style="text-align:center">Score GEO</th></tr></thead>
      <tbody>
        ${scoreCompetitors
          .map(
            (c) =>
              `<tr><td>${esc(c.domain)}</td><td style="text-align:center" class="${scoreColorClass(c.score_seo ?? 0)} text-mono">${c.score_seo ?? "\u2014"}</td><td style="text-align:center" class="${scoreColorClass(c.score_geo ?? 0)} text-mono">${c.score_geo ?? "\u2014"}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${renderPageFooter(ref, 19)}
  </div>
</div>`;
}

// ─── ACTION PLAN SECTION (Multi-page) ───

function renderActionPlanSection(data: UltraAuditData): string {
  const { audit, actions } = data;
  const ref = audit.reference ?? audit.domain;

  if (actions.length === 0) {
    return `<div class="page">
  ${renderSectionHeader("action-plan", "11", "Plan d\u2019action \u2014 3 phases", "Quick Wins \u00B7 Fondations \u00B7 Acc\u00e9l\u00e9ration")}
  <div class="page-inner" style="padding-top:6mm;">
    <p class="text-muted">Aucune action g\u00e9n\u00e9r\u00e9e.</p>
    ${renderPageFooter(ref, 20)}
  </div>
</div>`;
  }

  const phase1 = actions.filter((a) => a.priority === "P1");
  const phase2 = actions.filter((a) => a.priority === "P2");
  const phase3 = actions.filter(
    (a) => a.priority === "P3" || a.priority === "P4"
  );

  function renderPhaseRows(phaseActions: AuditAction[], prefix: string): string {
    if (phaseActions.length === 0) {
      return `<tr><td colspan="5" class="text-muted" style="text-align:center;padding:3mm;">Aucune action dans cette phase.</td></tr>`;
    }
    return phaseActions
      .map(
        (a, i) =>
          `<tr><td>${esc(prefix)}.${i + 1}</td><td>${esc(a.title)}</td><td>${impactStars(a.impact_points)}</td><td>${impactStars(Math.min(a.impact_points, 5))}</td><td>${esc(a.effort)}</td></tr>`
      )
      .join("");
  }

  // Page 1: Overview callout + Phase 1 detailed table
  const page1 = `<div class="page">
  ${renderSectionHeader("action-plan", "11", "Plan d\u2019action \u2014 3 phases", "Quick Wins \u00B7 Fondations \u00B7 Acc\u00e9l\u00e9ration")}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="callout-dark" style="text-align:center; margin-bottom:5mm;">
      <strong style="font-size:12pt; color:var(--white);">${actions.length} actions identifi\u00e9es</strong><br>
      <span style="font-size:9pt; color:var(--beige);">
        Phase 1 : ${phase1.length} actions (0-4 sem.) \u00B7
        Phase 2 : ${phase2.length} actions (1-3 mois) \u00B7
        Phase 3 : ${phase3.length} actions (3-6 mois)
      </span>
    </div>

    <div class="phase-header">Phase 1 \u2014 Quick Wins (0-4 semaines)</div>
    <table class="tbl-compact" style="margin-top:0;">
      <thead><tr><th>#</th><th>Action</th><th>SEO</th><th>GEO</th><th>Effort</th></tr></thead>
      <tbody>${renderPhaseRows(phase1, "1")}</tbody>
    </table>

    ${renderPageFooter(ref, 20)}
  </div>
</div>`;

  // Page 2: Phase 2 + Phase 3 tables
  const page2 = `<div class="page">
  <div class="page-inner">

    <div class="phase-header phase-header-dark">Phase 2 \u2014 Fondations (1-3 mois)</div>
    <table class="tbl-compact" style="margin-top:0;">
      <thead><tr><th>#</th><th>Action</th><th>SEO</th><th>GEO</th><th>Effort</th></tr></thead>
      <tbody>${renderPhaseRows(phase2, "2")}</tbody>
    </table>

    <div class="phase-header" style="margin-top:4mm; background: var(--grad-drift);">Phase 3 \u2014 Acc\u00e9l\u00e9ration (3-6 mois)</div>
    <table class="tbl-compact" style="margin-top:0;">
      <thead><tr><th>#</th><th>Action</th><th>SEO</th><th>GEO</th><th>Effort</th></tr></thead>
      <tbody>${renderPhaseRows(phase3, "3")}</tbody>
    </table>

    ${renderPageFooter(ref, 21)}
  </div>
</div>`;

  // Page 3 (optional): Detailed P1 quick wins with full descriptions and KPIs
  let page3 = "";
  if (phase1.length > 0) {
    page3 = `<div class="page">
  <div class="page-inner">

    <h2>Phase 1 \u2014 D\u00e9tail des Quick Wins</h2>
    ${phase1.map((a, i) =>
      `<div class="finding ${a.impact_points >= 6 ? "finding-crit" : a.impact_points >= 4 ? "finding-warn" : "finding-info"}" style="margin-bottom:3mm;">
        <span class="finding-tag">QW ${i + 1} \u00B7 ${esc(a.theme ?? CATEGORY_LABELS[a.category] ?? a.category)} \u00B7 Impact ${a.impact_points}/10</span>
        <strong>${esc(a.title)}</strong><br>
        <span style="font-size:8pt; color:var(--gray-600);">${esc(a.description)}</span>
        ${a.kpi ? `<br><span class="text-mono text-muted">KPI : ${esc(a.kpi)}</span>` : ""}
        <br><span class="text-muted">Effort : ${esc(a.effort)}</span>
      </div>`
    ).join("")}

    ${renderPageFooter(ref, 22)}
  </div>
</div>`;
  }

  return page1 + page2 + page3;
}

// ─── METHODOLOGY ───

function renderMethodology(data: UltraAuditData): string {
  const { audit } = data;
  const ref = audit.reference ?? audit.domain;

  return `<div class="page">
  ${renderSectionHeader("methodology", "12", "M\u00e9thodologie", "Frameworks \u00B7 Scoring \u00B7 R\u00e9f\u00e9rentiels")}
  <div class="page-inner" style="padding-top:6mm;">

    <p class="lead">Ce rapport utilise une m\u00e9thodologie multi-frameworks d\u00e9velopp\u00e9e par MCVA Consulting SA, couvrant 7 dimensions de la performance digitale.</p>

    <div class="method-grid">
      <div class="method-card">
        <h4>CORE-EEAT (SEO)</h4>
        <p>Content, Outreach, Reputation, Experience, Expertise, Authority, Trust. Framework d\u2019\u00e9valuation SEO bas\u00e9 sur les guidelines Google Quality Rater. Chaque crit\u00e8re est not\u00e9 de 0 \u00e0 100.</p>
      </div>
      <div class="method-card">
        <h4>CITE (GEO)</h4>
        <p>Citability, Indexability, Trustworthiness, Engagement. Framework propri\u00e9taire mesurant la citabilit\u00e9 d\u2019une marque par les IA g\u00e9n\u00e9ratives (ChatGPT, Gemini, Perplexity, Claude).</p>
      </div>
      <div class="method-card">
        <h4>Score GEO\u2122</h4>
        <p>Score propri\u00e9taire MCVA mesurant la visibilit\u00e9 dans les r\u00e9ponses g\u00e9n\u00e9r\u00e9es par IA. Int\u00e8gre le Mention Rate, Source Rate, Share of Voice et Sentiment.</p>
      </div>
      <div class="method-card">
        <h4>Core Web Vitals</h4>
        <p>LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), INP (Interaction to Next Paint), TTFB (Time to First Byte). Seuils Google pour le classement.</p>
      </div>
      <div class="method-card">
        <h4>RGAA / WCAG 2.1 AA</h4>
        <p>R\u00e9f\u00e9rentiel G\u00e9n\u00e9ral d\u2019Am\u00e9lioration de l\u2019Accessibilit\u00e9 et Web Content Accessibility Guidelines. Conformit\u00e9 niveau AA pour l\u2019acc\u00e8s universel.</p>
      </div>
      <div class="method-card">
        <h4>RGESN</h4>
        <p>R\u00e9f\u00e9rentiel G\u00e9n\u00e9ral d\u2019\u00c9coconception des Services Num\u00e9riques. 79 crit\u00e8res pour r\u00e9duire l\u2019empreinte environnementale des services digitaux.</p>
      </div>
    </div>

    <h2>\u00c9chelle de scoring</h2>
    <div class="score-scale">
      <div class="score-scale-item" style="background:#FDEAEA; color:var(--crit-red);">0-24 Critique</div>
      <div class="score-scale-item" style="background:#FFF3CD; color:var(--orange);">25-49 Faible</div>
      <div class="score-scale-item" style="background:#FFF3CD; color:#8B6914;">50-74 Moyen</div>
      <div class="score-scale-item" style="background:#D4EDDA; color:var(--green);">75-100 Bon</div>
    </div>

    <h2>Score global pond\u00e9r\u00e9</h2>
    <p>Le score global est une moyenne pond\u00e9r\u00e9e des 7 th\u00e9matiques :</p>
    <table class="tbl-compact">
      <thead><tr><th>Th\u00e9matique</th><th style="text-align:center">Poids</th></tr></thead>
      <tbody>
        ${THEME_ORDER.map((t) =>
          `<tr><td>${esc(SHORT_LABELS[t])}</td><td style="text-align:center" class="text-mono">${(GLOBAL_SCORE_WEIGHTS[t] * 100).toFixed(0)}%</td></tr>`
        ).join("")}
      </tbody>
    </table>

    <p class="text-muted" style="margin-top:4mm;">Les poids refl\u00e8tent l\u2019importance strat\u00e9gique de chaque dimension pour la visibilit\u00e9 digitale en 2025-2026, avec une pond\u00e9ration renforc\u00e9e sur le GEO (25%) pour anticiper l\u2019impact de l\u2019IA g\u00e9n\u00e9rative sur la recherche.</p>

    ${renderPageFooter(ref, 23)}
  </div>
</div>`;
}

// ─── CLOSING ───

function renderClosing(data: UltraAuditData): string {
  const { audit, themeScores, actions } = data;
  const globalScore = computeGlobalScore(themeScores);
  const ref = audit.reference ?? `AUDIT-${new Date(audit.created_at).getFullYear()}`;

  return `<div class="page cover" style="height:297mm; justify-content:center;">
  <div class="cover-top-bar"></div>
  <div style="padding: 60mm 28mm; text-align:center;">
    <div class="cover-eyebrow" style="text-align:center;">MCVA Consulting SA</div>
    <div style="font-family:'General Sans','Helvetica Neue',sans-serif; font-size:14pt; font-weight:300; color:var(--cream); margin-top:10mm; line-height:1.8;">
      Score global : <strong style="color:white; font-size:18pt;">${globalScore}/100</strong><br>
      ${actions.length} points d\u2019am\u00e9lioration \u00B7 3 phases \u00B7 Impact mesurable
    </div>
    <div style="margin-top:15mm; font-size:10pt; color:var(--beige); font-style:italic;">
      \u00AB L\u2019IA ne remplace pas votre vision. Elle l\u2019amplifie. \u00BB
    </div>
    <div style="margin-top:20mm; font-size:8pt; color:var(--gray-400);">
      Chemin des Cr\u00eates 7 \u2014 1997 Haute-Nendaz \u00B7 Valais \u00B7 Suisse<br>
      +41 79 612 38 79 \u00B7 mcva.ch<br><br>
      ${esc(ref)} \u00B7 Confidentiel
    </div>
  </div>
</div>`;
}

// ─── Main render function ───

export function renderUltraAuditPdf(data: UltraAuditData): string {
  const pages = ULTRA_SECTIONS.map((section) => section.render(data));

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>${PDF_STYLES}
${ULTRA_EXTRA_STYLES}</style>
</head>
<body>
  ${pages.filter(Boolean).join("\n")}
</body>
</html>`;
}
