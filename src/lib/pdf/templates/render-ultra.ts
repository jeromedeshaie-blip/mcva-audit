/**
 * Ultra Audit PDF Template Renderer
 * Produces a 20-25 page HTML document covering all 7 audit themes.
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

// ─── Types ───

export interface UltraAuditData extends PdfRenderData {
  /** Per-theme scores (already present in AuditScores but explicit here for clarity) */
  themeScores: Record<AuditTheme, number>;
  /** Optional client context for the Context section */
  clientContext?: {
    clientName?: string;
    objective?: string;
    scope?: string;
    sector?: string;
  };
}

// ─── Helpers ───

function scoreClass(score: number): string {
  if (score >= 75) return "score-green";
  if (score >= 50) return "score-orange";
  return "score-red";
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

function padSection(n: number): string {
  return String(n).padStart(2, "0");
}

const CORE_EEAT_LABELS: Record<string, string> = {
  C: "Clarte contextuelle",
  O: "Optimisation",
  R: "Reputation",
  E: "Engagement",
  Exp: "Experience",
  Ept: "Expertise",
  A: "Autorite",
  T: "Confiance",
};

const CITE_LABELS: Record<string, string> = {
  C: "Credibilite",
  I: "Influence",
  T: "Confiance (Trust)",
  E: "Engagement",
};

const PRIORITY_LABELS: Record<string, string> = {
  P1: "CRITIQUE",
  P2: "IMPORTANT",
  P3: "RECOMMANDE",
  P4: "OPTIMISATION",
};

const CATEGORY_LABELS: Record<string, string> = {
  technique: "Technique",
  contenu: "Contenu",
  GEO: "GEO / IA",
  notoriete: "Notoriete",
  SEO: "SEO",
};

// Map from AuditTheme to the Framework value used in AuditItem
const THEME_FRAMEWORK_MAP: Record<AuditTheme, string> = {
  seo: "core_eeat",
  geo: "cite",
  perf: "perf",
  a11y: "a11y",
  rgesn: "rgesn",
  tech: "tech",
  contenu: "contenu",
};

// ─── Global score calculation ───

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
}

function extractKeyFindings(
  items: AuditItem[],
  count: number = 3
): DimensionScore[] {
  const dimMap = new Map<string, { scores: number[]; theme: AuditTheme }>();

  for (const item of items) {
    const key = `${item.framework}::${item.dimension}`;
    if (!dimMap.has(key)) {
      // Resolve theme from framework
      const theme =
        (Object.entries(THEME_FRAMEWORK_MAP).find(
          ([, fw]) => fw === item.framework
        )?.[0] as AuditTheme) ?? "seo";
      dimMap.set(key, { scores: [], theme });
    }
    dimMap.get(key)!.scores.push(item.score);
  }

  const dimensions: DimensionScore[] = [];
  for (const [key, data] of dimMap) {
    const dimension = key.split("::")[1];
    const avg =
      data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    dimensions.push({
      theme: data.theme,
      dimension,
      avgScore: Math.round(avg),
      itemCount: data.scores.length,
    });
  }

  return dimensions.sort((a, b) => a.avgScore - b.avgScore).slice(0, count);
}

// ─── Template sections ───

function renderPageFooter(ref: string): string {
  return `<div class="page-footer">
    <span>MCVA Consulting SA — ${esc(ref)} — Confidentiel</span>
    <span></span>
  </div>`;
}

function renderCover(audit: Audit, themeScores: Record<AuditTheme, number>): string {
  const date = formatDate(audit.created_at);
  const themeList = (Object.keys(THEME_LABELS) as AuditTheme[])
    .map((t) => THEME_LABELS[t])
    .join(" \u00B7 ");

  return `
    <div class="page-cover">
      <div class="cover">
        <div class="cover-bar"></div>
        <div class="cover-eyebrow">MCVA CONSULTING SA</div>
        <div class="cover-title">Audit Digital Complet</div>
        <div class="cover-client">${esc(audit.domain)}</div>
        <div class="cover-domains">${esc(themeList)}</div>
        <div class="cover-footer">
          <div class="cover-footer-left">MCVA Consulting SA — Confidentiel</div>
          <div class="cover-footer-right">${date}</div>
        </div>
      </div>
    </div>`;
}

