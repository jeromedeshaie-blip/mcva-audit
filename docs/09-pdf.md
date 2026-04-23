# 09 — PDF Templates

**Module** : 09 — PDF Templates
**Version** : 2.1 (tag `v2.1-release`)

Templates PDF brandés v3.2 (tessellation mark 4 cubes, General Sans/DM Sans/DM Mono). Ultra 25 pages avec Score GEO™ 4 composantes + sources vérifiées.

---

## `src/lib/pdf/audit-pdf.tsx`

```tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Audit, AuditScores, AuditItem, AuditAction } from "@/types/audit";

// ─── Font Setup (MCVA Brand Identity v3.0) ───
// GeneralSans TTF for headings, DM Sans for body text, DM Mono for scores & codes

import path from "path";

const fontsDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "GeneralSans",
  fonts: [
    { src: path.join(fontsDir, "GeneralSans-Light.ttf"), fontWeight: 300 },
    { src: path.join(fontsDir, "GeneralSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontsDir, "GeneralSans-Medium.ttf"), fontWeight: 500 },
    { src: path.join(fontsDir, "GeneralSans-Semibold.ttf"), fontWeight: 600 },
    { src: path.join(fontsDir, "GeneralSans-Bold.ttf"), fontWeight: 700 },
  ],
});

Font.register({
  family: "DMMono",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/dmmono/v14/aFTU7PB1QTsUX8KYhh2aBYyMcKdI.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/dmmono/v14/aFTR7PB1QTsUX8KYvrGyIYSnbKX9Rlk.ttf",
      fontWeight: 500,
    },
  ],
});

Font.register({
  family: "DMSans",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwA_opyLRh6Dg.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAop-yLRh6Dg.ttf",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwARpiyLRh6Dg.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAX5iyLRh6Dg.ttf",
      fontWeight: 700,
    },
  ],
});

// Disable hyphenation for cleaner text
Font.registerHyphenationCallback((word) => [word]);

const FONT_HEADING = "GeneralSans";
const FONT_BODY = "DMSans";
const FONT_MONO = "DMMono";

// ─── MCVA Brand Identity v3.0 ───
const MCVA = {
  // Identitaires (v3.0)
  red: "#8B2C2C",
  ink: "#0E0E0E",
  abyss: "#0A0808",
  white: "#FFFFFF",
  // Spectre rouge (v3.0 — rouges uniquement, pas de coral)
  gradAbyss: "#4A1515",
  bordeaux: "#5C1A1A",
  rougeSombre: "#7A2525",
  rougeVif: "#A53535",
  // Fonctionnelles (scores)
  green: "#22C55E",
  amber: "#F59E0B",
  orange: "#F97316",
  redAlert: "#EF4444",
  // Neutres PDF
  gray: "#6B7280",
  grayLight: "#F5F5F5",
  grayBorder: "#E5E7EB",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_HEADING,
    fontSize: 10,
    fontWeight: 400,
    color: MCVA.ink,
    backgroundColor: MCVA.white,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  // ─── Header ───
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    width: 28,
    height: 28,
    backgroundColor: MCVA.red,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontFamily: FONT_HEADING,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 1.8,
    color: MCVA.ink,
  },
  logoBar: {
    height: 2,
    backgroundColor: MCVA.rougeVif,
    marginVertical: 2,
  },
  logoSub: {
    fontFamily: FONT_HEADING,
    fontSize: 6.5,
    fontWeight: 500,
    letterSpacing: 2.5,
    color: MCVA.gray,
  },
  headerDate: {
    fontFamily: FONT_BODY,
    fontSize: 9,
    fontWeight: 400,
    color: MCVA.gray,
  },
  // ─── Accent bar ───
  accentBar: {
    height: 4,
    backgroundColor: MCVA.red,
    marginBottom: 24,
  },
  // ─── Eyebrow ───
  eyebrow: {
    fontFamily: FONT_HEADING,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 2.4,
    color: MCVA.red,
    marginBottom: 6,
  },
  // ─── Title ───
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 22,
    fontWeight: 700,
    color: MCVA.ink,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    fontWeight: 400,
    color: MCVA.gray,
    marginBottom: 24,
  },
  // ─── Scores ───
  scoresRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
    marginBottom: 30,
  },
  scoreBox: {
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: MCVA.grayLight,
    borderWidth: 0.5,
    borderColor: MCVA.grayBorder,
    width: 140,
  },
  scoreValue: {
    fontFamily: FONT_MONO,
    fontSize: 36,
    fontWeight: 500,
  },
  scoreLabel: {
    fontFamily: FONT_HEADING,
    fontSize: 9,
    fontWeight: 600,
    marginTop: 4,
    letterSpacing: 1,
    color: MCVA.ink,
  },
  scoreQuality: {
    fontFamily: FONT_HEADING,
    fontSize: 9,
    fontWeight: 500,
    marginTop: 2,
  },
  // ─── Section ───
  sectionTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 14,
    fontWeight: 700,
    color: MCVA.ink,
    marginBottom: 12,
    marginTop: 20,
    letterSpacing: -0.2,
  },
  // ─── Dimension bars ───
  dimensionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dimensionLabel: {
    width: 140,
    fontSize: 9,
    fontWeight: 400,
  },
  dimensionCode: {
    fontFamily: FONT_MONO,
    fontWeight: 500,
    marginRight: 6,
    color: MCVA.red,
  },
  dimensionBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: MCVA.grayLight,
    borderRadius: 4,
    marginRight: 8,
  },
  dimensionBarFill: {
    height: 8,
    borderRadius: 4,
  },
  dimensionScore: {
    fontFamily: FONT_MONO,
    width: 30,
    fontSize: 9,
    fontWeight: 500,
    textAlign: "right",
  },
  // ─── Items ───
  itemRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: MCVA.grayBorder,
  },
  itemCode: {
    fontFamily: FONT_MONO,
    width: 42,
    fontSize: 8,
    color: MCVA.gray,
    fontWeight: 500,
  },
  itemLabel: {
    fontFamily: FONT_BODY,
    flex: 1,
    fontSize: 8,
    fontWeight: 400,
  },
  itemStatus: {
    fontFamily: FONT_MONO,
    width: 30,
    fontSize: 8,
    fontWeight: 500,
    textAlign: "center",
  },
  itemScore: {
    fontFamily: FONT_MONO,
    width: 25,
    fontSize: 8,
    fontWeight: 500,
    textAlign: "right",
  },
  // ─── Footer ───
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: FONT_BODY,
    fontSize: 8,
    fontWeight: 400,
    color: MCVA.gray,
  },
  // ─── Express CTA ───
  ctaBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: MCVA.grayLight,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: MCVA.rougeVif,
  },
  ctaTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 11,
    fontWeight: 700,
    color: MCVA.red,
    marginBottom: 4,
  },
  ctaText: {
    fontFamily: FONT_BODY,
    fontSize: 9,
    fontWeight: 400,
    color: MCVA.gray,
    lineHeight: 1.5,
  },
  // ─── Action Plan ───
  actionCard: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: MCVA.grayBorder,
    backgroundColor: MCVA.white,
  },
  actionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 6,
    gap: 8,
  },
  actionPriorityBadge: {
    fontFamily: FONT_MONO,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 500,
    color: MCVA.white,
  },
  actionTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 10,
    fontWeight: 600,
    color: MCVA.ink,
    flex: 1,
  },
  actionDescription: {
    fontFamily: FONT_BODY,
    fontSize: 8.5,
    fontWeight: 400,
    color: "#374151",
    lineHeight: 1.4,
    marginBottom: 6,
  },
  actionMeta: {
    flexDirection: "row" as const,
    gap: 16,
    marginTop: 4,
  },
  actionMetaItem: {
    fontFamily: FONT_BODY,
    fontSize: 7.5,
    fontWeight: 400,
    color: MCVA.gray,
  },
  actionMetaValue: {
    fontFamily: FONT_MONO,
    fontWeight: 500,
    color: MCVA.ink,
  },
  actionCategoryBadge: {
    fontFamily: FONT_MONO,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    fontSize: 7,
    fontWeight: 500,
    backgroundColor: MCVA.grayLight,
    color: MCVA.red,
  },
  // ─── Action Summary ───
  actionSummaryBox: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
    padding: 12,
    backgroundColor: MCVA.grayLight,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: MCVA.grayBorder,
  },
  actionSummaryItem: {
    alignItems: "center" as const,
  },
  actionSummaryNumber: {
    fontFamily: FONT_MONO,
    fontSize: 18,
    fontWeight: 500,
  },
  actionSummaryLabel: {
    fontFamily: FONT_HEADING,
    fontSize: 7,
    fontWeight: 600,
    letterSpacing: 1.5,
    color: MCVA.gray,
    marginTop: 2,
  },
  // ─── Ranking ───
  rankingRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 0.5,
    borderBottomColor: MCVA.grayBorder,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  rankingRowHighlight: {
    backgroundColor: MCVA.grayLight,
    borderLeftWidth: 3,
    borderLeftColor: MCVA.red,
  },
  rankingCell: {
    fontFamily: FONT_BODY,
    fontSize: 8.5,
    fontWeight: 400,
  },
  rankingCellBold: {
    fontFamily: FONT_HEADING,
    fontSize: 8.5,
    fontWeight: 600,
  },
  rankingHeader: {
    backgroundColor: MCVA.grayLight,
    borderBottomWidth: 1,
    borderBottomColor: MCVA.grayBorder,
  },
  rankingPosition: {
    fontFamily: FONT_MONO,
    fontSize: 16,
    fontWeight: 500,
    textAlign: "center" as const,
  },
  rankingPositionBox: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 16,
    borderRadius: 8,
    backgroundColor: MCVA.grayLight,
    width: 120,
  },
  // ─── SPA Disclaimer ───
  spaDisclaimer: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: MCVA.amber,
  },
  spaDisclaimerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 9,
    fontWeight: 600,
    color: "#92400E",
    marginBottom: 4,
  },
  spaDisclaimerText: {
    fontFamily: FONT_BODY,
    fontSize: 8,
    fontWeight: 400,
    color: "#78350F",
    lineHeight: 1.5,
  },
});

// ─── Helpers ───

function getScoreColor(score: number): string {
  if (score >= 75) return MCVA.green;
  if (score >= 50) return MCVA.amber;
  if (score >= 25) return MCVA.orange;
  return MCVA.redAlert;
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Bon";
  if (score >= 50) return "Moyen";
  if (score >= 25) return "Faible";
  return "Critique";
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

const PRIORITY_COLORS: Record<string, string> = {
  P1: "#DC2626",
  P2: "#EA580C",
  P3: "#D97706",
  P4: "#6B7280",
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

// ─── Reusable Components ───

function PdfHeader({ date }: { date: string }) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.logo}>
          <View style={styles.logoMark}>
            <Text style={{ color: MCVA.white, fontSize: 16, fontWeight: 700 }}>+</Text>
          </View>
          <View>
            <Text style={styles.logoText}>MCVA</Text>
            <View style={styles.logoBar} />
            <Text style={styles.logoSub}>AI CONSULTING</Text>
          </View>
        </View>
        <Text style={styles.headerDate}>{date}</Text>
      </View>
      <View style={styles.accentBar} />
    </>
  );
}

function SpaDisclaimer() {
  return (
    <View style={styles.spaDisclaimer}>
      <Text style={styles.spaDisclaimerTitle}>LIMITATION TECHNIQUE DETECTEE</Text>
      <Text style={styles.spaDisclaimerText}>
        Ce site utilise un rendu JavaScript cote client (SPA/Wix). Le contenu visible aux utilisateurs est genere dynamiquement et n&apos;est pas present dans le HTML statique. Les scores ci-dessous refletent la visibilite reelle du contenu pour les moteurs de recherche et les modeles d&apos;IA, qui partagent cette meme limitation. Certains scores peuvent etre sous-estimes si du contenu est uniquement accessible via JavaScript.
      </Text>
    </View>
  );
}

function PdfFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>MCVA Consulting SA — Confidentiel</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ─── Types ───

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

interface AuditPdfProps {
  audit: Audit;
  scores: AuditScores;
  items: AuditItem[];
  actions?: AuditAction[];
  benchmarkRanking?: BenchmarkRankingData;
}

// ─── Main Document ───

export function AuditPdfDocument({ audit, scores, items, actions = [], benchmarkRanking }: AuditPdfProps) {
  const date = new Date(audit.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const coreEeatItems = items.filter((i) => i.framework === "core_eeat");
  const citeItems = items.filter((i) => i.framework === "cite");
  const isExpress = audit.audit_type === "express";
  const hasCiteScores = Object.keys(scores.score_cite || {}).length > 0;

  return (
    <Document>
      {/* ═══ PAGE 1 — Scores & Dimensions ═══ */}
      <Page size="A4" style={styles.page}>
        <PdfHeader date={date} />

        {/* Eyebrow + Title */}
        <Text style={styles.eyebrow}>RAPPORT D&apos;AUDIT</Text>
        <Text style={styles.title}>
          Audit {isExpress ? "Express" : "Complet"} SEO / GEO
        </Text>
        <Text style={styles.subtitle}>
          {audit.domain}
          {audit.sector ? ` — ${audit.sector}` : ""}
        </Text>

        {/* Scores */}
        <View style={styles.scoresRow}>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreValue, { color: getScoreColor(scores.score_seo) }]}>
              {scores.score_seo}
            </Text>
            <Text style={styles.scoreLabel}>SCORE SEO</Text>
            <Text style={[styles.scoreQuality, { color: getScoreColor(scores.score_seo) }]}>
              {getScoreLabel(scores.score_seo)}
            </Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreValue, { color: getScoreColor(scores.score_geo) }]}>
              {scores.score_geo}
            </Text>
            <Text style={styles.scoreLabel}>SCORE GEO</Text>
            <Text style={[styles.scoreQuality, { color: getScoreColor(scores.score_geo) }]}>
              {getScoreLabel(scores.score_geo)}
            </Text>
          </View>
        </View>

        {isExpress && (
          <Text style={{ fontSize: 9, color: MCVA.gray, textAlign: "center", marginBottom: 20 }}>
            8/8 dimensions analysees — {items.length} criteres sur 30 evalues
          </Text>
        )}

        {/* SPA Disclaimer */}
        {audit.is_spa && <SpaDisclaimer />}

        {/* CORE-EEAT Dimensions */}
        <Text style={styles.sectionTitle}>Scores par dimension CORE-EEAT</Text>
        {["C", "O", "R", "E", "Exp", "Ept", "A", "T"].map((dim) => {
          const score = scores.score_core_eeat[dim] ?? 0;
          return (
            <View key={dim} style={styles.dimensionRow}>
              <View style={styles.dimensionLabel}>
                <Text>
                  <Text style={styles.dimensionCode}>{dim}</Text>
                  {"  "}
                  {CORE_EEAT_LABELS[dim]}
                </Text>
              </View>
              <View style={styles.dimensionBarBg}>
                <View
                  style={[
                    styles.dimensionBarFill,
                    { width: `${score}%`, backgroundColor: getScoreColor(score) },
                  ]}
                />
              </View>
              <Text style={styles.dimensionScore}>{score}</Text>
            </View>
          );
        })}

        {/* CITE Dimensions */}
        {hasCiteScores && (
          <>
            <Text style={styles.sectionTitle}>Scores par dimension CITE</Text>
            {["C", "I", "T", "E"].map((dim) => {
              const score = scores.score_cite[dim] ?? 0;
              return (
                <View key={`cite-${dim}`} style={styles.dimensionRow}>
                  <View style={styles.dimensionLabel}>
                    <Text>
                      <Text style={styles.dimensionCode}>{dim}</Text>
                      {"  "}
                      {CITE_LABELS[dim]}
                    </Text>
                  </View>
                  <View style={styles.dimensionBarBg}>
                    <View
                      style={[
                        styles.dimensionBarFill,
                        { width: `${score}%`, backgroundColor: getScoreColor(score) },
                      ]}
                    />
                  </View>
                  <Text style={styles.dimensionScore}>{score}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* Express CTA */}
        {isExpress && (
          <View style={styles.ctaBox}>
            <Text style={styles.ctaTitle}>Passez a l&apos;audit complet</Text>
            <Text style={styles.ctaText}>
              80 criteres CORE-EEAT + 40 criteres CITE + plan d&apos;action priorise + benchmark concurrentiel. Contactez votre consultant MCVA.
            </Text>
          </View>
        )}

        <PdfFooter />
      </Page>

      {/* ═══ PAGE 2 — CORE-EEAT Items Detail ═══ */}
      {coreEeatItems.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PdfHeader date={date} />
          <Text style={styles.eyebrow}>DETAIL DES CRITERES</Text>
          <Text style={styles.sectionTitle}>Criteres CORE-EEAT ({coreEeatItems.length} evalues)</Text>
          <View style={[styles.itemRow, { backgroundColor: MCVA.grayLight, borderBottomWidth: 1 }]}>
            <Text style={[styles.itemCode, { fontWeight: 700 }]}>Code</Text>
            <Text style={[styles.itemLabel, { fontWeight: 700 }]}>Critere</Text>
            <Text style={[styles.itemStatus, { fontWeight: 700 }]}>Statut</Text>
            <Text style={[styles.itemScore, { fontWeight: 700 }]}>Score</Text>
          </View>
          {coreEeatItems.map((item) => (
            <View key={item.item_code} style={styles.itemRow} wrap={false}>
              <Text style={styles.itemCode}>{item.item_code}</Text>
              <Text style={styles.itemLabel}>{item.item_label}</Text>
              <Text style={[styles.itemStatus, { color: getScoreColor(item.score) }]}>
                {item.status === "pass" ? "OK" : item.status === "partial" ? "~" : "KO"}
              </Text>
              <Text style={styles.itemScore}>{item.score}</Text>
            </View>
          ))}
          <PdfFooter />
        </Page>
      )}

      {/* ═══ PAGE 3 — CITE Items Detail ═══ */}
      {citeItems.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PdfHeader date={date} />
          <Text style={styles.eyebrow}>DETAIL DES CRITERES</Text>
          <Text style={styles.sectionTitle}>Criteres CITE ({citeItems.length} evalues)</Text>
          <View style={[styles.itemRow, { backgroundColor: MCVA.grayLight, borderBottomWidth: 1 }]}>
            <Text style={[styles.itemCode, { fontWeight: 700 }]}>Code</Text>
            <Text style={[styles.itemLabel, { fontWeight: 700 }]}>Critere</Text>
            <Text style={[styles.itemStatus, { fontWeight: 700 }]}>Statut</Text>
            <Text style={[styles.itemScore, { fontWeight: 700 }]}>Score</Text>
          </View>
          {citeItems.map((item) => (
            <View key={item.item_code} style={styles.itemRow} wrap={false}>
              <Text style={styles.itemCode}>{item.item_code}</Text>
              <Text style={styles.itemLabel}>{item.item_label}</Text>
              <Text style={[styles.itemStatus, { color: getScoreColor(item.score) }]}>
                {item.status === "pass" ? "OK" : item.status === "partial" ? "~" : "KO"}
              </Text>
              <Text style={styles.itemScore}>{item.score}</Text>
            </View>
          ))}
          <PdfFooter />
        </Page>
      )}

      {/* ═══ PAGE 4 — Action Plan (full audit only) ═══ */}
      {!isExpress && actions.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PdfHeader date={date} />
          <Text style={styles.eyebrow}>PLAN D&apos;ACTION</Text>
          <Text style={styles.title}>Recommandations strategiques</Text>
          <Text style={styles.subtitle}>
            {audit.domain} — {actions.length} actions priorisees
          </Text>

          {/* Summary counters */}
          <View style={styles.actionSummaryBox}>
            {(["P1", "P2", "P3", "P4"] as const).map((p) => {
              const count = actions.filter((a) => a.priority === p).length;
              return (
                <View key={p} style={styles.actionSummaryItem}>
                  <Text style={[styles.actionSummaryNumber, { color: PRIORITY_COLORS[p] }]}>
                    {count}
                  </Text>
                  <Text style={styles.actionSummaryLabel}>{PRIORITY_LABELS[p]}</Text>
                </View>
              );
            })}
            <View style={styles.actionSummaryItem}>
              <Text style={[styles.actionSummaryNumber, { color: MCVA.green }]}>
                +{actions.reduce((sum, a) => sum + a.impact_points, 0)}
              </Text>
              <Text style={styles.actionSummaryLabel}>POINTS POTENTIELS</Text>
            </View>
          </View>

          {/* Action cards */}
          {actions.map((action, idx) => (
            <View key={action.id || idx} style={styles.actionCard} wrap={false}>
              <View style={styles.actionHeader}>
                <Text
                  style={[
                    styles.actionPriorityBadge,
                    { backgroundColor: PRIORITY_COLORS[action.priority] || MCVA.gray },
                  ]}
                >
                  {action.priority}
                </Text>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </View>
              <Text style={styles.actionDescription}>{action.description}</Text>
              <View style={styles.actionMeta}>
                <Text style={styles.actionMetaItem}>
                  Impact : <Text style={styles.actionMetaValue}>+{action.impact_points} pts</Text>
                </Text>
                <Text style={styles.actionMetaItem}>
                  Effort : <Text style={styles.actionMetaValue}>{action.effort}</Text>
                </Text>
                <Text style={styles.actionCategoryBadge}>
                  {CATEGORY_LABELS[action.category] || action.category}
                </Text>
              </View>
            </View>
          ))}

          <PdfFooter />
        </Page>
      )}

      {/* ═══ PAGE 5 — Benchmark Ranking (full audit + benchmark data) ═══ */}
      {!isExpress && benchmarkRanking && benchmarkRanking.domains.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PdfHeader date={date} />
          <Text style={styles.eyebrow}>POSITIONNEMENT</Text>
          <Text style={styles.title}>Classement sectoriel</Text>
          <Text style={styles.subtitle}>
            {benchmarkRanking.benchmarkName} — {benchmarkRanking.geographicScope}
          </Text>

          {/* Client position summary */}
          {(() => {
            const clientEntry = benchmarkRanking.domains.find(
              (d) => d.domain === benchmarkRanking.clientDomain
            );
            const total = benchmarkRanking.domains.length;
            if (!clientEntry) return null;
            return (
              <View style={styles.actionSummaryBox}>
                <View style={styles.rankingPositionBox}>
                  <Text style={[styles.rankingPosition, { color: MCVA.red }]}>
                    {clientEntry.rank_seo ?? "-"}/{total}
                  </Text>
                  <Text style={styles.actionSummaryLabel}>RANG SEO</Text>
                </View>
                <View style={styles.rankingPositionBox}>
                  <Text style={[styles.rankingPosition, { color: MCVA.red }]}>
                    {clientEntry.rank_geo ?? "-"}/{total}
                  </Text>
                  <Text style={styles.actionSummaryLabel}>RANG GEO</Text>
                </View>
                <View style={styles.rankingPositionBox}>
                  <Text style={[styles.rankingPosition, { color: getScoreColor(clientEntry.score_seo ?? 0) }]}>
                    {clientEntry.score_seo ?? "-"}
                  </Text>
                  <Text style={styles.actionSummaryLabel}>SCORE SEO</Text>
                </View>
                <View style={styles.rankingPositionBox}>
                  <Text style={[styles.rankingPosition, { color: getScoreColor(clientEntry.score_geo ?? 0) }]}>
                    {clientEntry.score_geo ?? "-"}
                  </Text>
                  <Text style={styles.actionSummaryLabel}>SCORE GEO</Text>
                </View>
              </View>
            );
          })()}

          {/* Full ranking table */}
          <View style={[styles.rankingRow, styles.rankingHeader]}>
            <Text style={[styles.rankingCellBold, { width: 30 }]}>#</Text>
            <Text style={[styles.rankingCellBold, { flex: 1 }]}>Domaine</Text>
            <Text style={[styles.rankingCellBold, { width: 55, textAlign: "center" }]}>SEO</Text>
            <Text style={[styles.rankingCellBold, { width: 55, textAlign: "center" }]}>GEO</Text>
            <Text style={[styles.rankingCellBold, { width: 55, textAlign: "center" }]}>Rang SEO</Text>
            <Text style={[styles.rankingCellBold, { width: 55, textAlign: "center" }]}>Rang GEO</Text>
          </View>
          {benchmarkRanking.domains
            .sort((a, b) => (a.rank_seo ?? 999) - (b.rank_seo ?? 999))
            .map((d) => {
              const isClient = d.domain === benchmarkRanking.clientDomain;
              return (
                <View
                  key={d.domain}
                  style={[styles.rankingRow, isClient ? styles.rankingRowHighlight : {}]}
                  wrap={false}
                >
                  <Text style={[isClient ? styles.rankingCellBold : styles.rankingCell, { width: 30 }]}>
                    {d.rank_seo ?? "-"}
                  </Text>
                  <Text style={[isClient ? styles.rankingCellBold : styles.rankingCell, { flex: 1 }]}>
                    {d.domain}
                  </Text>
                  <Text
                    style={[styles.rankingCellBold, { width: 55, textAlign: "center", color: getScoreColor(d.score_seo ?? 0) }]}
                  >
                    {d.score_seo ?? "-"}
                  </Text>
                  <Text
                    style={[styles.rankingCellBold, { width: 55, textAlign: "center", color: getScoreColor(d.score_geo ?? 0) }]}
                  >
                    {d.score_geo ?? "-"}
                  </Text>
                  <Text style={[styles.rankingCell, { width: 55, textAlign: "center" }]}>
                    {d.rank_seo ?? "-"}/{benchmarkRanking.domains.length}
                  </Text>
                  <Text style={[styles.rankingCell, { width: 55, textAlign: "center" }]}>
                    {d.rank_geo ?? "-"}/{benchmarkRanking.domains.length}
                  </Text>
                </View>
              );
            })}

          <PdfFooter />
        </Page>
      )}
    </Document>
  );
}

```


