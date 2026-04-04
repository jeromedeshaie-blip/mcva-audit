/**
 * MCVA Brand Library v3.2 — PDF Design System
 * Shared CSS for all audit PDF templates (Pre-Audit, Complet, Ultra).
 *
 * Typography: DM Sans (body), General Sans (headings), DM Mono (code/refs)
 * Colors: MCVA v3.2 — multi-gradient red spectrum
 */

export const PDF_STYLES = `
:root {
  --red: #8B2C2C;
  --dark-red: #5C1A1A;
  --deep-red: #2A0E0E;
  --flare-red: #B04040;
  --black: #0E0E0E;
  --cream: #F0E8E4;
  --white: #FFFFFF;
  --gray-50: #FAFAFA;
  --gray-100: #F5F5F5;
  --gray-200: #E8E8E8;
  --gray-400: #999999;
  --gray-600: #666666;
  --gray-800: #333333;
  --green: #2D7A4F;
  --orange: #B8860B;
  --crit-red: #CC2200;
  --info-blue: #0066AA;
  --beige: #C9A98E;
  --grad-abyss: linear-gradient(165deg, #0E0E0E 0%, #2A0E0E 50%, #5C1A1A 100%);
  --grad-ember: linear-gradient(135deg, #2A0E0E 0%, #5C1A1A 100%);
  --grad-drift: linear-gradient(135deg, #5C1A1A 0%, #8B2C2C 100%);
  --grad-flare: linear-gradient(135deg, #8B2C2C 0%, #B04040 100%);
  --grad-accent: linear-gradient(90deg, #8B2C2C 0%, #B04040 100%);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
  font-size: 9.5pt;
  line-height: 1.55;
  color: var(--black);
  background: var(--white);
}

h1, h2, .section-title, .cover-title {
  font-family: 'General Sans', 'Helvetica Neue', sans-serif;
}

.text-mono, code, .cover-ref, .finding-tag {
  font-family: 'DM Mono', 'Courier New', monospace;
}

/* ─── PAGE LAYOUT ─── */
.page {
  width: 210mm;
  padding: 18mm 22mm 20mm 22mm;
  position: relative;
  page-break-after: always;
}
.page:last-child { page-break-after: auto; }

/* Cover & closing: fixed full-page */
.page-cover, .page-closing {
  width: 210mm;
  height: 297mm;
  padding: 0;
  overflow: hidden;
  page-break-after: always;
}

/* ─── COVER ─── */
.cover {
  height: 100%;
  background: var(--grad-abyss);
  padding: 0 22mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}
.cover-bar { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--red); }
.cover-eyebrow {
  font-size: 10pt; font-weight: 500; text-transform: uppercase;
  letter-spacing: 0.25em; color: var(--beige); margin-bottom: 12px;
}
.cover-title { font-size: 36pt; font-weight: 800; color: var(--white); line-height: 1.15; margin-bottom: 8px; }
.cover-client { font-size: 18pt; font-weight: 300; color: var(--cream); margin-bottom: 24px; }
.cover-domains {
  font-size: 8.5pt; font-weight: 400; text-transform: uppercase;
  letter-spacing: 0.15em; color: var(--beige); line-height: 1.8; opacity: 0.7;
}
.cover-footer {
  position: absolute; bottom: 22mm; left: 22mm; right: 22mm;
  display: flex; justify-content: space-between; align-items: flex-end;
}
.cover-footer-left { font-size: 8pt; color: var(--beige); opacity: 0.6; }
.cover-footer-right { font-size: 7pt; color: var(--beige); opacity: 0.4; }

/* ─── SECTION HEADER (dark banner) ─── */
.section-header {
  background: var(--grad-ember);
  padding: 16mm 22mm 12mm 22mm;
  margin: -18mm -22mm 20mm -22mm;
  position: relative;
}
.section-header-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--red); }
.section-number { font-size: 42pt; font-weight: 800; color: var(--red); opacity: 0.6; line-height: 1; }
.section-title { font-size: 16pt; font-weight: 600; color: var(--white); margin-top: 4px; }
.section-subtitle {
  font-size: 8pt; font-weight: 400; color: var(--beige);
  letter-spacing: 0.15em; text-transform: uppercase; margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

/* ─── HEADINGS ─── */
h2 {
  font-size: 12pt; font-weight: 700; color: var(--black);
  border-bottom: 2px solid var(--red); display: inline-block;
  padding-bottom: 2px; margin: 16px 0 10px 0;
}
h3 { font-size: 10pt; font-weight: 600; color: var(--gray-800); margin: 12px 0 6px 0; }

/* ─── SCORE BADGES ─── */
.scores-row { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; margin: 16px 0; }
.score-badge {
  min-width: 22mm; padding: 8px 12px; text-align: center;
  border: 1px solid var(--gray-200); border-radius: 4px; background: var(--gray-50);
}
.score-badge-value { font-size: 22pt; font-weight: 800; line-height: 1.1; }
.score-badge-label { font-size: 6.5pt; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

.score-green { color: var(--green); }
.score-orange { color: var(--orange); }
.score-red { color: var(--crit-red); }

/* ─── FINDINGS ─── */
.finding {
  padding: 8px 8px 8px 12mm; border-left: 3px solid var(--gray-200);
  margin: 8px 0; page-break-inside: avoid;
}
.finding-tag {
  font-size: 7pt; text-transform: uppercase;
  letter-spacing: 0.12em; margin-bottom: 3px; font-weight: 600;
}
.finding-crit { border-left-color: var(--crit-red); }
.finding-crit .finding-tag { color: var(--crit-red); }
.finding-warn { border-left-color: var(--orange); }
.finding-warn .finding-tag { color: var(--orange); }
.finding-info { border-left-color: var(--info-blue); }
.finding-info .finding-tag { color: var(--info-blue); }
.finding-ok { border-left-color: var(--green); }
.finding-ok .finding-tag { color: var(--green); }

/* ─── TABLES ─── */
table { width: 100%; border-collapse: collapse; font-size: 8pt; margin: 10px 0; }
thead th {
  background: var(--black); color: var(--white); font-weight: 600;
  font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.05em;
  padding: 2.5mm 3mm; text-align: left;
}
tbody td { padding: 2.5mm 3mm; border-bottom: 1px solid var(--gray-200); }
tbody tr:nth-child(even) { background: var(--gray-50); }

/* ─── CALLOUT ─── */
.callout {
  background: rgba(139,44,44,0.06); border: 1px solid rgba(139,44,44,0.15);
  border-radius: 4px; padding: 5mm; margin: 12px 0;
}
.callout-dark {
  background: var(--black); color: var(--cream);
  border-radius: 4px; padding: 5mm; margin: 12px 0;
}

/* ─── PHASE CARDS (Action Plan) ─── */
.phase-header {
  padding: 3mm 4mm; font-size: 10pt; font-weight: 700; color: var(--white);
  border-radius: 4px 4px 0 0;
}
.phase-1 { background: var(--red); }
.phase-2 { background: var(--black); }
.phase-3 { background: var(--grad-drift); }
.phase-body { border: 1px solid var(--gray-200); border-top: none; border-radius: 0 0 4px 4px; padding: 0; }

/* ─── PAGE FOOTER ─── */
.page-footer {
  position: absolute; bottom: 8mm; left: 22mm; right: 22mm;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 6.5pt; color: var(--gray-400);
  border-top: 1px solid var(--gray-200); padding-top: 3mm;
}
.page-footer::before {
  content: ''; position: absolute; top: -1px; left: 0;
  width: 30mm; height: 2px; background: var(--red);
}

/* ─── CLOSING PAGE ─── */
.closing {
  height: 100%;
  background: var(--grad-abyss);
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  text-align: center; padding: 22mm;
}
.closing-score { font-size: 72pt; font-weight: 900; color: var(--white); line-height: 1; }
.closing-label { font-size: 10pt; font-weight: 500; color: var(--beige); letter-spacing: 0.2em; text-transform: uppercase; margin-top: 8px; }
.closing-tagline { font-size: 14pt; font-weight: 300; color: var(--cream); margin-top: 32px; max-width: 400px; line-height: 1.5; }
.closing-footer { position: absolute; bottom: 22mm; font-size: 8pt; color: var(--beige); opacity: 0.5; }

/* ─── PRINT RULES ─── */
.finding, .score-badge, .callout, .callout-dark, table tr {
  page-break-inside: avoid;
}
h2, h3 { page-break-after: avoid; }

/* ─── UTILITIES ─── */
.text-center { text-align: center; }
.text-right { text-align: right; }
.mt-4 { margin-top: 16px; }
.mb-4 { margin-bottom: 16px; }
.flex { display: flex; }
.gap-4 { gap: 16px; }
.font-mono { font-family: 'DM Mono', 'Courier New', monospace; }
.text-sm { font-size: 8pt; }
.text-xs { font-size: 7pt; }
.text-gray { color: var(--gray-600); }
.font-bold { font-weight: 700; }
.no-break { page-break-inside: avoid; }
`;