function renderExecutiveSynthesis(data: UltraAuditData): string {
  const { audit, items, themeScores } = data;
  const ref = `${audit.domain} — ${formatDate(audit.created_at)}`;
  const globalScore = computeGlobalScore(themeScores);
  const findings = extractKeyFindings(items, 3);

  return `
    <div class="page">
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">00</div>
        <div class="section-title">Synth\u00e8se ex\u00e9cutive</div>
        <div class="section-subtitle">${esc(audit.domain)} \u00B7 Ultra Audit</div>
      </div>

      <div class="scores-row">
        ${(Object.keys(THEME_LABELS) as AuditTheme[])
          .map(
            (theme) => `
          <div class="score-badge">
            <div class="score-badge-value ${scoreClass(themeScores[theme] ?? 0)}">${themeScores[theme] ?? 0}</div>
            <div class="score-badge-label">${esc(THEME_LABELS[theme])}</div>
          </div>`
          )
          .join("")}
      </div>

      <div class="callout-dark text-center" style="margin:20px 0;">
        <div style="font-size:36pt;font-weight:900;color:var(--white);line-height:1;">${globalScore}<span style="font-size:16pt;opacity:0.6">/100</span></div>
        <div style="font-size:8pt;color:var(--beige);letter-spacing:0.15em;text-transform:uppercase;margin-top:4px;">Score global pond\u00e9r\u00e9</div>
      </div>

      <h2>Constats cl\u00e9s</h2>
      ${findings
        .map(
          (f) => `
        <div class="finding finding-crit no-break">
          <div class="finding-tag">${esc(THEME_LABELS[f.theme])} \u00B7 ${esc(f.dimension)}</div>
          <strong>Score moyen : ${f.avgScore}/100</strong>
          <p class="text-sm" style="margin-top:3px">${f.itemCount} crit\u00e8re(s) \u00e9valu\u00e9(s) dans cette dimension \u2014 niveau <strong class="${scoreClass(f.avgScore)}">${scoreLabel(f.avgScore)}</strong>.</p>
        </div>`
        )
        .join("")}

      ${renderPageFooter(ref)}
    </div>`;
}