## `src/lib/pdf/html-to-pdf.ts`

```typescript
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

/**
 * Convert an HTML string to a PDF buffer using Puppeteer + @sparticuz/chromium.
 * Works on Vercel serverless (AWS Lambda compatible Chromium binary).
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  const isLocal = process.env.NODE_ENV === "development";

  const execPath = isLocal
    ? process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "/usr/bin/google-chrome"
    : await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: isLocal ? [] : chromium.args,
    defaultViewport: { width: 794, height: 1123 }, // A4 at 96dpi
    executablePath: execPath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

```


## `src/lib/pdf/templates/render-llmwatch.ts`

```typescript
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
        ${data.score.totalResponses} réponses analysées sur ${Object.values(data.scoreByLlm).filter((v) => v !== null).length}/${Math.max(Object.keys(data.scoreByLlm).length, 4)} LLMs
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
      Score moyen sur ${Object.values(data.scoreByLlm).filter((v) => v !== null).length} LLMs disponibles sur ${Math.max(Object.keys(data.scoreByLlm).length, 4)} monitorés
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
        <div class="section-subtitle">${data.queryResults.length} requêtes &mdash; ${Math.max(Object.keys(data.scoreByLlm).length, new Set(data.queryResults.flatMap(q => q.results.map(r => r.llm))).size)} LLMs par requête</div>
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

```


