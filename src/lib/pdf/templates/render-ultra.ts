/**
 * Ultra Audit PDF Template Renderer
 * Produces a 10-page HTML document matching the golden ZP Ultra Audit template.
 * Covers: Cover, Synthèse, SEO, GEO×2, Perf+A11Y, Tech+Contenu, Benchmark, Plan d'action, Closing.
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

// ─── Extra CSS classes present in golden template but not in styles.ts ───

const ULTRA_EXTRA_STYLES = `
  .cover-top-bar { height: 4px; background: var(--red); width: 100%; }
  .cover-content { padding: 50mm 28mm 0 28mm; flex: 1; }
  .cover-footer-text { font-size: 8pt; color: var(--gray-400); line-height: 1.6; }
  .cover-ref { font-family: 'Poppins', monospace; font-size: 8pt; color: var(--gray-400); }

  .page-inner { padding: 18mm 22mm 20mm 22mm; }

  .lead { font-size: 10pt; font-weight: 400; color: var(--gray-800); line-height: 1.65; }

  .text-red { color: var(--red); }
  .text-green { color: var(--green); }
  .text-orange { color: var(--orange); }
  .text-crit { color: var(--crit-red); }
  .text-muted { color: var(--gray-600); font-size: 8pt; }
  .text-mono { font-family: 'Poppins', monospace; font-size: 8.5pt; }

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
    font-family: 'Poppins', monospace; font-size: 8pt; color: var(--beige);
    margin-top: 2mm; opacity: 0.7; letter-spacing: 0.03em;
  }

  .score-badge .num {
    font-family: 'Poppins', sans-serif; font-size: 22pt; font-weight: 800;
    line-height: 1; margin-bottom: 1mm;
  }
  .score-badge .lbl {
    font-family: 'Poppins', monospace; font-size: 6.5pt;
    color: var(--gray-600); letter-spacing: 0.03em;
  }
  .score-red .num { color: var(--crit-red); }
  .score-orange .num { color: var(--orange); }
  .score-green .num { color: var(--green); }

  .phase-header-dark { background: var(--black); }

  /* Override cover for golden template structure */
  .page.cover {
    background: linear-gradient(165deg, var(--black) 0%, var(--gradient-start) 50%, var(--dark-red) 100%);
    display: flex; flex-direction: column; justify-content: space-between; padding: 0;
    width: 210mm; overflow: hidden; page-break-after: always; position: relative;
  }
  .page.cover .cover-footer {
    padding: 12mm 28mm; border-top: 1px solid rgba(255,255,255,0.08);
    position: static; display: block;
  }

  p { margin-bottom: 2.5mm; text-align: justify; hyphens: auto; }
  h3 { color: var(--red); }
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

// ─── Page footer ───

function renderPageFooter(ref: string, pageNum: number): string {
  return `<div class="page-footer">
    <span>MCVA Consulting SA \u2014 ${esc(ref)} \u2014 Confidentiel</span>
    <span>${pageNum}</span>
  </div>`;
}

// ─── PAGE 1: COVER ───

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

// ─── PAGE 2: SYNTHÈSE EXÉCUTIVE ───

function renderSynthese(data: UltraAuditData): string {
  const { audit, items, themeScores } = data;
  const ref = audit.reference ?? audit.domain;
  const globalScore = computeGlobalScore(themeScores);
  const findings = extractKeyFindings(items, 3);
  const clientName =
    data.clientContext?.clientName ?? audit.brand_name ?? audit.domain;
  const totalActions = data.actions.length;

  // Dynamic lead paragraph
  const lead = `Le site <strong>${esc(audit.domain)}</strong> a fait l\u2019objet d\u2019un audit digital complet couvrant 7 dimensions. Le score global pond\u00e9r\u00e9 est de <strong class="text-red">${globalScore}/100</strong>. ${totalActions} actions d\u2019am\u00e9lioration ont \u00e9t\u00e9 identifi\u00e9es.`;

  // Score badges — use the golden template style with .num/.lbl
  const badges = THEME_ORDER.filter((t) => t !== "rgesn")
    .map((t) => {
      const s = themeScores[t] ?? 0;
      return `<div class="score-badge ${scoreColorClass(s)}"><div class="num">${s}</div><div class="lbl">${esc(SHORT_LABELS[t])}</div></div>`;
    })
    .join("");

  return `<div class="page">
  <div class="section-header">
    <div class="section-title">Synth\u00e8se ex\u00e9cutive</div>
    <div class="section-sub">Vue d\u2019ensemble \u00B7 Scores \u00B7 Constats cl\u00e9s</div>
  </div>
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

    ${renderPageFooter(ref, 2)}
  </div>
</div>`;
}

