/**
 * LLM Watch — PDF Report Template
 * Generates a branded Score GEO report for a client's monitoring data.
 */

import { PDF_STYLES } from "./styles";

// ─── Types ───

export interface LlmWatchPdfData {
  client: {
    name: string;
    sector: string;
    location: string;
    domain: string;
  };
  score: {
    scoreGeo: number;
    scorePresence: number;
    scoreExactitude: number;
    scoreSentiment: number;
    scoreRecommendation: number;
    citationRate: number;
    totalResponses: number;
    weekStart: string;
  };
  scoreByLlm: Record<string, number | null>; // LW-003: null = unavailable
  scoreByLang: Record<string, number> | null;
  history: { weekStart: string; score: number }[];
  queryResults: {
    queryText: string;
    results: {
      llm: string;
      cited: boolean;
      isRecommended: boolean;
      sentiment: string;
      snippet: string;
    }[];
  }[];
  competitors: { name: string; score: number }[];
  generatedAt: string;
}

// ─── Helpers ───

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreClass(score: number): string {
  if (score >= 60) return "score-green";
  if (score >= 35) return "score-orange";
  return "score-red";
}

function geoTier(score: number): string {
  if (score <= 25) return "Invisible";
  if (score <= 50) return "Emergent";
  if (score <= 75) return "Visible";
  return "Leader";
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("fr-CH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function sentimentIcon(s: string): string {
  if (s === "positive") return "&#9650;"; // ▲
  if (s === "negative") return "&#9660;"; // ▼
  return "&#9644;"; // ▬
}

function sentimentColor(s: string): string {
  if (s === "positive") return "var(--green)";
  if (s === "negative") return "var(--crit-red)";
  return "var(--gray-600)";
}

const LLM_LABELS: Record<string, string> = {
  openai: "GPT-4o",
  anthropic: "Claude",
  perplexity: "Perplexity",
  gemini: "Gemini",
};

// ─── Extra CSS ───

const LLMWATCH_STYLES = `
.gauge-container { display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; margin: 16px 0; }
.gauge-card {
  min-width: 28mm; padding: 10px 14px; text-align: center;
  border: 1px solid var(--gray-200); border-radius: 6px; background: var(--gray-50);
}
.gauge-value { font-size: 26pt; font-weight: 800; line-height: 1.1; }
.gauge-max { font-size: 10pt; font-weight: 400; color: var(--gray-400); }
.gauge-label { font-size: 7pt; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }

.llm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 12px 0; }
.llm-card {
  padding: 10px 12px; border: 1px solid var(--gray-200); border-radius: 4px;
  display: flex; justify-content: space-between; align-items: center;
}
.llm-name { font-size: 9pt; font-weight: 600; }
.llm-score { font-size: 18pt; font-weight: 800; }

.history-bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 60px; margin: 12px 0; }
.history-bar {
  flex: 1; background: var(--red); border-radius: 2px 2px 0 0;
  min-width: 12px; position: relative;
}
.history-bar-label {
  position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
  font-size: 6pt; color: var(--gray-400); white-space: nowrap;
}
.history-bar-value {
  position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
  font-size: 7pt; font-weight: 600; color: var(--gray-800);
}

.query-block { margin: 10px 0; page-break-inside: avoid; }
.query-text {
  font-size: 8.5pt; font-weight: 600; color: var(--black);
  padding: 4px 0; border-bottom: 1px solid var(--gray-200); margin-bottom: 6px;
}

.result-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 8pt; }
.result-llm { font-weight: 600; min-width: 22mm; }
.result-badge {
  padding: 1px 6px; border-radius: 3px; font-size: 7pt; font-weight: 600;
}
.badge-cited { background: rgba(45,122,79,0.12); color: var(--green); }
.badge-not-cited { background: rgba(204,34,0,0.08); color: var(--crit-red); }
.badge-reco { background: rgba(45,122,79,0.12); color: var(--green); }

.competitor-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--gray-100); }
.competitor-name { flex: 1; font-size: 8.5pt; font-weight: 500; }
.competitor-bar-bg { flex: 2; height: 8px; background: var(--gray-100); border-radius: 4px; overflow: hidden; }
.competitor-bar { height: 100%; background: var(--gray-400); border-radius: 4px; }
.competitor-bar.is-client { background: var(--red); }
.competitor-score { font-size: 8pt; font-weight: 700; min-width: 10mm; text-align: right; }
`;

// ─── Sections ───

function renderCover(data: LlmWatchPdfData): string {
  return `
  <div class="page-cover">
    <div class="cover">
      <div class="cover-bar"></div>
      <div class="cover-eyebrow">Score GEO&trade; &mdash; Rapport de monitoring</div>
      <div class="cover-title">${esc(data.client.name)}</div>
      <div class="cover-client">${esc(data.client.sector)} &mdash; ${esc(data.client.location)}</div>
      <div class="cover-domains">
        ${esc(data.client.domain)}<br>
        Semaine du ${formatDate(data.score.weekStart)}<br>
        ${data.score.totalResponses} reponses analysees sur ${Object.values(data.scoreByLlm).filter((v) => v !== null).length}/${Object.keys(data.scoreByLlm).length} LLMs
      </div>
      <div class="cover-footer">
        <div class="cover-footer-left">MCVA Consulting SA &mdash; mcva.ch</div>
        <div class="cover-footer-right">${formatDate(data.generatedAt)}</div>
      </div>
    </div>
  </div>`;
}

function renderScorePage(data: LlmWatchPdfData): string {
  const s = data.score;
  return `
  <div class="page">
    <div class="section-header">
      <div class="section-header-bar"></div>
      <div class="section-number">01</div>
      <div class="section-title">Score GEO&trade; Global</div>
      <div class="section-subtitle">Visibilite de la marque dans les reponses des IA</div>
    </div>

    <!-- Main score -->
    <div style="text-align: center; margin: 20px 0 8px 0;">
      <span class="${scoreClass(s.scoreGeo)}" style="font-size: 56pt; font-weight: 900;">${Math.round(s.scoreGeo)}</span>
      <span style="font-size: 20pt; color: var(--gray-400);">/100</span>
    </div>
    <div style="text-align: center; font-size: 10pt; color: var(--gray-600); margin-bottom: 24px;">
      Niveau : <strong>${geoTier(s.scoreGeo)}</strong> &mdash;
      Taux de citation : <strong>${Math.min(100, Math.round(s.citationRate * 100))}%</strong>
    </div>

    <!-- 4 components -->
    <div class="gauge-container">
      <div class="gauge-card">
        <div class="gauge-value ${scoreClass(s.scorePresence * 4)}">${s.scorePresence.toFixed(1)}<span class="gauge-max">/25</span></div>
        <div class="gauge-label">Presence</div>
      </div>
      <div class="gauge-card">
        <div class="gauge-value ${scoreClass(s.scoreExactitude * 4)}">${s.scoreExactitude.toFixed(1)}<span class="gauge-max">/25</span></div>
        <div class="gauge-label">Exactitude</div>
      </div>
      <div class="gauge-card">
        <div class="gauge-value ${scoreClass(s.scoreSentiment * 4)}">${s.scoreSentiment.toFixed(1)}<span class="gauge-max">/25</span></div>
        <div class="gauge-label">Sentiment</div>
      </div>
      <div class="gauge-card">
        <div class="gauge-value ${scoreClass(s.scoreRecommendation * 4)}">${s.scoreRecommendation.toFixed(1)}<span class="gauge-max">/25</span></div>
        <div class="gauge-label">Recommandation</div>
      </div>
    </div>

    <!-- Score by LLM (LW-003: show unavailable LLMs explicitly) -->
    <h2>Score par LLM</h2>
    <p style="font-size: 7.5pt; color: var(--gray-600); margin-bottom: 8px;">
      Score moyen sur ${Object.values(data.scoreByLlm).filter((v) => v !== null).length} LLMs disponibles sur ${Object.keys(data.scoreByLlm).length} monitores
    </p>
    <div class="llm-grid">
      ${Object.entries(data.scoreByLlm)
        .sort(([, a], [, b]) => (b ?? -1) - (a ?? -1))
        .map(
          ([llm, score]) => `
        <div class="llm-card" ${score === null ? 'style="opacity: 0.5; border-style: dashed;"' : ""}>
          <span class="llm-name">${esc(LLM_LABELS[llm] || llm)}</span>
          ${score !== null
            ? `<span class="llm-score ${scoreClass(score)}">${Math.round(score)}</span>`
            : `<span style="font-size: 8pt; color: var(--gray-400);">Non disponible</span>`
          }
        </div>`
        )
        .join("")}
    </div>

    ${data.history.length > 1 ? `
    <!-- History chart -->
    <h2>Evolution</h2>
    <div class="history-bar-chart">
      ${data.history
        .slice(-12)
        .map((h) => {
          const pct = Math.max(5, h.score);
          const date = h.weekStart.slice(5); // MM-DD
          return `<div class="history-bar" style="height: ${pct}%;">
            <span class="history-bar-value">${Math.round(h.score)}</span>
            <span class="history-bar-label">${date}</span>
          </div>`;
        })
        .join("")}
    </div>` : ""}

    <div class="page-footer">
      <span>MCVA Consulting SA &mdash; Score GEO&trade;</span>
      <span>${esc(data.client.name)} &mdash; ${formatDate(data.generatedAt)}</span>
    </div>
  </div>`;
}

function renderQueryResultsPage(data: LlmWatchPdfData): string {
  if (!data.queryResults.length) return "";

  // Split into pages of ~4 queries each
  const perPage = 4;
  const pages: string[] = [];

  for (let i = 0; i < data.queryResults.length; i += perPage) {
    const chunk = data.queryResults.slice(i, i + perPage);
    const isFirst = i === 0;

    pages.push(`
    <div class="page">
      ${isFirst ? `
      <div class="section-header">
        <div class="section-header-bar"></div>
        <div class="section-number">02</div>
        <div class="section-title">Detail par requete</div>
        <div class="section-subtitle">${data.queryResults.length} requetes &mdash; ${Object.keys(data.scoreByLlm).length} LLMs par requete</div>
      </div>` : `<h2>Detail par requete (suite)</h2>`}

      ${chunk
        .map(
          (qr) => `
        <div class="query-block">
          <div class="query-text">&laquo; ${esc(qr.queryText)} &raquo;</div>
          ${qr.results
            .map(
              (r) => `
            <div class="result-row">
              <span class="result-llm">${esc(LLM_LABELS[r.llm] || r.llm)}</span>
              <span class="result-badge ${r.cited ? "badge-cited" : "badge-not-cited"}">
                ${r.cited ? "Cite" : "Non cite"}
              </span>
              ${r.isRecommended ? `<span class="result-badge badge-reco">Recommande</span>` : ""}
              <span style="color: ${sentimentColor(r.sentiment)}; font-size: 8pt;">
                ${sentimentIcon(r.sentiment)} ${r.sentiment}
              </span>
            </div>`
            )
            .join("")}
        </div>`
        )
        .join("")}

      <div class="page-footer">
        <span>MCVA Consulting SA &mdash; Score GEO&trade;</span>
        <span>${esc(data.client.name)} &mdash; ${formatDate(data.generatedAt)}</span>
      </div>
    </div>`);
  }

  return pages.join("");
}

function renderCompetitorsPage(data: LlmWatchPdfData): string {
  if (!data.competitors.length) return "";

  const maxScore = Math.max(
    data.score.scoreGeo,
    ...data.competitors.map((c) => c.score),
    1
  );

  // Merge client + competitors, sort desc
  const all = [
    { name: data.client.name, score: data.score.scoreGeo, isClient: true },
    ...data.competitors.map((c) => ({ ...c, isClient: false })),
  ].sort((a, b) => b.score - a.score);

  return `
  <div class="page">
    <div class="section-header">
      <div class="section-header-bar"></div>
      <div class="section-number">03</div>
      <div class="section-title">Benchmark concurrentiel</div>
      <div class="section-subtitle">Positionnement dans les reponses IA</div>
    </div>

    ${all
      .map(
        (entry, idx) => `
      <div class="competitor-row">
        <span style="font-size: 8pt; font-weight: 700; color: var(--gray-400); min-width: 6mm;">${idx + 1}</span>
        <span class="competitor-name" style="${entry.isClient ? "color: var(--red); font-weight: 700;" : ""}">${esc(entry.name)}</span>
        <div class="competitor-bar-bg">
          <div class="competitor-bar ${entry.isClient ? "is-client" : ""}" style="width: ${(entry.score / maxScore) * 100}%;"></div>
        </div>
        <span class="competitor-score ${scoreClass(entry.score)}">${Math.round(entry.score)}</span>
      </div>`
      )
      .join("")}

    <div class="page-footer">
      <span>MCVA Consulting SA &mdash; Score GEO&trade;</span>
      <span>${esc(data.client.name)} &mdash; ${formatDate(data.generatedAt)}</span>
    </div>
  </div>`;
}

function renderClosing(data: LlmWatchPdfData): string {
  return `
  <div class="page-closing">
    <div class="closing">
      <div class="closing-score ${scoreClass(data.score.scoreGeo)}">${Math.round(data.score.scoreGeo)}</div>
      <div class="closing-label">Score GEO&trade;</div>
      <div class="closing-tagline">
        ${geoTier(data.score.scoreGeo) === "Leader"
          ? "Votre marque domine les reponses IA. Maintenez cet avantage."
          : geoTier(data.score.scoreGeo) === "Visible"
            ? "Votre marque est presente dans les reponses IA. Consolidez votre position."
            : geoTier(data.score.scoreGeo) === "Emergent"
              ? "Votre visibilite IA progresse. Accelerez votre strategie GEO."
              : "Votre marque est invisible pour les IA. Agissez maintenant."}
      </div>
      <div class="closing-footer">MCVA Consulting SA &mdash; mcva.ch &mdash; ${formatDate(data.generatedAt)}</div>
    </div>
  </div>`;
}

// ─── Main Export ───

export function renderLlmWatchPdf(data: LlmWatchPdfData): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>${PDF_STYLES}${LLMWATCH_STYLES}</style>
</head>
<body>
  ${renderCover(data)}
  ${renderScorePage(data)}
  ${renderQueryResultsPage(data)}
  ${renderCompetitorsPage(data)}
  ${renderClosing(data)}
</body>
</html>`;
}
