/**
 * PDF Template Renderer
 * Takes audit data and produces a full HTML string ready for Puppeteer.
 */
import { PDF_STYLES } from "./styles";
import type { Audit, AuditScores, AuditItem, AuditAction } from "@/types/audit";

// ─── Types ───

export interface PdfRenderData {
  audit: Audit;
  scores: AuditScores;
  items: AuditItem[];
  actions: AuditAction[];
  benchmarkRanking?: BenchmarkRankingData;
}

interface BenchmarkRankingData {
  benchmarkName: string;
  geographicScope: string;
  subCategory: string;
  domains: Array<{
    domain: string;
    rank_seo: number | null;
    rank_geo: number | null;
    score_seo: number | null;
    score_geo: number | null;
  }>;
  clientDomain: string;
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
  if (status === "pass") return "✓";
  if (status === "partial") return "~";
  return "✗";
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

const CORE_EEAT_LABELS: Record<string, string> = {
  C: "Clarté contextuelle",
  O: "Optimisation",
  R: "Réputation",
  E: "Engagement",
  Exp: "Expérience",
  Ept: "Expertise",
  A: "Autorité",
  T: "Confiance",
};

const CITE_LABELS: Record<string, string> = {
  C: "Crédibilité",
  I: "Influence",
  T: "Confiance (Trust)",
  E: "Engagement",
};

const PRIORITY_LABELS: Record<string, string> = {
  P1: "CRITIQUE",
  P2: "IMPORTANT",
  P3: "RECOMMANDÉ",
  P4: "OPTIMISATION",
};

const CATEGORY_LABELS: Record<string, string> = {
  technique: "Technique",
  contenu: "Contenu",
  GEO: "GEO / IA",
  notoriete: "Notoriété",
  SEO: "SEO",
};

// ─── Template functions ───

function renderCover(audit: Audit, scores: AuditScores): string {
  const date = formatDate(audit.created_at);
  const isExpress = audit.audit_type === "express";
  const typeLabel = isExpress ? "Pré-Audit SEO / GEO" : "Audit Complet SEO / GEO";

  return `
    <div class="page-cover">
      <div class="cover">
        <div class="cover-bar"></div>
        <div class="cover-eyebrow">MCVA CONSULTING SA</div>
        <div class="cover-title">${esc(typeLabel)}</div>
        <div class="cover-client">${esc(audit.domain)}</div>
        <div class="cover-domains">
          SEO · GEO${!isExpress ? " · Performance · Accessibilité · Technique · Contenu" : ""}
        </div>
        <div class="cover-footer">
          <div class="cover-footer-left">MCVA Consulting SA — Confidentiel</div>
          <div class="cover-footer-right">${date}</div>
        </div>
      </div>
    </div>`;
}

function renderPageFooter(ref: string): string {
  return `<div class="page-footer">
    <span>MCVA Consulting SA — ${esc(ref)} — Confidentiel</span>
    <span></span>
  </div>`;
}

function renderSpaDisclaimer(isSpa: boolean): string {
  if (!isSpa) return "";
  return `
    <div class="finding finding-warn" style="margin-bottom: 16px;">
      <div class="finding-tag">LIMITATION TECHNIQUE DÉTECTÉE</div>
      <p>Ce site utilise un rendu JavaScript côté client (SPA/Wix). Les scores reflètent la visibilité réelle pour les moteurs de recherche et les modèles d'IA. Certains scores peuvent être sous-estimés.</p>
    </div>`;
}

function renderScoresPage(data: PdfRenderData): string {
  const { audit, scores, items } = data;
  const date = formatDate(audit.created_at);
  const isExpress = audit.audit_type === "express";
  const ref = `${audit.domain} — ${date}`;
  const coreEeatDims = ["C", "O", "R", "E", "Exp", "Ept", "A", "T"];
  const citeDims = ["C", "I", "T", "E"];
  const hasCite = Object.keys(scores.score_cite || {}).length > 0;

  return `
    <div class="page">
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">01</div>
        <div class="section-title">Synthèse des scores</div>
        <div class="section-subtitle">${esc(audit.domain)} · ${isExpress ? "Express" : "Complet"}</div>
      </div>

      ${renderSpaDisclaimer(audit.is_spa)}

      <div class="scores-row">
        <div class="score-badge">
          <div class="score-badge-value ${scoreClass(scores.score_seo)}">${scores.score_seo}</div>
          <div class="score-badge-label">Score SEO</div>
        </div>
        <div class="score-badge">
          <div class="score-badge-value ${scoreClass(scores.score_geo)}">${scores.score_geo}</div>
          <div class="score-badge-label">Score GEO</div>
        </div>
      </div>

      <h2>Dimensions CORE-EEAT</h2>
      <table>
        <thead><tr><th>Dim</th><th>Libellé</th><th style="text-align:right">Score</th><th style="text-align:right">Qualité</th></tr></thead>
        <tbody>
          ${coreEeatDims
            .map((dim) => {
              const s = scores.score_core_eeat[dim] ?? 0;
              return `<tr>
                <td><strong style="color:var(--red)">${dim}</strong></td>
                <td>${CORE_EEAT_LABELS[dim] || dim}</td>
                <td style="text-align:right" class="${scoreClass(s)}"><strong>${s}</strong></td>
                <td style="text-align:right" class="${scoreClass(s)}">${scoreLabel(s)}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>

      ${
        hasCite
          ? `<h2>Dimensions CITE</h2>
      <table>
        <thead><tr><th>Dim</th><th>Libellé</th><th style="text-align:right">Score</th><th style="text-align:right">Qualité</th></tr></thead>
        <tbody>
          ${citeDims
            .map((dim) => {
              const s = scores.score_cite[dim] ?? 0;
              return `<tr>
                <td><strong style="color:var(--red)">${dim}</strong></td>
                <td>${CITE_LABELS[dim] || dim}</td>
                <td style="text-align:right" class="${scoreClass(s)}"><strong>${s}</strong></td>
                <td style="text-align:right" class="${scoreClass(s)}">${scoreLabel(s)}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`
          : ""
      }

      ${
        isExpress
          ? `<div class="callout mt-4">
        <strong style="color:var(--red)">Passez à l'audit complet</strong><br>
        <span class="text-sm text-gray">80 critères CORE-EEAT + 40 critères CITE + plan d'action priorisé + benchmark concurrentiel.</span>
      </div>`
          : ""
      }

      ${renderPageFooter(ref)}
    </div>`;
}

function renderItemsPage(
  data: PdfRenderData,
  framework: "core_eeat" | "cite",
  sectionNum: string,
  title: string
): string {
  const { audit, items } = data;
  const ref = `${audit.domain} — ${formatDate(audit.created_at)}`;
  const fwItems = items.filter((i) => i.framework === framework);
  if (fwItems.length === 0) return "";

  return `
    <div class="page">
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">${sectionNum}</div>
        <div class="section-title">${title}</div>
        <div class="section-subtitle">${fwItems.length} critères évalués</div>
      </div>

      <table>
        <thead><tr><th>Code</th><th>Critère</th><th style="text-align:center">Statut</th><th style="text-align:right">Score</th></tr></thead>
        <tbody>
          ${fwItems
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
      </table>

      ${renderPageFooter(ref)}
    </div>`;
}

function renderActionsPage(data: PdfRenderData): string {
  const { audit, actions } = data;
  if (actions.length === 0) return "";
  const ref = `${audit.domain} — ${formatDate(audit.created_at)}`;

  const byPriority = (p: string) => actions.filter((a) => a.priority === p);
  const totalImpact = actions.reduce((s, a) => s + a.impact_points, 0);

  return `
    <div class="page">
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">04</div>
        <div class="section-title">Plan d'action</div>
        <div class="section-subtitle">${actions.length} actions · +${totalImpact} points potentiels</div>
      </div>

      <div class="scores-row">
        ${(["P1", "P2", "P3", "P4"] as const)
          .map((p) => {
            const count = byPriority(p).length;
            return `<div class="score-badge">
            <div class="score-badge-value" style="color:${p === "P1" ? "var(--crit-red)" : p === "P2" ? "var(--orange)" : "var(--gray-600)"}">${count}</div>
            <div class="score-badge-label">${PRIORITY_LABELS[p]}</div>
          </div>`;
          })
          .join("")}
        <div class="score-badge">
          <div class="score-badge-value score-green">+${totalImpact}</div>
          <div class="score-badge-label">Points potentiels</div>
        </div>
      </div>

      ${actions
        .map(
          (a) => `
        <div class="finding no-break" style="border-left-color: ${a.priority === "P1" ? "var(--crit-red)" : a.priority === "P2" ? "var(--orange)" : "var(--gray-400)"}">
          <div class="finding-tag" style="color: ${a.priority === "P1" ? "var(--crit-red)" : a.priority === "P2" ? "var(--orange)" : "var(--gray-600)"}">${a.priority} · ${CATEGORY_LABELS[a.category] || a.category}</div>
          <strong>${esc(a.title)}</strong>
          <p class="text-sm" style="margin-top:3px">${esc(a.description)}</p>
          <p class="text-xs text-gray" style="margin-top:4px">Impact : +${a.impact_points} pts · Effort : ${esc(a.effort)}</p>
        </div>`
        )
        .join("")}

      ${renderPageFooter(ref)}
    </div>`;
}

function renderBenchmarkPage(data: PdfRenderData): string {
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
        <div class="section-number">05</div>
        <div class="section-title">Positionnement concurrentiel</div>
        <div class="section-subtitle">${esc(benchmarkRanking.benchmarkName)} · ${esc(benchmarkRanking.geographicScope)}</div>
      </div>

      <table>
        <thead><tr><th>#</th><th>Domaine</th><th style="text-align:center">SEO</th><th style="text-align:center">GEO</th><th style="text-align:center">Rang SEO</th><th style="text-align:center">Rang GEO</th></tr></thead>
        <tbody>
          ${sorted
            .map((d) => {
              const isClient = d.domain === benchmarkRanking.clientDomain;
              const bold = isClient ? "font-bold" : "";
              const bg = isClient ? 'style="background:var(--gray-100);border-left:3px solid var(--red)"' : "";
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

function renderClosingPage(scores: AuditScores): string {
  const globalScore = Math.round((scores.score_seo + scores.score_geo) / 2);
  return `
    <div class="page-closing">
      <div class="closing">
        <div class="closing-score">${globalScore}<span style="font-size:24pt;opacity:0.6">/100</span></div>
        <div class="closing-label">Score global</div>
        <div class="closing-tagline">L'IA ne remplace pas votre vision.<br>Elle l'amplifie.</div>
        <div class="closing-footer">MCVA Consulting SA · mcva.ch · info@mcva.ch</div>
      </div>
    </div>`;
}

// ─── Main render function ───

export function renderAuditPdf(data: PdfRenderData): string {
  const { audit, scores, actions, benchmarkRanking } = data;
  const isExpress = audit.audit_type === "express";

  const pages = [
    renderCover(audit, scores),
    renderScoresPage(data),
    renderItemsPage(data, "core_eeat", "02", "Critères CORE-EEAT"),
    renderItemsPage(data, "cite", "03", "Critères CITE"),
    ...(!isExpress && actions.length > 0 ? [renderActionsPage(data)] : []),
    ...(!isExpress && benchmarkRanking ? [renderBenchmarkPage(data)] : []),
    renderClosingPage(scores),
  ];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>${PDF_STYLES}</style>
</head>
<body>
  ${pages.join("\n")}
</body>
</html>`;
}