## `src/lib/pdf/templates/render-pre-audit.ts`

```typescript
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

```


## `src/lib/pdf/templates/render-ultra.ts`

```typescript
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
  /** Per-theme scores (null = non évalué) */
  themeScores: Record<AuditTheme, number | null>;
  /** Optional client context */
  clientContext?: {
    clientName?: string;
    objective?: string;
    scope?: string;
    sector?: string;
  };
  /** @deprecated — Semrush retiré depuis v2.1 */
  semrushData?: SemrushData;
  /** @deprecated — Qwairy remplacé par LLM Watch v2 */
  qwairyData?: QwairyData;
  /**
   * POLE-PERF v2.1 § 6.5 — sources vérifiées utilisées pour enrichir le scoring.
   * Ex: ["AWT export 2026-04-23", "GSC export 2026-04-23", "LLM Watch run 2026-04-22"]
   */
  sourcesUsed?: string[];
  /**
   * Score GEO™ breakdown (4 composantes × 25) si disponible via bloc F LLM Watch.
   */
  scoreGeoBreakdown?: {
    presence: number;
    exactitude: number;
    sentiment: number;
    recommendation: number;
    model_snapshot_version?: string | null;
    run_count?: number | null;
    score_stddev?: number | null;
    run_level?: string | null;
    source: "llm_watch" | "cite_estimation";
  };
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

/** Render a "Non évalué" placeholder page for themes with null score and 0 items */
function renderNotEvaluatedSection(
  num: string,
  title: string,
  themeKey: string,
  ref: string,
  pageNum: number,
): string {
  const sectionTitle = SHORT_LABELS[themeKey as AuditTheme] || title;
  return `<div class="page" data-section="${themeKey}">
  ${renderSectionHeader(themeKey, num, sectionTitle, "Non évalué")}
  <div class="page-inner" style="padding-top:6mm;">
    <div style="margin-top:12mm;padding:6mm;background:var(--cream);border-radius:3px;border-left:3px solid var(--beige);">
      <p style="font-size:10pt;color:var(--gray-600);margin:0;">
        <strong>Non évalué</strong> — Ce module n\u2019a pas été scoré lors de cet audit.
        Les données seront disponibles lors d\u2019un audit Ultra complet.
      </p>
    </div>
    ${renderPageFooter(ref, pageNum)}
  </div>
