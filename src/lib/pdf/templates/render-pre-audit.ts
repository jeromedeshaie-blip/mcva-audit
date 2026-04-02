/**
 * Pre-Audit PDF Template Renderer
 * Compact 1-2 page "free hook" PDF to upsell clients to full audit.
 *
 * Structure:
 *  1. Dark header banner (mini cover)
 *  2. Large central score badge
 *  3. 5 key findings (3 worst + 2 best)
 *  4. 5 Quick Wins (highest impact actions)
 *  5. CTA callout box with pricing
 *  6. MCVA footer
 */
import { PDF_STYLES } from "./styles";
import type {
  Audit,
  AuditScores,
  AuditItem,
  AuditAction,
  AuditTheme,
} from "@/types/audit";
import { THEME_LABELS, THEME_PRICES } from "@/types/audit";

// ─── Types ───

export interface PreAuditData {
  audit: Audit;
  scores: AuditScores;
  items: AuditItem[];
  actions: AuditAction[];
  theme: AuditTheme;
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

/** Return the primary score for a given theme */
function themeScore(scores: AuditScores, theme: AuditTheme): number {
  switch (theme) {
    case "seo":
      return scores.score_seo;
    case "geo":
      return scores.score_geo;
    case "perf":
      return scores.score_perf ?? Math.round((scores.score_seo + scores.score_geo) / 2);
    case "a11y":
      return scores.score_a11y ?? Math.round((scores.score_seo + scores.score_geo) / 2);
    case "rgesn":
      return scores.score_rgesn ?? Math.round((scores.score_seo + scores.score_geo) / 2);
    case "tech":
      return scores.score_tech ?? Math.round((scores.score_seo + scores.score_geo) / 2);
    case "contenu":
      return scores.score_contenu ?? Math.round((scores.score_seo + scores.score_geo) / 2);
    default:
      return Math.round((scores.score_seo + scores.score_geo) / 2);
  }
}

/** One-sentence summary based on score */
function scoreSummary(score: number, theme: AuditTheme): string {
  const label = THEME_LABELS[theme];
  if (score >= 75) return `Bonne performance ${label} — quelques optimisations possibles.`;
  if (score >= 50) return `Performance ${label} moyenne — des améliorations significatives sont possibles.`;
  if (score >= 25) return `Performance ${label} faible — des actions correctives sont nécessaires.`;
  return `Performance ${label} critique — une intervention urgente est recommandée.`;
}

/** Impact stars: 1-5 based on impact_points */
function impactStars(points: number): string {
  const stars = Math.min(5, Math.max(1, Math.ceil(points / 5)));
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

/** Finding severity class based on item score */
function findingClass(score: number): string {
  if (score >= 75) return "finding-ok";
  if (score >= 50) return "finding-warn";
  return "finding-crit";
}

/** Finding severity tag based on item score */
function findingTag(score: number): string {
  if (score >= 75) return "POINT FORT";
  if (score >= 50) return "ATTENTION";
  return "CRITIQUE";
}

// ─── Sections ───

function renderBanner(audit: Audit, theme: AuditTheme): string {
  const date = formatDate(audit.created_at);
  const ref = audit.reference || "PRE-2026-001";
  const themeLabel = THEME_LABELS[theme];

  return `
    <div class="section-header" style="margin:-18mm -22mm 16mm -22mm; padding:12mm 22mm 10mm 22mm;">
      <div class="section-header-bar"></div>
      <div style="font-size:8pt; font-weight:500; text-transform:uppercase; letter-spacing:0.2em; color:var(--beige); margin-bottom:6px;">MCVA CONSULTING SA</div>
      <div style="font-size:20pt; font-weight:700; color:var(--white); line-height:1.2;">Pré-Audit ${esc(themeLabel)}</div>
      <div style="font-size:12pt; font-weight:300; color:var(--cream); margin-top:4px;">${esc(audit.domain)}</div>
      <div style="font-size:7.5pt; color:var(--beige); opacity:0.7; margin-top:8px; letter-spacing:0.1em;">${date} · Réf. ${esc(ref)}</div>
    </div>`;
}

function renderScoreBadge(scores: AuditScores, theme: AuditTheme): string {
  const score = themeScore(scores, theme);
  const summary = scoreSummary(score, theme);

  return `
    <div style="text-align:center; margin:8px 0 20px 0;">
      <div style="display:inline-block; border:3px solid var(--gray-200); border-radius:8px; padding:14px 32px; background:var(--gray-50);">
        <div class="${scoreClass(score)}" style="font-size:48pt; font-weight:900; line-height:1;">${score}<span style="font-size:18pt; opacity:0.5">/100</span></div>
        <div style="font-size:7pt; text-transform:uppercase; letter-spacing:0.12em; color:var(--gray-600); margin-top:4px;">Score ${esc(THEME_LABELS[theme])}</div>
      </div>
      <p style="font-size:9pt; color:var(--gray-600); margin-top:10px; max-width:400px; margin-left:auto; margin-right:auto;">${esc(summary)}</p>
    </div>`;
}

function renderKeyFindings(items: AuditItem[]): string {
  if (items.length === 0) return "";

  // Sort: worst first, best last
  const sorted = [...items].sort((a, b) => a.score - b.score);
  const worst3 = sorted.slice(0, 3);
  const best2 = sorted
    .filter((i) => i.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  // Deduplicate (in case an item appears in both)
  const seen = new Set<string>();
  const findings: AuditItem[] = [];
  for (const item of [...worst3, ...best2]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      findings.push(item);
    }
  }

  // If we have fewer than 5, fill from sorted
  if (findings.length < 5) {
    for (const item of sorted) {
      if (findings.length >= 5) break;
      if (!seen.has(item.id)) {
        seen.add(item.id);
        findings.push(item);
      }
    }
  }

  return `
    <h2>Constats clés</h2>
    ${findings
      .map(
        (item) => `
      <div class="finding ${findingClass(item.score)}" style="padding:5px 5px 5px 10mm; margin:5px 0;">
        <div class="finding-tag">${findingTag(item.score)} · ${esc(item.item_code)}</div>
        <div style="font-size:8.5pt;"><strong>${esc(item.item_label)}</strong>${item.notes ? ` — ${esc(item.notes.slice(0, 120))}` : ""}</div>
      </div>`
      )
      .join("")}`;
}

function renderQuickWins(actions: AuditAction[]): string {
  if (actions.length === 0) return "";

  // Top 5 by impact_points descending
  const top5 = [...actions]
    .sort((a, b) => b.impact_points - a.impact_points)
    .slice(0, 5);

  return `
    <h2>Quick Wins</h2>
    <div style="margin:6px 0;">
      ${top5
        .map(
          (a, i) => `
        <div style="display:flex; gap:8px; align-items:baseline; margin:4px 0; page-break-inside:avoid;">
          <div style="font-size:11pt; font-weight:800; color:var(--red); min-width:18px;">${i + 1}.</div>
          <div style="flex:1;">
            <strong style="font-size:8.5pt;">${esc(a.title)}</strong>
            <span style="font-size:7.5pt; color:var(--gray-600);"> — +${a.impact_points} pts</span>
            <div style="font-size:7pt; color:var(--orange); letter-spacing:0.05em; margin-top:1px;">${impactStars(a.impact_points)}</div>
          </div>
        </div>`
        )
        .join("")}
    </div>`;
}

function renderCta(theme: AuditTheme): string {
  const themeLabel = THEME_LABELS[theme];
  const themePrice = THEME_PRICES[theme];

  return `
    <div class="callout-dark" style="margin-top:16px; text-align:center; padding:6mm 5mm;">
      <div style="font-size:8pt; text-transform:uppercase; letter-spacing:0.15em; color:var(--beige); margin-bottom:6px;">Passez au niveau supérieur</div>
      <div style="font-size:13pt; font-weight:700; color:var(--white); margin-bottom:4px;">Audit Complet ${esc(themeLabel)} — ${themePrice} CHF</div>
      <div style="font-size:8pt; color:var(--cream); opacity:0.85; margin-bottom:10px;">Analyse exhaustive + plan d'action priorisé + benchmark concurrentiel</div>
      <div style="width:60%; height:1px; background:var(--red); margin:0 auto 10px auto; opacity:0.4;"></div>
      <div style="font-size:8pt; color:var(--beige); opacity:0.8;">Ou vision complète : <strong style="color:var(--white);">Ultra Audit — 4 900 CHF</strong></div>
      <div style="font-size:7pt; color:var(--cream); opacity:0.6; margin-top:3px;">7 thématiques · 200+ critères · feuille de route 12 mois</div>
    </div>`;
}

function renderFooter(audit: Audit): string {
  const ref = audit.reference || "PRE-2026-001";
  return `
    <div class="page-footer">
      <span>MCVA Consulting SA — ${esc(ref)} — Confidentiel</span>
      <span>mcva.ch · info@mcva.ch</span>
    </div>`;
}

// ─── Main render function ───

export function renderPreAuditPdf(data: PreAuditData): string {
  const { audit, scores, items, actions, theme } = data;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>${PDF_STYLES}</style>
</head>
<body>
  <div class="page">
    ${renderBanner(audit, theme)}
    ${renderScoreBadge(scores, theme)}
    ${renderKeyFindings(items)}
    ${renderQuickWins(actions)}
    ${renderCta(theme)}
    ${renderFooter(audit)}
  </div>
</body>
</html>`;
}