// ─── PAGE 3: AUDIT SEO ───

function renderSeoPage(data: UltraAuditData): string {
  const { audit, items, themeScores, semrushData } = data;
  const ref = audit.reference ?? audit.domain;
  const seoScore = themeScores.seo ?? 0;
  const seoItems = itemsByTheme(items, "seo");
  const dimGroups = groupByDimension(seoItems);

  // Group items into SEO subsections based on dimension codes
  let subsections = "";
  let subNum = 1;

  for (const [dim, dimItems] of dimGroups) {
    const dimAvg = Math.round(
      dimItems.reduce((s, i) => s + i.score, 0) / dimItems.length
    );
    subsections += `<h3>2.${subNum} ${esc(dim)}</h3>`;
    // Show worst findings compactly
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

  return `<div class="page">
  <div class="section-header">
    <div class="section-num">02</div>
    <div class="section-title">Audit SEO \u2014 R\u00e9f\u00e9rencement naturel</div>
    <div class="section-sub">${seoItems.length} crit\u00e8res \u00B7 Score ${seoScore}/100</div>
  </div>
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(seoScore)}" style="float:right; margin-left:4mm;"><div class="num">${seoScore}</div><div class="lbl">Score SEO</div></div>

    ${subsections}

    ${semrushSection}

    ${renderPageFooter(ref, 3)}
  </div>
</div>`;
}

// ─── PAGE 4: AUDIT GEO page 1 ───

function renderGeoPage1(data: UltraAuditData): string {
  const { audit, items, themeScores, qwairyData, scores } = data;
  const ref = audit.reference ?? audit.domain;
  const geoScore = themeScores.geo ?? 0;
  const geoItems = itemsByTheme(items, "geo");

  const hasQwairy = !!qwairyData;

  // KPI values — prefer qwairyData, else estimate from items/scores
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
    llmTable = `<h2>3.2 Distribution par LLM</h2>
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
    // Estimate from geoItems — group by dimension as proxy for LLM distribution
    const modelResults = data.scores.geo_data?.models_tested ?? [];
    if (modelResults.length > 0) {
      llmTable = `<h2>3.2 Distribution par LLM</h2>
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

  // Benchmark concurrentiel GEO — SOV competitors
  let benchmarkGeo = "";
  if (hasQwairy && qwairyData!.sov_competitors && qwairyData!.sov_competitors.length > 0) {
    benchmarkGeo = `<h2>3.3 Benchmark concurrentiel GEO</h2>
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
  } else if (data.scores.competitors && data.scores.competitors.length > 0) {
    benchmarkGeo = `<h2>3.3 Benchmark concurrentiel GEO</h2>
    <table class="tbl-compact">
      <thead><tr><th>Domaine</th><th style="text-align:center">Score GEO</th></tr></thead>
      <tbody>
        ${data.scores.competitors
          .map(
            (c) =>
              `<tr><td>${esc(c.domain)}</td><td style="text-align:center" class="text-mono ${scoreColorClass(c.score_geo ?? 0)}">${c.score_geo ?? "\u2014"}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>`;
  }

  return `<div class="page">
  <div class="section-header">
    <div class="section-num">03</div>
    <div class="section-title">Audit GEO \u2014 Score GEO\u2122</div>
    <div class="section-sub">Overview \u00B7 Distribution LLM \u00B7 Benchmark \u00B7 Th\u00e9matiques</div>
  </div>
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(geoScore)}" style="float:right; margin-left:4mm;"><div class="num">${geoScore}</div><div class="lbl">Score GEO\u2122</div></div>

    <p class="lead">Le Score GEO\u2122 mesure la citabilit\u00e9 d\u2019une entreprise par les IA g\u00e9n\u00e9ratives sur une \u00e9chelle de 0 \u00e0 100. <strong class="${scoreColorClass(geoScore)}">Score : ${geoScore}/100 (${scoreLabel(geoScore)}).</strong></p>

    <h2>3.1 Overview globale</h2>
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

    ${renderPageFooter(ref, 4)}
  </div>
</div>`;
}

// ─── PAGE 5: AUDIT GEO page 2 ───

function renderGeoPage2(data: UltraAuditData): string {
  const { audit, items, qwairyData } = data;
  const ref = audit.reference ?? audit.domain;
  const geoItems = itemsByTheme(items, "geo");
  const dimGroups = groupByDimension(geoItems);
  const hasQwairy = !!qwairyData;

  // 3.4 Analyse par thématique — from geo items grouped by dimension
  let thematicTable = "";
  if (dimGroups.size > 0) {
    thematicTable = `<h2>3.4 Analyse par th\u00e9matique</h2>
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

  // 3.5 Query Fan-Out (from geo items if available)
  let fanOut = "";
  const fanOutItems = geoItems.filter(
    (i) => i.item_code.includes("CITE") || i.dimension === "I"
  );
  if (fanOutItems.length > 0) {
    fanOut = `<h2>3.5 Query Fan-Out</h2>
    <p>Les LLMs d\u00e9composent les requ\u00eates en sous-requ\u00eates. Chaque sous-requ\u00eate est une opportunit\u00e9 de citation.</p>
    ${renderItemsTable(fanOutItems)}`;
  }

  // 3.6 Analyse des sources
  let sourcesSection = "";
  const sourceItems = geoItems.filter((i) => i.dimension === "C" || i.dimension === "T");
  if (sourceItems.length > 0) {
    sourcesSection = `<h2>3.6 Analyse des sources</h2>
    ${renderFindingsFromItems(sourceItems, 3)}`;
  }

  // 3.7-3.8 Social & Technique IA
  const socialItems = geoItems.filter((i) => i.dimension === "E");
  let socialTech = "";
  if (socialItems.length > 0) {
    socialTech = `<h2>3.7 \u2014 3.8 Social & Technique IA</h2>
    ${renderFindingsFromItems(socialItems, 3)}`;
  }

  // Mode A/B callout
  const modeCallout = hasQwairy
    ? `<div class="callout" style="margin-top:4mm;"><strong class="text-green">DONN\u00c9ES R\u00c9ELLES QWAIRY</strong> \u2014 Les KPIs ci-dessus proviennent de l\u2019analyse Qwairy sur ${qwairyData!.llms ?? "5"} LLMs et ${qwairyData!.prompts ?? "10"} prompts.</div>`
    : `<div class="callout" style="margin-top:4mm;"><strong class="text-red">Note :</strong> Cette section contient des estimations bas\u00e9es sur l\u2019analyse IA directe. Elle sera enrichie avec donn\u00e9es r\u00e9elles Qwairy (mention rate par LLM, query fan-out d\u00e9taill\u00e9, analyse sources compl\u00e8te).</div>`;

  return `<div class="page">
  <div class="page-inner">

    ${thematicTable}
    ${fanOut}
    ${sourcesSection}
    ${socialTech}
    ${modeCallout}

    ${renderPageFooter(ref, 5)}
  </div>
</div>`;
}

// ─── PAGE 6: PERFORMANCE & ACCESSIBILITÉ ───

function renderPerfA11yPage(data: UltraAuditData): string {
  const { audit, items, themeScores, scores } = data;
  const ref = audit.reference ?? audit.domain;
  const perfScore = themeScores.perf ?? 0;
  const a11yScore = themeScores.a11y ?? 0;
  const perfItems = itemsByTheme(items, "perf");
  const a11yItems = itemsByTheme(items, "a11y");

  // Core Web Vitals from scores.seo_data
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
      cwvTable = `<table>
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

  return `<div class="page">
  <div class="section-header">
    <div class="section-num">04</div>
    <div class="section-title">Performance & Accessibilit\u00e9</div>
    <div class="section-sub">Core Web Vitals \u00B7 WCAG 2.1 AA</div>
  </div>
  <div class="page-inner" style="padding-top:6mm;">

    <div class="scores-row" style="justify-content:flex-start;">
      <div class="score-badge ${scoreColorClass(perfScore)}"><div class="num">${perfScore}</div><div class="lbl">Performance</div></div>
      <div class="score-badge ${scoreColorClass(a11yScore)}"><div class="num">${a11yScore}</div><div class="lbl">Accessibilit\u00e9</div></div>
    </div>

    <h2>4.1 Core Web Vitals</h2>
    ${cwvTable || "<p class=\"text-muted\">Donn\u00e9es CWV non disponibles.</p>"}

    ${perfItems.length > 0 ? renderFindingsFromItems(perfItems, 3) : ""}

    <h2>5.1 Accessibilit\u00e9 WCAG 2.1 AA</h2>
    ${a11yItems.length > 0 ? renderItemsTable(a11yItems) : "<p class=\"text-muted\">Aucun crit\u00e8re d\u2019accessibilit\u00e9 \u00e9valu\u00e9.</p>"}

    ${renderPageFooter(ref, 6)}
  </div>
</div>`;
}

// ─── PAGE 7: TECHNIQUE & CONTENU ───

function renderTechContenuPage(data: UltraAuditData): string {
  const { audit, items, themeScores, scores } = data;
  const ref = audit.reference ?? audit.domain;
  const techScore = themeScores.tech ?? 0;
  const contenuScore = themeScores.contenu ?? 0;
  const techItems = itemsByTheme(items, "tech");
  const contenuItems = itemsByTheme(items, "contenu");

  // 6.1 Stack & hébergement — from scores.tech_data or seo_data
  let stackTable = "";
  const techChecks = scores.seo_data?.technical_checks;
  if (techChecks && techChecks.length > 0) {
    stackTable = `<h3>6.1 Stack & h\u00e9bergement</h3>
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

  // Tech findings
  const techFindings = techItems.length > 0 ? renderFindingsFromItems(techItems, 4) : "";

  // Contenu — separate into strong points and weak points
  const strongContent = contenuItems.filter((i) => i.score >= 65);
  const weakContent = contenuItems.filter((i) => i.score < 65);

  return `<div class="page">
  <div class="section-header">
    <div class="section-num">06</div>
    <div class="section-title">Technique & Contenu</div>
    <div class="section-sub">Infrastructure \u00B7 Qualit\u00e9 \u00e9ditoriale</div>
  </div>
  <div class="page-inner" style="padding-top:6mm;">

    <div class="scores-row" style="justify-content:flex-start;">
      <div class="score-badge ${scoreColorClass(techScore)}"><div class="num">${techScore}</div><div class="lbl">Technique</div></div>
      <div class="score-badge ${scoreColorClass(contenuScore)}"><div class="num">${contenuScore}</div><div class="lbl">Contenu</div></div>
    </div>

    ${stackTable}
    ${techFindings}

    ${strongContent.length > 0 ? `<h2>7.1 Points forts du contenu</h2>${renderFindingsFromItems(strongContent, 4)}` : ""}
    ${weakContent.length > 0 ? `<h2>7.2 Points faibles du contenu</h2>${renderFindingsFromItems(weakContent, 4)}` : ""}

    ${renderPageFooter(ref, 7)}
  </div>
</div>`;
}

// ─── PAGE 8: BENCHMARK ───

function renderBenchmarkPage(data: UltraAuditData): string {
  const { audit, benchmarkRanking, scores, semrushData } = data;
  const ref = audit.reference ?? audit.domain;

  // Benchmark from ranking data
  if (benchmarkRanking && benchmarkRanking.domains.length > 0) {
    const sorted = [...benchmarkRanking.domains].sort(
      (a, b) => (a.rank_seo ?? 999) - (b.rank_seo ?? 999)
    );

    return `<div class="page">
  <div class="section-header">
    <div class="section-num">08</div>
    <div class="section-title">Benchmark concurrentiel</div>
    <div class="section-sub">${esc(benchmarkRanking.benchmarkName)} \u00B7 ${esc(benchmarkRanking.geographicScope)}</div>
  </div>
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

    ${renderPageFooter(ref, 8)}
  </div>
</div>`;
  }

  // Fallback: Semrush competitors or scores.competitors
  const competitors = semrushData?.competitors ?? [];
  const scoreCompetitors = scores.competitors ?? [];

  if (competitors.length === 0 && scoreCompetitors.length === 0) {
    return `<div class="page">
  <div class="section-header">
    <div class="section-num">08</div>
    <div class="section-title">Benchmark concurrentiel</div>
    <div class="section-sub">${esc(audit.domain)}</div>
  </div>
  <div class="page-inner" style="padding-top:6mm;">
    <p class="text-muted">Aucune donn\u00e9e de benchmark disponible. Lancez un benchmark pour g\u00e9n\u00e9rer cette section.</p>
    ${renderPageFooter(ref, 8)}
  </div>
</div>`;
  }

  if (competitors.length > 0) {
    return `<div class="page">
  <div class="section-header">
    <div class="section-num">08</div>
    <div class="section-title">Benchmark concurrentiel</div>
    <div class="section-sub">Donn\u00e9es Semrush</div>
  </div>
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
    ${renderPageFooter(ref, 8)}
  </div>
</div>`;
  }

  // scoreCompetitors fallback
  return `<div class="page">
  <div class="section-header">
    <div class="section-num">08</div>
    <div class="section-title">Benchmark concurrentiel</div>
    <div class="section-sub">${esc(audit.domain)}</div>
  </div>
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
    ${renderPageFooter(ref, 8)}
  </div>
</div>`;
}

// ─── PAGE 9: PLAN D'ACTION ───

function renderActionPlan(data: UltraAuditData): string {
  const { audit, actions } = data;
  const ref = audit.reference ?? audit.domain;

  if (actions.length === 0) {
    return `<div class="page">
  <div class="section-header">
    <div class="section-num">09</div>
    <div class="section-title">Plan d\u2019action \u2014 3 phases</div>
    <div class="section-sub">Quick Wins \u00B7 Fondations \u00B7 Acc\u00e9l\u00e9ration</div>
  </div>
  <div class="page-inner" style="padding-top:6mm;">
    <p class="text-muted">Aucune action g\u00e9n\u00e9r\u00e9e.</p>
    ${renderPageFooter(ref, 9)}
  </div>
</div>`;
  }

  const phase1 = actions.filter((a) => a.priority === "P1");
  const phase2 = actions.filter((a) => a.priority === "P2");
  const phase3 = actions.filter(
    (a) => a.priority === "P3" || a.priority === "P4"
  );

  function impactStars(points: number): string {
    if (points >= 8) return stars(5);
    if (points >= 6) return stars(4);
    if (points >= 4) return stars(3);
    if (points >= 2) return stars(2);
    return stars(1);
  }

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

  return `<div class="page">
  <div class="section-header">
    <div class="section-num">09</div>
    <div class="section-title">Plan d\u2019action \u2014 3 phases</div>
    <div class="section-sub">Quick Wins \u00B7 Fondations \u00B7 Acc\u00e9l\u00e9ration</div>
  </div>
  <div class="page-inner" style="padding-top:6mm;">

    <div class="phase-header">Phase 1 \u2014 Quick Wins (0-4 semaines)</div>
    <table class="tbl-compact" style="margin-top:0;">
      <thead><tr><th>#</th><th>Action</th><th>SEO</th><th>GEO</th><th>Effort</th></tr></thead>
      <tbody>${renderPhaseRows(phase1, "1")}</tbody>
    </table>

    <div class="phase-header phase-header-dark" style="margin-top:4mm;">Phase 2 \u2014 Fondations (1-3 mois)</div>
    <table class="tbl-compact" style="margin-top:0;">
      <thead><tr><th>#</th><th>Action</th><th>SEO</th><th>GEO</th><th>Effort</th></tr></thead>
      <tbody>${renderPhaseRows(phase2, "2")}</tbody>
    </table>

    <div class="phase-header" style="margin-top:4mm; background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));">Phase 3 \u2014 Acc\u00e9l\u00e9ration (3-6 mois)</div>
    <table class="tbl-compact" style="margin-top:0;">
      <thead><tr><th>#</th><th>Action</th><th>SEO</th><th>GEO</th><th>Effort</th></tr></thead>
      <tbody>${renderPhaseRows(phase3, "3")}</tbody>
    </table>

    ${renderPageFooter(ref, 9)}
  </div>
</div>`;
}

// ─── PAGE 10: CLOSING ───

function renderClosing(data: UltraAuditData): string {
  const { audit, themeScores, actions } = data;
  const globalScore = computeGlobalScore(themeScores);
  const ref = audit.reference ?? `AUDIT-${new Date(audit.created_at).getFullYear()}`;

  return `<div class="page cover" style="height:297mm; justify-content:center;">
  <div class="cover-top-bar"></div>
  <div style="padding: 60mm 28mm; text-align:center;">
    <div class="cover-eyebrow" style="text-align:center;">MCVA Consulting SA</div>
    <div style="font-family:'Poppins',sans-serif; font-size:14pt; font-weight:300; color:var(--cream); margin-top:10mm; line-height:1.8;">
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
  const pages = [
    renderCover(data),          // Page 1
    renderSynthese(data),       // Page 2
    renderSeoPage(data),        // Page 3
    renderGeoPage1(data),       // Page 4
    renderGeoPage2(data),       // Page 5
    renderPerfA11yPage(data),   // Page 6
    renderTechContenuPage(data),// Page 7
    renderBenchmarkPage(data),  // Page 8
    renderActionPlan(data),     // Page 9
    renderClosing(data),        // Page 10
  ];

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
