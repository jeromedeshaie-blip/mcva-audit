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

// ─── Font Registration (MCVA Brand Identity v2.3) ───
// GeneralSans: Display/Heading font — self-hosted in /public/fonts/
// DM Mono: Data/Scores font — from Google Fonts CDN

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
}

const baseUrl = getBaseUrl();

Font.register({
  family: "GeneralSans",
  fonts: [
    { src: `${baseUrl}/fonts/GeneralSans-Light.woff2`, fontWeight: 300 },
    { src: `${baseUrl}/fonts/GeneralSans-Regular.woff2`, fontWeight: 400 },
    { src: `${baseUrl}/fonts/GeneralSans-Medium.woff2`, fontWeight: 500 },
    { src: `${baseUrl}/fonts/GeneralSans-Semibold.woff2`, fontWeight: 600 },
    { src: `${baseUrl}/fonts/GeneralSans-Bold.woff2`, fontWeight: 700 },
  ],
});

Font.register({
  family: "DMMono",
  src: "https://fonts.gstatic.com/s/dmmono/v14/aFTU7PB1QTsUX8KYhh2aBYyMcKdI.woff2",
  fontWeight: 400,
});

Font.register({
  family: "DMMono",
  src: "https://fonts.gstatic.com/s/dmmono/v14/aFTR7PB1QTsUX8KYvrGyIYSnbKX9Rlk.woff2",
  fontWeight: 500,
});

// Disable hyphenation for cleaner text
Font.registerHyphenationCallback((word) => [word]);

const FONT_HEADING = "GeneralSans";
const FONT_MONO = "DMMono";

// ─── MCVA Brand Identity v2.3 ───
const MCVA = {
  // Identity
  red: "#8B2C2C",
  coral: "#D4553A",
  ink: "#0E0E0E",
  abyss: "#0A0808",
  paper: "#F8F6F1",
  mist: "#F2F0EB",
  stone: "#E8E4DD",
  white: "#FFFFFF",
  // Spectre
  gradAbyss: "#4A1515",
  blush: "#E8937A",
  peach: "#F5C4B0",
  // Fonctionnelles (scores)
  green: "#22C55E",
  amber: "#F59E0B",
  orange: "#F97316",
  redAlert: "#EF4444",
  // Neutres
  gray: "#6B7280",
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
    backgroundColor: MCVA.coral,
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
    fontFamily: FONT_HEADING,
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
    fontFamily: FONT_HEADING,
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
    backgroundColor: MCVA.mist,
    borderWidth: 0.5,
    borderColor: MCVA.stone,
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
    backgroundColor: MCVA.mist,
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
    borderBottomColor: MCVA.stone,
  },
  itemCode: {
    fontFamily: FONT_MONO,
    width: 42,
    fontSize: 8,
    color: MCVA.gray,
    fontWeight: 500,
  },
  itemLabel: {
    fontFamily: FONT_HEADING,
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
    fontSize: 8,
    fontWeight: 400,
    color: MCVA.gray,
  },
  // ─── Express CTA ───
  ctaBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: MCVA.mist,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: MCVA.coral,
  },
  ctaTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 11,
    fontWeight: 700,
    color: MCVA.red,
    marginBottom: 4,
  },
  ctaText: {
    fontFamily: FONT_HEADING,
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
    borderColor: MCVA.stone,
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
    fontFamily: FONT_HEADING,
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
    fontFamily: FONT_HEADING,
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
    backgroundColor: MCVA.mist,
    color: MCVA.red,
  },
  // ─── Action Summary ───
  actionSummaryBox: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
    padding: 12,
    backgroundColor: MCVA.mist,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: MCVA.stone,
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
    borderBottomColor: MCVA.stone,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  rankingRowHighlight: {
    backgroundColor: MCVA.mist,
    borderLeftWidth: 3,
    borderLeftColor: MCVA.red,
  },
  rankingCell: {
    fontFamily: FONT_HEADING,
    fontSize: 8.5,
    fontWeight: 400,
  },
  rankingCellBold: {
    fontFamily: FONT_HEADING,
    fontSize: 8.5,
    fontWeight: 600,
  },
  rankingHeader: {
    backgroundColor: MCVA.mist,
    borderBottomWidth: 1,
    borderBottomColor: MCVA.stone,
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
    backgroundColor: MCVA.mist,
    width: 120,
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
            <Text style={{ color: MCVA.paper, fontSize: 16, fontWeight: 700 }}>+</Text>
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
          <View style={[styles.itemRow, { backgroundColor: MCVA.mist, borderBottomWidth: 1 }]}>
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
          <View style={[styles.itemRow, { backgroundColor: MCVA.mist, borderBottomWidth: 1 }]}>
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
