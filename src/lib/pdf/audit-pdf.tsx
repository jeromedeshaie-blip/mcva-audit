import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Audit, AuditScores, AuditItem, AuditAction } from "@/types/audit";

// Use Helvetica (built-in) to avoid font download timeouts on serverless
// TODO: Switch to Work Sans when hosting fonts locally in /public
const FONT_FAMILY = "Helvetica";

// MCVA Brand colors
const MCVA = {
  red: "#8B2C2C",
  black: "#0E0E0E",
  white: "#FFFFFF",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  green: "#22C55E",
  amber: "#F59E0B",
  orange: "#F97316",
  redScore: "#EF4444",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    color: MCVA.black,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    width: 24,
    height: 24,
    backgroundColor: MCVA.red,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 14,
    fontWeight: 700,
    color: MCVA.black,
  },
  headerDate: {
    fontSize: 9,
    color: MCVA.gray,
  },
  // Accent bar
  accentBar: {
    height: 4,
    backgroundColor: MCVA.red,
    marginBottom: 24,
  },
  // Title
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: MCVA.black,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: MCVA.gray,
    marginBottom: 24,
  },
  // Scores section
  scoresRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 30,
  },
  scoreBox: {
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: MCVA.lightGray,
    width: 140,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 700,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: 600,
    marginTop: 4,
  },
  scoreQuality: {
    fontSize: 9,
    marginTop: 2,
  },
  // Section
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: MCVA.black,
    marginBottom: 12,
    marginTop: 20,
  },
  // Dimension bars
  dimensionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dimensionLabel: {
    width: 140,
    fontSize: 9,
  },
  dimensionCode: {
    fontWeight: 700,
    marginRight: 6,
  },
  dimensionBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: MCVA.lightGray,
    borderRadius: 4,
    marginRight: 8,
  },
  dimensionBarFill: {
    height: 8,
    borderRadius: 4,
  },
  dimensionScore: {
    width: 30,
    fontSize: 9,
    fontWeight: 600,
    textAlign: "right",
  },
  // Items
  itemRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  itemCode: {
    width: 35,
    fontSize: 8,
    color: MCVA.gray,
    fontWeight: 600,
  },
  itemLabel: {
    flex: 1,
    fontSize: 8,
  },
  itemStatus: {
    width: 30,
    fontSize: 8,
    fontWeight: 600,
    textAlign: "center",
  },
  itemScore: {
    width: 25,
    fontSize: 8,
    fontWeight: 600,
    textAlign: "right",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MCVA.gray,
  },
  // Express CTA
  ctaBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: MCVA.red,
  },
  ctaTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: MCVA.red,
    marginBottom: 4,
  },
  ctaText: {
    fontSize: 9,
    color: MCVA.gray,
  },
  // Action Plan
  actionCard: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    backgroundColor: MCVA.white,
  },
  actionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 6,
    gap: 8,
  },
  actionPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 700,
    color: MCVA.white,
  },
  actionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: MCVA.black,
    flex: 1,
  },
  actionDescription: {
    fontSize: 8.5,
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
    fontSize: 7.5,
    color: MCVA.gray,
  },
  actionMetaValue: {
    fontWeight: 700,
    color: MCVA.black,
  },
  actionCategoryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
    fontSize: 7,
    backgroundColor: MCVA.lightGray,
    color: MCVA.gray,
  },
  // Summary box for action plan header
  actionSummaryBox: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
    padding: 12,
    backgroundColor: MCVA.lightGray,
    borderRadius: 6,
  },
  actionSummaryItem: {
    alignItems: "center" as const,
  },
  actionSummaryNumber: {
    fontSize: 18,
    fontWeight: 700,
  },
  actionSummaryLabel: {
    fontSize: 7.5,
    color: MCVA.gray,
    marginTop: 2,
  },
  // Ranking table
  rankingRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  rankingRowHighlight: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 3,
    borderLeftColor: MCVA.red,
  },
  rankingCell: {
    fontSize: 8.5,
  },
  rankingCellBold: {
    fontSize: 8.5,
    fontWeight: 700,
  },
  rankingHeader: {
    backgroundColor: MCVA.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  rankingPosition: {
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center" as const,
  },
  rankingPositionBox: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 16,
    borderRadius: 8,
    backgroundColor: MCVA.lightGray,
    width: 120,
  },
});