</div>`;
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

function computeGlobalScore(themeScores: Record<AuditTheme, number | null>): number {
  let total = 0;
  let weightSum = 0;
  for (const theme of Object.keys(GLOBAL_SCORE_WEIGHTS) as AuditTheme[]) {
    const score = themeScores[theme];
    if (score == null) continue; // Ignore null/undefined scores
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

function generateRadarSvg(themeScores: Record<AuditTheme, number | null>): string {
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
  const score = themeScores[theme];
  const themeItems = itemsByTheme(items, theme);

  // Si le thème n'a pas été évalué (null score + 0 items), afficher "Non évalué"
  if (score == null && themeItems.length === 0) {
    const sectionTitle = SHORT_LABELS[theme];
    return renderNotEvaluatedSection(
      padSection(sectionNum), sectionTitle, theme, ref, sectionNum
    );
  }

  const displayScore = score ?? 0;
  const themeActions = actions.filter(
    (a) => a.theme === theme || a.category === theme || a.category === CATEGORY_LABELS[theme]
  );

  const sectionId = theme;
  const sectionTitle = SHORT_LABELS[theme];
  const subtitle = `${themeItems.length} crit\u00e8res \u00B7 Score ${displayScore}/100`;

  // Page 1: header + badge + intro + top 5 findings
  let page1 = `<div class="page">
  ${renderSectionHeader(sectionId, padSection(sectionNum), `${sectionTitle}`, subtitle)}
  <div class="page-inner" style="padding-top:6mm;">

    <div class="score-badge ${scoreColorClass(displayScore)}" style="float:right; margin-left:4mm;">
      <div class="num">${displayScore}</div>
      <div class="lbl">${esc(sectionTitle)}</div>
    </div>

    ${generateThemeIntro(theme, displayScore, themeItems)}

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