function renderContextPage(data: UltraAuditData): string {
  const { audit, clientContext } = data;
  const ref = `${audit.domain} — ${formatDate(audit.created_at)}`;

  const clientName = clientContext?.clientName ?? audit.brand_name ?? audit.domain;
  const objective =
    clientContext?.objective ??
    "Audit digital complet couvrant les 7 dimensions cl\u00e9s de la pr\u00e9sence en ligne.";
  const scope =
    clientContext?.scope ??
    `Domaine principal : ${audit.domain}. Toutes les th\u00e9matiques de l'Ultra Audit sont couvertes.`;
  const sector = clientContext?.sector ?? audit.sector ?? "Non sp\u00e9cifi\u00e9";

  return `
    <div class="page">
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">01</div>
        <div class="section-title">Contexte</div>
        <div class="section-subtitle">Client \u00B7 Objectif \u00B7 P\u00e9rim\u00e8tre</div>
      </div>

      <h2>Client</h2>
      <p><strong>${esc(clientName)}</strong></p>
      <p class="text-sm text-gray">Secteur : ${esc(sector)}</p>

      <h2>Objectif de l'audit</h2>
      <p>${esc(objective)}</p>

      <h2>P\u00e9rim\u00e8tre</h2>
      <p>${esc(scope)}</p>

      <h2>Th\u00e9matiques couvertes</h2>
      <table>
        <thead><tr><th>Th\u00e8me</th><th>Pond\u00e9ration</th><th style="text-align:right">Score</th></tr></thead>
        <tbody>
          ${(Object.keys(THEME_LABELS) as AuditTheme[])
            .map((t) => {
              const s = data.themeScores[t] ?? 0;
              const w = Math.round(GLOBAL_SCORE_WEIGHTS[t] * 100);
              return `<tr>
                <td><strong>${esc(THEME_LABELS[t])}</strong></td>
                <td>${w}%</td>
                <td style="text-align:right" class="${scoreClass(s)}"><strong>${s}</strong></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>

      ${renderPageFooter(ref)}
    </div>`;
}

// Generic theme section renderer with dimension sub-headers
function renderThemeSection(
  data: UltraAuditData,
  theme: AuditTheme,
  sectionNum: number,
  title: string,
  subtitle?: string
): string {
  const { audit, items, themeScores } = data;
  const ref = `${audit.domain} — ${formatDate(audit.created_at)}`;
  const framework = THEME_FRAMEWORK_MAP[theme];
  const themeItems = items.filter((i) => i.framework === framework);

  if (themeItems.length === 0) return "";

  // Group by dimension
  const dimGroups = new Map<string, AuditItem[]>();
  for (const item of themeItems) {
    const dim = item.dimension || "Autre";
    if (!dimGroups.has(dim)) dimGroups.set(dim, []);
    dimGroups.get(dim)!.push(item);
  }

  const themeScore = themeScores[theme] ?? 0;
  const sub =
    subtitle ??
    `${themeItems.length} crit\u00e8res \u00B7 Score ${themeScore}/100`;

  // Determine dimension labels based on theme
  const dimLabels =
    theme === "seo"
      ? CORE_EEAT_LABELS
      : theme === "geo"
        ? CITE_LABELS
        : ({} as Record<string, string>);

  let pages = "";

  // First page: section header + score badge + start of items
  pages += `
    <div class="page">
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">${padSection(sectionNum)}</div>
        <div class="section-title">${esc(title)}</div>
        <div class="section-subtitle">${esc(sub)}</div>
      </div>

      <div class="scores-row">
        <div class="score-badge">
          <div class="score-badge-value ${scoreClass(themeScore)}">${themeScore}</div>
          <div class="score-badge-label">${esc(THEME_LABELS[theme])}</div>
        </div>
      </div>

      ${Array.from(dimGroups.entries())
        .map(
          ([dim, dimItems]) => `
        <h3>${esc(dimLabels[dim] ? `${dim} \u2014 ${dimLabels[dim]}` : dim)}</h3>
        <table>
          <thead><tr><th>Code</th><th>Crit\u00e8re</th><th style="text-align:center">Statut</th><th style="text-align:right">Score</th></tr></thead>
          <tbody>
            ${dimItems
              .map(
                (item) => `<tr class="no-break">
                <td class="font-mono text-gray">${esc(item.item_code)}</td>
                <td>${esc(item.item_label)}</td>
                <td style="text-align:center" class="${scoreClass(item.score)}">${statusIcon(item.status)}</td>
                <td style="text-align:right" class="${scoreClass(item.score)}"><strong>${item.score}</strong></td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`
        )
        .join("")}

      ${renderPageFooter(ref)}
    </div>`;

  return pages;
}

function renderBenchmarkSection(data: UltraAuditData): string {
  const { audit, benchmarkRanking } = data;
  if (!benchmarkRanking || benchmarkRanking.domains.length === 0) return "";
  const ref = `${audit.domain} — ${formatDate(audit.created_at)}`;

  const sorted = [...benchmarkRanking.domains].sort(
    (a, b) => (a.rank_seo ?? 999) - (b.rank_seo ?? 999)
  );

  return `
    <div class="page">
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">09</div>
        <div class="section-title">Benchmark concurrentiel</div>
        <div class="section-subtitle">${esc(benchmarkRanking.benchmarkName)} \u00B7 ${esc(benchmarkRanking.geographicScope)}</div>
      </div>

      <table>
        <thead><tr><th>#</th><th>Domaine</th><th style="text-align:center">SEO</th><th style="text-align:center">GEO</th><th style="text-align:center">Rang SEO</th><th style="text-align:center">Rang GEO</th></tr></thead>
        <tbody>
          ${sorted
            .map((d) => {
              const isClient = d.domain === benchmarkRanking.clientDomain;
              const bold = isClient ? "font-bold" : "";
              const bg = isClient
                ? 'style="background:var(--gray-100);border-left:3px solid var(--red)"'
                : "";
              return `<tr ${bg}>
                <td class="${bold}">${d.rank_seo ?? "-"}</td>
                <td class="${bold}">${esc(d.domain)}</td>
                <td style="text-align:center" class="${scoreClass(d.score_seo ?? 0)} font-bold">${d.score_seo ?? "-"}</td>
                <td style="text-align:center" class="${scoreClass(d.score_geo ?? 0)} font-bold">${d.score_geo ?? "-"}</td>
                <td style="text-align:center">${d.rank_seo ?? "-"}/${sorted.length}</td>
                <td style="text-align:center">${d.rank_geo ?? "-"}/${sorted.length}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>

      ${renderPageFooter(ref)}
    </div>`;
}

function renderActionPlan(data: UltraAuditData): string {
  const { audit, actions } = data;
  if (actions.length === 0) return "";
  const ref = `${audit.domain} — ${formatDate(audit.created_at)}`;

  const phase1 = actions.filter((a) => a.priority === "P1");
  const phase2 = actions.filter((a) => a.priority === "P2");
  const phase3 = actions.filter(
    (a) => a.priority === "P3" || a.priority === "P4"
  );
  const totalImpact = actions.reduce((s, a) => s + a.impact_points, 0);

  function renderPhaseActions(phaseActions: AuditAction[]): string {
    if (phaseActions.length === 0)
      return '<tr><td colspan="4" class="text-sm text-gray" style="text-align:center;padding:8px;">Aucune action dans cette phase.</td></tr>';
    return phaseActions
      .map(
        (a) => `<tr class="no-break">
        <td class="font-mono text-gray">${esc(a.priority)}</td>
        <td>
          <strong>${esc(a.title)}</strong>
          <p class="text-xs text-gray" style="margin-top:2px">${esc(a.description)}</p>
        </td>
        <td style="text-align:center">${esc(CATEGORY_LABELS[a.category] || a.category)}</td>
        <td style="text-align:right" class="score-green"><strong>+${a.impact_points}</strong></td>
      </tr>`
      )
      .join("");
  }

  return `
    <div class="page">
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">10</div>
        <div class="section-title">Plan d'action</div>
        <div class="section-subtitle">${actions.length} actions \u00B7 +${totalImpact} points potentiels</div>
      </div>

      <div class="scores-row">
        <div class="score-badge">
          <div class="score-badge-value" style="color:var(--crit-red)">${phase1.length}</div>
          <div class="score-badge-label">Quick Wins (P1)</div>
        </div>
        <div class="score-badge">
          <div class="score-badge-value" style="color:var(--gray-800)">${phase2.length}</div>
          <div class="score-badge-label">Fondations (P2)</div>
        </div>
        <div class="score-badge">
          <div class="score-badge-value" style="color:var(--red)">${phase3.length}</div>
          <div class="score-badge-label">Acc\u00e9l\u00e9ration (P3-P4)</div>
        </div>
        <div class="score-badge">
          <div class="score-badge-value score-green">+${totalImpact}</div>
          <div class="score-badge-label">Points potentiels</div>
        </div>
      </div>

      <!-- Phase 1: Quick Wins -->
      <div class="no-break" style="margin-bottom:16px;">
        <div class="phase-header phase-1">Phase 1 \u2014 Quick Wins</div>
        <div class="phase-body">
          <table style="margin:0;">
            <thead><tr><th>P.</th><th>Action</th><th style="text-align:center">Cat\u00e9gorie</th><th style="text-align:right">Impact</th></tr></thead>
            <tbody>${renderPhaseActions(phase1)}</tbody>
          </table>
        </div>
      </div>

      <!-- Phase 2: Fondations -->
      <div class="no-break" style="margin-bottom:16px;">
        <div class="phase-header phase-2">Phase 2 \u2014 Fondations</div>
        <div class="phase-body">
          <table style="margin:0;">
            <thead><tr><th>P.</th><th>Action</th><th style="text-align:center">Cat\u00e9gorie</th><th style="text-align:right">Impact</th></tr></thead>
            <tbody>${renderPhaseActions(phase2)}</tbody>
          </table>
        </div>
      </div>

      <!-- Phase 3: Acceleration -->
      <div class="no-break" style="margin-bottom:16px;">
        <div class="phase-header phase-3">Phase 3 \u2014 Acc\u00e9l\u00e9ration</div>
        <div class="phase-body">
          <table style="margin:0;">
            <thead><tr><th>P.</th><th>Action</th><th style="text-align:center">Cat\u00e9gorie</th><th style="text-align:right">Impact</th></tr></thead>
            <tbody>${renderPhaseActions(phase3)}</tbody>
          </table>
        </div>
      </div>

      ${renderPageFooter(ref)}
    </div>`;
}

function renderClosingPage(themeScores: Record<AuditTheme, number>): string {
  const globalScore = computeGlobalScore(themeScores);
  return `
    <div class="page-closing">
      <div class="closing">
        <div class="closing-score">${globalScore}<span style="font-size:24pt;opacity:0.6">/100</span></div>
        <div class="closing-label">Score global</div>
        <div class="closing-tagline">L'IA ne remplace pas votre vision.<br>Elle l'amplifie.</div>
        <div class="closing-footer">MCVA Consulting SA \u00B7 mcva.ch \u00B7 info@mcva.ch</div>
      </div>
    </div>`;
}

// ─── Main render function ───

export function renderUltraAuditPdf(data: UltraAuditData): string {
  const { audit, themeScores } = data;

  const pages = [
    // 1. Cover
    renderCover(audit, themeScores),
    // 2. Executive synthesis
    renderExecutiveSynthesis(data),
    // 3. Context
    renderContextPage(data),
    // 4. SEO (CORE-EEAT)
    renderThemeSection(data, "seo", 2, "SEO", "Framework CORE-EEAT"),
    // 5. GEO (CITE)
    renderThemeSection(data, "geo", 3, "GEO / Score GEO\u2122", "Framework CITE"),
    // 6. Performance
    renderThemeSection(data, "perf", 4, "Performance"),
    // 7. Accessibility
    renderThemeSection(data, "a11y", 5, "Accessibilit\u00e9"),
    // 8. Eco-design RGESN
    renderThemeSection(data, "rgesn", 6, "\u00c9co-conception (RGESN)"),
    // 9. Technical
    renderThemeSection(data, "tech", 7, "Technique"),
    // 10. Content
    renderThemeSection(data, "contenu", 8, "Contenu"),
    // 11. Benchmark (conditional)
    renderBenchmarkSection(data),
    // 12. Action plan
    renderActionPlan(data),
    // 13. Closing
    renderClosingPage(themeScores),
  ];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>${PDF_STYLES}</style>
</head>
<body>
  ${pages.filter(Boolean).join("\n")}
</body>
</html>`;
}