function getScoreColor(score: number): string {
  if (score >= 75) return MCVA.green;
  if (score >= 50) return MCVA.amber;
  if (score >= 25) return MCVA.orange;
  return MCVA.redScore;
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
  P1: "#DC2626", // red
  P2: "#EA580C", // orange
  P3: "#D97706", // amber
  P4: "#6B7280", // gray
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
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <View style={styles.logoMark}>
              <Text
                style={{
                  color: MCVA.white,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                +
              </Text>
            </View>
            <Text style={styles.logoText}>MCVA Consulting</Text>
          </View>
          <Text style={styles.headerDate}>{date}</Text>
        </View>

        {/* Accent bar */}
        <View style={styles.accentBar} />

        {/* Title */}
        <Text style={styles.title}>
          Audit {isExpress ? "Express" : "Complet"} SEO/GEO
        </Text>
        <Text style={styles.subtitle}>
          {audit.domain}
          {audit.sector ? ` — ${audit.sector}` : ""}
        </Text>

        {/* Scores */}
        <View style={styles.scoresRow}>
          <View style={styles.scoreBox}>
            <Text
              style={[
                styles.scoreValue,
                { color: getScoreColor(scores.score_seo) },
              ]}
            >
              {scores.score_seo}
            </Text>
            <Text style={styles.scoreLabel}>Score SEO</Text>
            <Text
              style={[
                styles.scoreQuality,
                { color: getScoreColor(scores.score_seo) },
              ]}
            >
              {getScoreLabel(scores.score_seo)}
            </Text>
          </View>
          <View style={styles.scoreBox}>
            <Text
              style={[
                styles.scoreValue,
                { color: getScoreColor(scores.score_geo) },
              ]}
            >
              {scores.score_geo}
            </Text>
            <Text style={styles.scoreLabel}>Score GEO</Text>
            <Text
              style={[
                styles.scoreQuality,
                { color: getScoreColor(scores.score_geo) },
              ]}
            >
              {getScoreLabel(scores.score_geo)}
            </Text>
          </View>
        </View>

        {isExpress && (
          <Text
            style={{
              fontSize: 9,
              color: MCVA.gray,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            8/8 dimensions analysées — {items.length} critères sur 30
            évalués
          </Text>
        )}

        {/* CORE-EEAT Dimensions */}
        <Text style={styles.sectionTitle}>Scores par dimension CORE-EEAT</Text>
        {["C", "O", "R", "E", "Exp", "Ept", "A", "T"].map((dim) => {
          const score =
            scores.score_core_eeat[dim] ?? 0;
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
                    {
                      width: `${score}%`,
                      backgroundColor: getScoreColor(score),
                    },
                  ]}
                />
              </View>
              <Text style={styles.dimensionScore}>{score}</Text>
            </View>
          );
        })}

        {/* Items detail */}
        {coreEeatItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Detail des criteres CORE-EEAT</Text>
            <View
              style={[
                styles.itemRow,
                { backgroundColor: MCVA.lightGray, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.itemCode, { fontWeight: 700 }]}>Code</Text>
              <Text style={[styles.itemLabel, { fontWeight: 700 }]}>
                Critere
              </Text>
              <Text style={[styles.itemStatus, { fontWeight: 700 }]}>
                Statut
              </Text>
              <Text style={[styles.itemScore, { fontWeight: 700 }]}>
                Score
              </Text>
            </View>
            {coreEeatItems.map((item) => (
              <View key={item.item_code} style={styles.itemRow}>
                <Text style={styles.itemCode}>{item.item_code}</Text>
                <Text style={styles.itemLabel}>{item.item_label}</Text>
                <Text
                  style={[
                    styles.itemStatus,
                    { color: getScoreColor(item.score) },
                  ]}
                >
                  {item.status === "pass"
                    ? "OK"
                    : item.status === "partial"
                      ? "~"
                      : "KO"}
                </Text>
                <Text style={styles.itemScore}>{item.score}</Text>
              </View>
            ))}
          </>
        )}

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
                        {
                          width: `${score}%`,
                          backgroundColor: getScoreColor(score),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.dimensionScore}>{score}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* CITE Items detail */}
        {citeItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Detail des criteres CITE</Text>
            <View
              style={[
                styles.itemRow,
                { backgroundColor: MCVA.lightGray, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.itemCode, { fontWeight: 700 }]}>Code</Text>
              <Text style={[styles.itemLabel, { fontWeight: 700 }]}>
                Critere
              </Text>
              <Text style={[styles.itemStatus, { fontWeight: 700 }]}>
                Statut
              </Text>
              <Text style={[styles.itemScore, { fontWeight: 700 }]}>
                Score
              </Text>
            </View>
            {citeItems.map((item) => (
              <View key={item.item_code} style={styles.itemRow}>
                <Text style={styles.itemCode}>{item.item_code}</Text>
                <Text style={styles.itemLabel}>{item.item_label}</Text>
                <Text
                  style={[
                    styles.itemStatus,
                    { color: getScoreColor(item.score) },
                  ]}
                >
                  {item.status === "pass"
                    ? "OK"
                    : item.status === "partial"
                      ? "~"
                      : "KO"}
                </Text>
                <Text style={styles.itemScore}>{item.score}</Text>
              </View>
            ))}
          </>
        )}

        {/* Express CTA */}
        {isExpress && (
          <View style={styles.ctaBox}>
            <Text style={styles.ctaTitle}>
              Passez à l'audit complet
            </Text>
            <Text style={styles.ctaText}>
              80 critères CORE-EEAT + 40 critères CITE + plan d'action
              priorisé + benchmark concurrentiel. Contactez votre consultant
              Arneo.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>MCVA Consulting SA — Confidentiel</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Action Plan — Page 2+ (full audit only) */}
      {!isExpress && actions.length > 0 && (
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <View style={styles.logoMark}>
                <Text style={{ color: MCVA.white, fontSize: 14, fontWeight: 700 }}>+</Text>
              </View>
              <Text style={styles.logoText}>MCVA Consulting</Text>
            </View>
            <Text style={styles.headerDate}>{date}</Text>
          </View>
          <View style={styles.accentBar} />

          <Text style={styles.title}>Plan d'action</Text>
          <Text style={styles.subtitle}>
            {audit.domain} — {actions.length} recommandations priorisees
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
            <View
              key={action.id || idx}
              style={styles.actionCard}
              wrap={false}
            >
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

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text>MCVA Consulting SA — Confidentiel</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </Page>
      )}

      {/* Benchmark Ranking Page (full audit only, if benchmark data exists) */}
      {!isExpress && benchmarkRanking && benchmarkRanking.domains.length > 0 && (
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <View style={styles.logoMark}>
                <Text style={{ color: MCVA.white, fontSize: 14, fontWeight: 700 }}>+</Text>
              </View>
              <Text style={styles.logoText}>MCVA Consulting</Text>
            </View>
            <Text style={styles.headerDate}>{date}</Text>
          </View>
          <View style={styles.accentBar} />

          <Text style={styles.title}>Positionnement sectoriel</Text>
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
                  style={[
                    styles.rankingRow,
                    isClient ? styles.rankingRowHighlight : {},
                  ]}
                  wrap={false}
                >
                  <Text style={[isClient ? styles.rankingCellBold : styles.rankingCell, { width: 30 }]}>
                    {d.rank_seo ?? "-"}
                  </Text>
                  <Text style={[isClient ? styles.rankingCellBold : styles.rankingCell, { flex: 1 }]}>
                    {d.domain}{isClient ? " ★" : ""}
                  </Text>
                  <Text
                    style={[
                      styles.rankingCellBold,
                      { width: 55, textAlign: "center", color: getScoreColor(d.score_seo ?? 0) },
                    ]}
                  >
                    {d.score_seo ?? "-"}
                  </Text>
                  <Text
                    style={[
                      styles.rankingCellBold,
                      { width: 55, textAlign: "center", color: getScoreColor(d.score_geo ?? 0) },
                    ]}
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

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text>MCVA Consulting SA — Confidentiel</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </Page>
      )}
    </Document>
  );
}