/**
 * Tessellation Mark v3.2 — 4 cubes avec gradient rouge + croix suisse
 * SVG inline pour reproduction fidèle dans le PDF.
 */
const TESSELLATION_MARK_SVG = `
<svg width="64" height="64" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tessellation-pdf" x1="0" y1="0" x2="84" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4A1515"/>
      <stop offset="20%" stop-color="#6B2020"/>
      <stop offset="40%" stop-color="#8B2C2C"/>
      <stop offset="60%" stop-color="#A83D33"/>
      <stop offset="80%" stop-color="#C44A38"/>
      <stop offset="100%" stop-color="#A53535"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="28" height="28" rx="4" fill="url(#tessellation-pdf)"/>
  <rect x="34" y="2" width="28" height="28" rx="4" fill="url(#tessellation-pdf)"/>
  <rect x="2" y="34" width="28" height="28" rx="4" fill="url(#tessellation-pdf)"/>
  <rect x="34" y="34" width="28" height="28" rx="4" fill="url(#tessellation-pdf)"/>
  <rect x="44" y="38" width="8" height="20" rx="1.5" fill="#F0E8E4"/>
  <rect x="38" y="44" width="20" height="8" rx="1.5" fill="#F0E8E4"/>
</svg>`;

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
    <div style="margin-bottom:24mm;">${TESSELLATION_MARK_SVG}</div>
    <div class="cover-eyebrow">MCVA Consulting SA \u00B7 P\u00f4le Performance</div>
    <div class="cover-title">Audit Digital<br>Ultra</div>
    <div class="cover-client">${esc(clientName)}</div>
    <div class="cover-domains">${esc(domains)} \u00B7 Benchmark</div>
  </div>
  <div class="cover-footer">
    <div class="cover-footer-text">Rapport confidentiel pr\u00e9par\u00e9 par MCVA Consulting SA<br>Chemin des Cr\u00eates 7 \u2014 1997 Haute-Nendaz \u00B7 Valais \u00B7 Suisse \u00B7 mcva.ch</div>
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
  const { audit, items, themeScores, sourcesUsed, scoreGeoBreakdown } = data;
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

  // POLE-PERF v2.1 § 6.5 — Sources block
  const sourcesBlock = sourcesUsed && sourcesUsed.length > 0
    ? `<div style="margin-top:4mm; padding:3mm 4mm; background:var(--gray-50); border-left:3px solid var(--red); font-size:7.5pt; color:var(--gray-600);">
         <strong style="color:var(--gray-800);">Sources v\u00e9rifi\u00e9es</strong> : ${sourcesUsed.map(esc).join(" \u00B7 ")}
       </div>`
    : `<div style="margin-top:4mm; padding:3mm 4mm; background:rgba(184,134,11,0.08); border-left:3px solid var(--orange); font-size:7.5pt; color:var(--gray-700);">
         <strong>Mode d\u00e9grad\u00e9</strong> : Score GEO\u2122 estim\u00e9 via signaux HTML (CITE). Recommander l\u2019activation LLM Watch pour obtenir une mesure r\u00e9elle.
       </div>`;

  // POLE-PERF v2.1 § 5 — Score GEO™ 4 composantes breakdown
  const geoBreakdownBlock = scoreGeoBreakdown && scoreGeoBreakdown.source === "llm_watch"
    ? `<h2 style="margin-top:6mm;">Score GEO\u2122 \u2014 4 composantes</h2>
       <div style="display:flex; gap:3mm; margin:3mm 0;">
         <div class="score-badge" style="flex:1;">
           <div class="score-badge-value ${scoreColorClass(scoreGeoBreakdown.presence * 4)}">${scoreGeoBreakdown.presence.toFixed(1)}</div>
           <div class="score-badge-label">Pr\u00e9sence /25</div>
         </div>
         <div class="score-badge" style="flex:1;">
           <div class="score-badge-value ${scoreColorClass(scoreGeoBreakdown.exactitude * 4)}">${scoreGeoBreakdown.exactitude.toFixed(1)}</div>
           <div class="score-badge-label">Exactitude /25</div>
         </div>
         <div class="score-badge" style="flex:1;">
           <div class="score-badge-value ${scoreColorClass(scoreGeoBreakdown.sentiment * 4)}">${scoreGeoBreakdown.sentiment.toFixed(1)}</div>
           <div class="score-badge-label">Sentiment /25</div>
         </div>
         <div class="score-badge" style="flex:1;">
           <div class="score-badge-value ${scoreColorClass(scoreGeoBreakdown.recommendation * 4)}">${scoreGeoBreakdown.recommendation.toFixed(1)}</div>
           <div class="score-badge-label">Recommandation /25</div>
         </div>
       </div>
       ${scoreGeoBreakdown.model_snapshot_version ? `<div style="font-size:7pt; color:var(--gray-400); margin-top:2mm;">
         Snapshot LLM : <span class="text-mono">${esc(scoreGeoBreakdown.model_snapshot_version)}</span>
         ${scoreGeoBreakdown.run_count ? ` \u00B7 Runs : <span class="text-mono">${scoreGeoBreakdown.run_count}</span>` : ""}
         ${scoreGeoBreakdown.score_stddev != null ? ` \u00B7 \u03C3 : <span class="text-mono">\u00B1${scoreGeoBreakdown.score_stddev.toFixed(2)}</span>` : ""}
         ${scoreGeoBreakdown.run_level ? ` \u00B7 Niveau : <span class="text-mono">${esc(scoreGeoBreakdown.run_level)}</span>` : ""}
       </div>` : ""}`
    : "";

  return `<div class="page">
  ${renderSectionHeader("synthese", "01", "Synth\u00e8se ex\u00e9cutive", "Vue d\u2019ensemble \u00B7 Scores \u00B7 Constats cl\u00e9s")}
  <div class="page-inner" style="padding-top:8mm;">

    <p class="lead">${lead}</p>

    <div class="scores-row">${badges}</div>

    <div class="callout-dark" style="text-align:center; margin-top:5mm;">
      <strong style="font-size:14pt; color:var(--red);">Score global : ${globalScore}/100</strong><br>
      <span style="font-size:9pt; color:var(--beige);">${totalActions} points d\u2019am\u00e9lioration identifi\u00e9s \u00B7 Potentiel d\u2019am\u00e9lioration ${globalScore < 40 ? "majeur" : globalScore < 60 ? "significatif" : "mod\u00e9r\u00e9"}</span>
    </div>

    ${sourcesBlock}
    ${geoBreakdownBlock}

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
  const rawPerfScore = themeScores.perf;
  const perfItems = itemsByTheme(items, "perf");

  // Si non évalué, afficher page "Non évalué"
  if (rawPerfScore == null && perfItems.length === 0) {
    return renderNotEvaluatedSection("05", "Performance — Core Web Vitals", "perf", ref, 9);
  }
  const perfScore = rawPerfScore ?? 0;
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

```


## `src/lib/pdf/templates/render.ts`

```typescript
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

```


## `src/lib/pdf/templates/styles.ts`

```typescript
/**
 * MCVA Brand Library v3.2 — PDF Design System
 * Shared CSS for all audit PDF templates (Pre-Audit, Complet, Ultra).
 *
 * Typography: DM Sans (body), General Sans (headings), DM Mono (code/refs)
 * Colors: MCVA v3.2 — multi-gradient red spectrum
 */

export const PDF_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;700&display=swap');
@import url('https://api.fontshare.com/v2/css?f[]=general-sans@200,300,400,500,600,700,800&display=swap');

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

```

