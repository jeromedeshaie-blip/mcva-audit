import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { Audit, AuditScores, AuditItem } from "@/types/audit";

// Register Work Sans font (MCVA brand)
Font.register({
  family: "Work Sans",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/worksans/v19/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K0nXNi8.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/worksans/v19/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K3vXNi8.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/worksans/v19/QGY_z_wNahGAdqQ43RhVcIgYT2Xz5u32K0LXNi8.ttf",
      fontWeight: 700,
    },
  ],
});

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
    fontFamily: "Work Sans",
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

interface AuditPdfProps {
  audit: Audit;
  scores: AuditScores;
  items: AuditItem[];
}

export function AuditPdfDocument({ audit, scores, items }: AuditPdfProps) {
  const date = new Date(audit.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const coreEeatItems = items.filter((i) => i.framework === "core_eeat");
  const isExpress = audit.audit_type === "express";

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
            <Text style={styles.sectionTitle}>Detail des criteres</Text>
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
    </Document>
  );
}
