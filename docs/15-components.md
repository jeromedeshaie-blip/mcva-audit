# 15 — Components

**Module** : 15 — Components
**Version** : 2.1 (tag `v2.1-release`)

Composants UI (shadcn), audit, LLM Watch, siteaudit. Inclut SectorCombobox (recherche secteur).

---

## `src/components/audit/audit-results.tsx`

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreGauge } from "./score-gauge";
import { DimensionBar } from "./dimension-bar";
import { TechnicalChecklist } from "./technical-checklist";
import type { AuditScores, AuditItem, AuditAction } from "@/types/audit";
import { AUDIT_ITEM_COUNTS } from "@/lib/constants";

interface AuditResultsProps {
  scores: AuditScores;
  items: AuditItem[];
  actions: AuditAction[];
  auditType: "express" | "full" | "ultra";
  isSpa?: boolean;
}

export function AuditResults({
  scores,
  items,
  actions,
  auditType,
  isSpa = false,
}: AuditResultsProps) {
  const totalItems = AUDIT_ITEM_COUNTS[auditType].total;
  const evaluatedItems = items.length;

  // Extract Site Audit scores if available (from enriched seo_data)
  const siteAuditScores = scores.seo_data?.site_audit_scores
    ? {
        seo: (scores.seo_data as any).site_audit_scores.seo ?? 0,
        performance: (scores.seo_data as any).site_audit_scores.performance ?? 0,
        accessibility: (scores.seo_data as any).site_audit_scores.accessibility ?? 0,
        readability: (scores.seo_data as any).site_audit_scores.readability ?? 0,
        global: (scores.seo_data as any).site_audit_global ?? 0,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* SPA Disclaimer */}
      {isSpa && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm">!</div>
              <div>
                <h4 className="font-heading font-semibold text-sm text-amber-900">Limitation technique detectee</h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Ce site utilise un rendu JavaScript cote client (SPA/Wix). Le contenu visible aux utilisateurs est genere dynamiquement
                  et n&apos;est pas present dans le HTML statique. Les scores refletent la visibilite reelle du contenu pour les moteurs
                  de recherche et les modeles d&apos;IA, qui partagent cette meme limitation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <ScoreGauge score={scores.score_seo} label="Score SEO" size="lg" />
            <ScoreGauge score={scores.score_geo} label="Score GEO" size="lg" />
            {siteAuditScores && (
              <ScoreGauge score={siteAuditScores.global} label="Score Technique" size="lg" />
            )}
          </div>
          {siteAuditScores && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <MetricCard label="SEO Technique" value={`${siteAuditScores.seo}/100`} />
              <MetricCard label="Performance" value={`${siteAuditScores.performance}/100`} />
              <MetricCard label="Accessibilite" value={`${siteAuditScores.accessibility}/100`} />
              <MetricCard label="Lisibilite" value={`${siteAuditScores.readability}/100`} />
            </div>
          )}
          {auditType === "express" && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              8/8 dimensions analysees — {evaluatedItems} criteres sur{" "}
              {totalItems} evalues
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dimension Details */}
      <Tabs defaultValue="core_eeat">
        <TabsList className="w-full">
          <TabsTrigger value="core_eeat" className="flex-1">
            CORE-EEAT
          </TabsTrigger>
          <TabsTrigger value="cite" className="flex-1">
            CITE
          </TabsTrigger>
          {(scores.seo_data?.technical_checks || auditType !== "express") && (
            <TabsTrigger value="technique" className="flex-1">
              Technique
            </TabsTrigger>
          )}
          {auditType === "ultra" && (
            <TabsTrigger value="themes" className="flex-1">
              7 Themes
            </TabsTrigger>
          )}
          {actions.length > 0 && (
            <TabsTrigger value="actions" className="flex-1">
              Plan d&apos;action
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="core_eeat">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Scores par dimension CORE-EEAT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DimensionBar
                dimensions={scores.score_core_eeat || {}}
                type="core_eeat"
              />
              <Separator className="my-6" />
              <ItemsList
                items={items.filter((i) => i.framework === "core_eeat")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cite">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Scores par dimension CITE
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(scores.score_cite || {}).length > 0 ? (
                <>
                  <DimensionBar dimensions={scores.score_cite || {}} type="cite" />
                  <Separator className="my-6" />
                  <ItemsList
                    items={items.filter((i) => i.framework === "cite")}
                  />
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Aucun critere CITE evalue pour cet audit.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(scores.seo_data?.technical_checks || auditType !== "express") && (
          <TabsContent value="technique">
            <TechnicalChecklist seoData={scores.seo_data} />
          </TabsContent>
        )}

        {auditType === "ultra" && (
          <TabsContent value="themes">
            <div className="space-y-6">
              {[
                { key: "perf", label: "Performance", score: scores.score_perf },
                { key: "a11y", label: "Accessibilite", score: scores.score_a11y },
                { key: "rgesn", label: "Eco-conception (RGESN)", score: scores.score_rgesn },
                { key: "tech", label: "Technique", score: scores.score_tech },
                { key: "contenu", label: "Contenu", score: scores.score_contenu },
              ].map((theme) => {
                const themeItems = items.filter((i) => i.framework === theme.key);
                if (themeItems.length === 0) return null;
                return (
                  <Card key={theme.key}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{theme.label}</CardTitle>
                        <Badge variant="outline" className="text-base px-3 py-1">
                          {theme.score ?? 0}/100
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ItemsList items={themeItems} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}

        {actions.length > 0 && (
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Plan d&apos;action priorite
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActionsList actions={actions} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* GEO Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visibilite IA (GEO)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Modeles testes"
              value={(scores.geo_data || {} as any).models_coverage?.toString() || "0"}
            />
            <MetricCard
              label="Citations detectees"
              value={(scores.geo_data || {} as any).citation_count?.toString() || "0"}
            />
            <MetricCard
              label="Marque mentionnee"
              value={(scores.geo_data || {} as any).brand_mentioned ? "Oui" : "Non"}
            />
            <MetricCard
              label="Sentiment"
              value={formatSentiment((scores.geo_data || {} as any).brand_sentiment)}
            />
          </div>
          {(scores.geo_data || {} as any).models_tested && (
            <div className="mt-4 space-y-2">
              {(scores.geo_data || {} as any).models_tested.map((model: any) => (
                <div
                  key={model.model}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="font-medium capitalize">{model.model}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={model.mentioned ? "default" : "secondary"}
                    >
                      {model.mentioned ? "Cite" : "Non cite"}
                    </Badge>
                    {model.mentioned && (
                      <Badge variant="outline">
                        {formatSentiment(model.sentiment)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ItemsList({ items }: { items: AuditItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-muted-foreground mb-3">
        Detail des criteres ({items.length} evalues)
      </h4>
      {items.map((item) => (
        <div
          key={item.item_code}
          className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
        >
          <StatusBadge status={item.status} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {item.item_code}
              </span>
              <span className="text-sm font-medium">{item.item_label}</span>
              {item.is_geo_first && (
                <Badge variant="outline" className="text-xs">
                  GEO
                </Badge>
              )}
            </div>
            {item.notes && (
              <p className="text-xs text-muted-foreground mt-1">
                {item.notes}
              </p>
            )}
          </div>
          <span className="font-bold text-sm">{item.score}</span>
        </div>
      ))}
    </div>
  );
}

function ActionsList({ actions }: { actions: AuditAction[] }) {
  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <div
          key={action.id}
          className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 ring-1 ring-foreground/5 hover:bg-muted/50 transition-colors"
        >
          <PriorityBadge priority={action.priority} />
          <div className="flex-1">
            <h4 className="font-heading font-semibold text-sm">{action.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {action.description}
            </p>
            <div className="flex flex-wrap gap-3 mt-2.5">
              <span className="text-xs bg-[#2A9D5C]/10 text-[#2A9D5C] px-2 py-0.5 rounded-full font-medium">
                +{action.impact_points} pts
              </span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {action.effort}
              </span>
              <Badge variant="outline" className="text-xs">
                {action.category}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    pass: { label: "OK", class: "bg-green-100 text-green-800" },
    partial: { label: "~", class: "bg-amber-100 text-amber-800" },
    fail: { label: "KO", class: "bg-red-100 text-red-800" },
  };
  const { label, class: cls } = config[status as keyof typeof config] || config.fail;
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    P1: "bg-[#8B2C2C] text-white",
    P2: "bg-[#A53535] text-white",
    P3: "bg-[#7A2525] text-white",
    P4: "bg-[#6B7280] text-white",
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold shadow-sm ${colors[priority] || colors.P4}`}
    >
      {priority}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-4 bg-gradient-to-b from-muted/50 to-muted rounded-xl ring-1 ring-foreground/5">
      <p className="text-2xl font-heading font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function formatSentiment(sentiment: string | undefined): string {
  const map: Record<string, string> = {
    positive: "Positif",
    neutral: "Neutre",
    negative: "Negatif",
    not_mentioned: "Non mentionne",
  };
  return map[sentiment || ""] || "N/A";
}

```


## `src/components/audit/dimension-bar.tsx`

```tsx
"use client";

interface DimensionBarProps {
  dimensions: Record<string, number>;
  type: "core_eeat" | "cite";
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
  T: "Confiance",
  E: "Engagement",
};

function getBarGradient(score: number): string {
  if (score >= 75) return "from-[#2A9D5C] to-[#34D399]";
  if (score >= 50) return "from-[#8B2C2C] to-[#A53535]";
  if (score >= 25) return "from-[#7A2525] to-[#8B2C2C]";
  return "from-[#6B2020] to-[#8B2C2C]";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-[#2A9D5C]";
  if (score >= 50) return "text-[#A53535]";
  if (score >= 25) return "text-[#A83D33]";
  return "text-[#8B2C2C]";
}

export function DimensionBar({ dimensions, type }: DimensionBarProps) {
  const labels = type === "core_eeat" ? CORE_EEAT_LABELS : CITE_LABELS;
  const orderedKeys =
    type === "core_eeat"
      ? ["C", "O", "R", "E", "Exp", "Ept", "A", "T"]
      : ["C", "I", "T", "E"];

  return (
    <div className="space-y-3">
      {orderedKeys.map((key) => {
        const score = dimensions[key] ?? 0;
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between text-sm items-baseline">
              <span className="text-muted-foreground">
                <span className="font-mono font-bold text-foreground mr-2 inline-flex items-center justify-center w-8 h-5 rounded bg-muted text-xs">
                  {key}
                </span>
                <span className="ml-1">{labels[key]}</span>
              </span>
              <span className={`font-bold tabular-nums ${getScoreColor(score)}`}>{score}</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(score)} transition-all duration-1000 ease-out`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

```


## `src/components/audit/score-gauge.tsx`

```tsx
"use client";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  // MCVA spectrum: from deep Swiss Red (low) → Coral (mid) → success green (high)
  if (score >= 75) return "#2A9D5C"; // vert succes
  if (score >= 50) return "#A53535"; // rouge vif MCVA
  if (score >= 25) return "#A83D33"; // rouge cuivre
  return "#8B2C2C"; // Swiss Red profond
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Bon";
  if (score >= 50) return "Moyen";
  if (score >= 25) return "Faible";
  return "Critique";
}

export function ScoreGauge({ score, label, size = "md" }: ScoreGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score || 0)));
  const sizes = {
    sm: { width: 100, stroke: 8, fontSize: 20, labelSize: 10 },
    md: { width: 140, stroke: 10, fontSize: 28, labelSize: 12 },
    lg: { width: 180, stroke: 12, fontSize: 36, labelSize: 14 },
  };

  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;
  const color = getScoreColor(clampedScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          width={width}
          height={width}
          className="-rotate-90"
          role="img"
          aria-label={`${label}: ${clampedScore} sur 100 — ${getScoreLabel(clampedScore)}`}
        >
          <defs>
            <linearGradient id={`gauge-grad-${label.replace(/\s/g, "")}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/60"
          />
          {/* Score arc */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={`url(#gauge-grad-${label.replace(/\s/g, "")})`}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
          {/* Score text */}
          <text
            x={width / 2}
            y={width / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="rotate-90 origin-center fill-foreground"
            style={{ fontSize, fontFamily: "var(--font-heading)", fontWeight: 700 }}
          >
            {clampedScore}
          </text>
        </svg>
      </div>
      <div className="text-center">
        <p className="font-heading font-semibold text-sm">{label}</p>
        <p className="text-xs font-medium" style={{ color }}>
          {getScoreLabel(score)}
        </p>
      </div>
    </div>
  );
}

```


## `src/components/audit/technical-checklist.tsx`

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { TechnicalCheck, SchemaDetail, ReadabilityData, SeoData } from "@/types/audit";

interface TechnicalChecklistProps {
  seoData: SeoData;
}

export function TechnicalChecklist({ seoData }: TechnicalChecklistProps) {
  const checks = seoData.technical_checks || [];
  const schema = seoData.schema_detail;
  const readability = seoData.readability;

  if (checks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm text-center">
            Audit technique non disponible pour cet audit.
          </p>
        </CardContent>
      </Card>
    );
  }

  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const techScore = Math.round(((passCount + warnCount * 0.5) / checks.length) * 100);

  // Group checks by category
  const metaChecks = checks.filter((c) => ["title_present", "title_length", "meta_description", "meta_description_length"].includes(c.id));
  const structureChecks = checks.filter((c) => ["h1_present", "h1_unique", "h2_present"].includes(c.id));
  const techChecks = checks.filter((c) => ["https", "viewport", "canonical", "robots_txt", "sitemap", "images_alt"].includes(c.id));
  const geoChecks = checks.filter((c) => ["hreflang", "schema_local_business", "schema_faq", "schema_breadcrumb"].includes(c.id));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">{techScore}/100</h3>
              <p className="text-sm text-muted-foreground">Score technique</p>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                {passCount} OK
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                {warnCount} Attention
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                {failCount} Echec
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${techScore >= 75 ? "bg-green-500" : techScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              style={{ width: `${techScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Meta Tags */}
      <CheckSection title="Balises Meta" checks={metaChecks} />

      {/* Structure */}
      <CheckSection title="Structure H1/H2" checks={structureChecks} />

      {/* Technical */}
      <CheckSection title="Fondamentaux techniques" checks={techChecks} />

      {/* GEO / Schema / Hreflang */}
      <CheckSection title="Visibilite IA (GEO)" checks={geoChecks} />

      {/* Schema.org Detail */}
      {schema && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Schema.org detecte</CardTitle>
          </CardHeader>
          <CardContent>
            {schema.schemas_found.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {schema.schemas_found.map((s, i) => (
                  <Badge key={i} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">Aucun schema detecte</p>
            )}
            {schema.issues.length > 0 && (
              <div className="space-y-1">
                {schema.issues.map((issue, i) => (
                  <p key={i} className="text-xs text-amber-600">
                    {issue}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Readability */}
      {readability && readability.word_count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Lisibilite du contenu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ReadabilityMetric label="Score Flesch" value={`${readability.flesch_score}/100`} sub={readability.flesch_level} />
              <ReadabilityMetric label="Langue" value={readability.lang_detected.toUpperCase()} />
              <ReadabilityMetric label="Mots" value={readability.word_count.toLocaleString()} />
              <ReadabilityMetric
                label="Mots/phrase"
                value={readability.avg_sentence_length.toString()}
                sub={readability.avg_sentence_length > 25 ? "Trop long" : readability.avg_sentence_length < 10 ? "Tres court" : "Bon"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance (Core Web Vitals) */}
      {(seoData as any).performance_data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Performance (Core Web Vitals)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <ReadabilityMetric
                label="Score Mobile"
                value={`${(seoData as any).performance_data.mobile?.score ?? 0}/100`}
                sub={(seoData as any).performance_data.mobile?.score >= 90 ? "Excellent" : (seoData as any).performance_data.mobile?.score >= 50 ? "A ameliorer" : "Critique"}
              />
              <ReadabilityMetric
                label="Score Desktop"
                value={`${(seoData as any).performance_data.desktop?.score ?? 0}/100`}
              />
              <ReadabilityMetric
                label="LCP"
                value={`${Math.round(((seoData as any).performance_data.mobile?.lcp ?? 0) / 100) / 10}s`}
                sub={(seoData as any).performance_data.mobile?.lcp <= 2500 ? "Bon" : "Lent"}
              />
              <ReadabilityMetric
                label="CLS"
                value={`${((seoData as any).performance_data.mobile?.cls ?? 0).toFixed(3)}`}
                sub={(seoData as any).performance_data.mobile?.cls <= 0.1 ? "Bon" : "Instable"}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <ReadabilityMetric
                label="TTFB"
                value={`${Math.round((seoData as any).performance_data.mobile?.ttfb ?? 0)}ms`}
              />
              <ReadabilityMetric
                label="FCP"
                value={`${Math.round(((seoData as any).performance_data.mobile?.fcp ?? 0) / 100) / 10}s`}
              />
              <ReadabilityMetric
                label="FID"
                value={`${Math.round((seoData as any).performance_data.mobile?.fid ?? 0)}ms`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hreflang Detail */}
      {seoData.hreflang_tags && seoData.hreflang_tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Versions linguistiques (hreflang)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {seoData.hreflang_tags.map((tag, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                  <Badge variant="secondary">{tag.lang}</Badge>
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">{tag.href}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CheckSection({ title, checks }: { title: string; checks: TechnicalCheck[] }) {
  if (checks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {checks.map((check) => (
            <div key={check.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <CheckStatusIcon status={check.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{check.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {check.impact === "both" ? "SEO+GEO" : check.impact.toUpperCase()}
                  </Badge>
                </div>
                {check.value && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{check.value}</p>
                )}
                {check.description && check.status !== "pass" && (
                  <p className="text-xs text-amber-600 mt-0.5">{check.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CheckStatusIcon({ status }: { status: string }) {
  const config = {
    pass: { label: "\u2713", cls: "bg-green-100 text-green-800" },
    warn: { label: "!", cls: "bg-amber-100 text-amber-800" },
    fail: { label: "\u2717", cls: "bg-red-100 text-red-800" },
  };
  const { label, cls } = config[status as keyof typeof config] || config.fail;
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function ReadabilityMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center p-3 bg-muted rounded-lg">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

```


## `src/components/llmwatch/AlertBadge.tsx`

```tsx
"use client";

import { Badge } from "@/components/ui/badge";

const ALERT_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  competitor_gain: { label: "Concurrent en hausse", variant: "destructive" },
  competitor_loss: { label: "Concurrent en baisse", variant: "secondary" },
  client_drop: { label: "Baisse detectee", variant: "destructive" },
};

interface AlertBadgeProps {
  alertType: string;
  message: string;
  delta: number;
  createdAt: string;
}

export function AlertBadge({ alertType, message, delta, createdAt }: AlertBadgeProps) {
  const config = ALERT_CONFIG[alertType] || { label: alertType, variant: "default" as const };
  const date = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
      <Badge variant={config.variant} className="shrink-0 mt-0.5">
        {config.label}
      </Badge>
      <div className="flex-1">
        <p className="text-sm">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{date}</p>
      </div>
      <span className={`text-sm font-bold ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
        {delta > 0 ? "+" : ""}{delta}
      </span>
    </div>
  );
}

```


## `src/components/llmwatch/BenchmarkTable.tsx`

```tsx
"use client";

import { Badge } from "@/components/ui/badge";

interface BenchmarkEntry {
  name: string;
  score: number;
  delta?: number;
  isClient?: boolean;
}

interface BenchmarkTableProps {
  entries: BenchmarkEntry[];
  clientName: string;
}

export function BenchmarkTable({ entries, clientName }: BenchmarkTableProps) {
  const sorted = [...entries].sort((a, b) => b.score - a.score);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-semibold w-12">#</th>
            <th className="text-left p-3 font-semibold">Entreprise</th>
            <th className="text-center p-3 font-semibold w-24">Score</th>
            <th className="text-center p-3 font-semibold w-24">Variation</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, idx) => {
            const isClient = entry.name === clientName || entry.isClient;
            return (
              <tr
                key={entry.name}
                className={`border-b ${isClient ? "bg-primary/5 font-semibold" : ""}`}
              >
                <td className="p-3 text-muted-foreground font-bold">{idx + 1}</td>
                <td className="p-3">
                  {entry.name}
                  {isClient && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Vous
                    </Badge>
                  )}
                </td>
                <td className="text-center p-3">
                  <span className={`font-bold ${entry.score >= 50 ? "text-green-600" : entry.score >= 25 ? "text-amber-600" : "text-red-600"}`}>
                    {entry.score}
                  </span>
                </td>
                <td className="text-center p-3">
                  {entry.delta !== undefined && (
                    <span className={`text-xs font-semibold ${entry.delta > 0 ? "text-green-600" : entry.delta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {entry.delta > 0 ? "+" : ""}{entry.delta}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

```


## `src/components/llmwatch/CitationBlock.tsx`

```tsx
"use client";

import { Badge } from "@/components/ui/badge";

const LLM_NAMES: Record<string, string> = {
  openai: "ChatGPT",
  perplexity: "Perplexity",
  anthropic: "Claude",
  gemini: "Gemini",
};

const LANG_LABELS: Record<string, string> = {
  fr: "FR",
  de: "DE",
  en: "EN",
};

interface CitationBlockProps {
  llm: string;
  lang: string;
  snippet: string | null;
  rank: number | null;
  cited: boolean;
  collectedAt: string;
}

export function CitationBlock({ llm, lang, snippet, rank, cited, collectedAt }: CitationBlockProps) {
  const date = new Date(collectedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className={`rounded-lg border p-4 ${cited ? "border-green-200 bg-green-50/50" : "border-muted"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={cited ? "default" : "secondary"}>
            {LLM_NAMES[llm] || llm}
          </Badge>
          <Badge variant="outline">{LANG_LABELS[lang] || lang}</Badge>
          {rank && (
            <span className="text-xs font-bold text-primary">
              #{rank}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      {snippet ? (
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
          &ldquo;{snippet}&rdquo;
        </blockquote>
      ) : (
        <p className="text-sm text-muted-foreground">Non cite</p>
      )}
    </div>
  );
}

```


## `src/components/llmwatch/CompetitiveGap.tsx`

```tsx
"use client";

interface GapEntry {
  name: string;
  score: number;
  isClient?: boolean;
}

export function CompetitiveGap({
  entries,
  clientName,
}: {
  entries: GapEntry[];
  clientName: string;
}) {
  if (entries.length < 2) return null;

  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const clientEntry = sorted.find((e) => e.isClient);
  const clientScore = clientEntry?.score ?? 0;
  const leader = sorted[0];
  const clientRank = sorted.findIndex((e) => e.isClient) + 1;

  const gapToLeader = clientEntry && !clientEntry.isClient
    ? leader.score - clientScore
    : sorted.length > 1
    ? sorted[1].score - clientScore
    : 0;

  const aheadOf = sorted.filter((e) => !e.isClient && e.score < clientScore);
  const behindOf = sorted.filter((e) => !e.isClient && e.score > clientScore);

  return (
    <div className="space-y-4">
      {/* Position summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            {clientRank}/{sorted.length}
          </div>
          <div className="text-xs text-muted-foreground">Position</div>
        </div>
        <div className="flex-1 space-y-1">
          {clientRank === 1 ? (
            <p className="text-sm text-green-700 font-medium">
              Vous êtes en tête du classement
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {leader.score - clientScore} pts
              </span>{" "}
              de retard sur {leader.name} (leader)
            </p>
          )}
          {aheadOf.length > 0 && (
            <p className="text-xs text-green-600">
              Devant {aheadOf.map((e) => e.name).join(", ")}
            </p>
          )}
          {behindOf.length > 0 && (
            <p className="text-xs text-red-500">
              Derrière {behindOf.map((e) => e.name).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Visual bar chart */}
      <div className="space-y-2">
        {sorted.map((entry) => {
          const maxScore = Math.max(...sorted.map((e) => e.score), 1);
          const width = Math.max((entry.score / maxScore) * 100, 2);
          const isClient = entry.isClient;

          return (
            <div key={entry.name} className="flex items-center gap-2">
              <span
                className={`text-xs w-24 truncate ${
                  isClient ? "font-bold" : ""
                }`}
                title={entry.name}
              >
                {entry.name}
              </span>
              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm transition-all ${
                    isClient ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span
                className={`text-xs w-8 text-right ${
                  isClient ? "font-bold" : "text-muted-foreground"
                }`}
              >
                {entry.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

```


## `src/components/llmwatch/LanguageBreakdown.tsx`

```tsx
"use client";

import { Progress } from "@/components/ui/progress";

const LANG_LABELS: Record<string, string> = {
  fr: "Français",
  de: "Deutsch",
  en: "English",
};

const LANG_FLAGS: Record<string, string> = {
  fr: "FR",
  de: "DE",
  en: "EN",
};

export function LanguageBreakdown({
  scoreByLang,
}: {
  scoreByLang: Record<string, number>;
}) {
  const langs = ["fr", "de", "en"];

  return (
    <div className="space-y-3">
      {langs.map((lang) => {
        const score = scoreByLang[lang] ?? 0;
        return (
          <div key={lang} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {LANG_FLAGS[lang]}
                </span>
                <span>{LANG_LABELS[lang]}</span>
              </span>
              <span className="font-medium">{score}/100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}

```


## `src/components/llmwatch/LlmBreakdown.tsx`

```tsx
"use client";

import { Progress } from "@/components/ui/progress";

const LLM_LABELS: Record<string, { label: string; color: string }> = {
  openai: { label: "ChatGPT", color: "bg-green-600" },
  perplexity: { label: "Perplexity", color: "bg-blue-600" },
  anthropic: { label: "Claude", color: "bg-orange-600" },
  gemini: { label: "Gemini", color: "bg-purple-600" },
};

interface LlmBreakdownProps {
  scoreByLlm: Record<string, number>;
}

export function LlmBreakdown({ scoreByLlm }: LlmBreakdownProps) {
  const llms = Object.entries(LLM_LABELS);

  return (
    <div className="space-y-3">
      {llms.map(([key, { label }]) => {
        const score = scoreByLlm[key] ?? 0;
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="font-bold">{score}/100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}

```


## `src/components/llmwatch/QueryResultsTable.tsx`

```tsx
"use client";

interface QueryResult {
  id: string;
  query_id: string;
  llm: string;
  lang: string;
  cited: boolean;
  rank: number | null;
  snippet: string | null;
  collected_at: string;
}

interface QueryInfo {
  id: string;
  text_fr: string;
  text_de: string | null;
  text_en: string | null;
}

const LLM_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  gemini: "Gemini",
};

const LANG_LABELS: Record<string, string> = {
  fr: "FR",
  de: "DE",
  en: "EN",
};

export function QueryResultsTable({
  results,
  queries,
}: {
  results: QueryResult[];
  queries: QueryInfo[];
}) {
  const queryMap = new Map(queries.map((q) => [q.id, q]));

  // Group results by query
  const grouped = new Map<string, QueryResult[]>();
  for (const r of results) {
    const key = r.query_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  if (grouped.size === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun résultat détaillé disponible.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([queryId, qResults]) => {
        const query = queryMap.get(queryId);
        const queryLabel = query?.text_fr || queryId.slice(0, 8);

        // Build matrix: LLM x Lang
        const llms = ["openai", "anthropic", "perplexity", "gemini"];
        const langs = ["fr", "de", "en"];

        return (
          <div key={queryId} className="space-y-2">
            <h4 className="text-sm font-medium truncate" title={queryLabel}>
              {queryLabel}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-1.5 border-b font-medium text-muted-foreground">
                      LLM
                    </th>
                    {langs.map((lang) => (
                      <th
                        key={lang}
                        className="text-center p-1.5 border-b font-medium text-muted-foreground"
                      >
                        {LANG_LABELS[lang]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {llms.map((llm) => (
                    <tr key={llm} className="border-b last:border-0">
                      <td className="p-1.5 font-medium">
                        {LLM_LABELS[llm] || llm}
                      </td>
                      {langs.map((lang) => {
                        const result = qResults.find(
                          (r) => r.llm === llm && r.lang === lang
                        );
                        if (!result) {
                          return (
                            <td
                              key={lang}
                              className="text-center p-1.5 text-muted-foreground"
                            >
                              —
                            </td>
                          );
                        }
                        return (
                          <td key={lang} className="text-center p-1.5">
                            {result.cited ? (
                              <span
                                className="inline-flex items-center gap-1 text-green-700"
                                title={result.snippet || ""}
                              >
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                {result.rank ? `#${result.rank}` : "Cité"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-500">
                                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                                Non
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

```


## `src/components/llmwatch/RecommendationCard.tsx`

```tsx
"use client";

import type { LlmWatchRecommendation } from "@/lib/llmwatch/types";

const CATEGORY_LABELS: Record<string, string> = {
  content: "Contenu",
  technical: "Technique",
  brand: "Marque",
  competitive: "Concurrence",
  multilingual: "Multilingue",
};

const CATEGORY_COLORS: Record<string, string> = {
  content: "bg-blue-100 text-blue-800",
  technical: "bg-purple-100 text-purple-800",
  brand: "bg-amber-100 text-amber-800",
  competitive: "bg-red-100 text-red-800",
  multilingual: "bg-green-100 text-green-800",
};

const IMPACT_LABELS: Record<string, string> = {
  high: "Impact fort",
  medium: "Impact moyen",
  low: "Impact faible",
};

const EFFORT_LABELS: Record<string, string> = {
  low: "Effort faible",
  medium: "Effort moyen",
  high: "Effort élevé",
};

const PRIORITY_ICONS: Record<number, string> = {
  1: "🔴",
  2: "🟠",
  3: "🟡",
};

export function RecommendationCard({
  recommendation,
}: {
  recommendation: LlmWatchRecommendation;
}) {
  const { priority, category, title, description, impact, effort } = recommendation;

  return (
    <div className="border rounded-lg p-4 space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{PRIORITY_ICONS[priority] || "⚪"}</span>
          <h4 className="font-medium text-sm">{title}</h4>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
            CATEGORY_COLORS[category] || "bg-gray-100 text-gray-800"
          }`}
        >
          {CATEGORY_LABELS[category] || category}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex gap-3 text-xs text-muted-foreground">
        {impact && <span>{IMPACT_LABELS[impact]}</span>}
        {effort && (
          <>
            <span>·</span>
            <span>{EFFORT_LABELS[effort]}</span>
          </>
        )}
      </div>
    </div>
  );
}

```


## `src/components/llmwatch/ScoreCard.tsx`

```tsx
"use client";

interface ScoreCardProps {
  label: string;
  value: number | string;
  delta?: number;
  unit?: string;
  size?: "sm" | "lg";
}

export function ScoreCard({ label, value, delta, unit, size = "sm" }: ScoreCardProps) {
  const deltaColor =
    delta === undefined
      ? ""
      : delta > 0
        ? "text-green-700"
        : delta < 0
          ? "text-red-700"
          : "text-muted-foreground";
  const deltaSign = delta !== undefined && delta > 0 ? "+" : "";

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className={`font-black ${size === "lg" ? "text-5xl" : "text-3xl"}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {delta !== undefined && (
        <p className={`text-xs font-semibold mt-1 ${deltaColor}`}>
          {deltaSign}{delta} pts
        </p>
      )}
    </div>
  );
}

```


## `src/components/llmwatch/ScoreChart.tsx`

```tsx
"use client";

interface ScoreChartProps {
  data: Array<{ week: string; score: number }>;
  height?: number;
}

/**
 * Simple SVG line chart for score evolution.
 * No external dependency — lightweight inline chart.
 */
export function ScoreChart({ data, height = 200 }: ScoreChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Pas encore de donnees
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxScore = Math.max(...data.map((d) => d.score), 100);
  const minScore = 0;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + (1 - (d.score - minScore) / (maxScore - minScore)) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Area fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((val) => {
        const y = padding.top + (1 - val / maxScore) * chartH;
        return (
          <g key={val}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E5E7EB" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">
              {val}
            </text>
          </g>
        );
      })}

      {/* Area */}
      <path d={areaD} fill="rgba(139, 44, 44, 0.08)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#8B2C2C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#8B2C2C" stroke="white" strokeWidth={2} />
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => {
        // Show every other label if too many
        if (data.length > 8 && i % 2 !== 0) return null;
        const label = new Date(p.week).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        return (
          <text key={i} x={p.x} y={height - 5} textAnchor="middle" fontSize={9} fill="#9CA3AF">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

```


## `src/components/siteaudit/AuditCheckList.tsx`

```tsx
"use client";

import type { SeoCheck } from "@/lib/siteaudit/types";

const STATUS_ICON: Record<string, string> = {
  pass: "✓",
  warn: "⚠",
  fail: "✗",
};

const STATUS_COLOR: Record<string, string> = {
  pass: "text-green-600",
  warn: "text-yellow-600",
  fail: "text-red-600",
};

const STATUS_BG: Record<string, string> = {
  pass: "bg-green-50",
  warn: "bg-yellow-50",
  fail: "bg-red-50",
};

export function AuditCheckList({ checks }: { checks: SeoCheck[] }) {
  const grouped = {
    fail: checks.filter((c) => c.status === "fail"),
    warn: checks.filter((c) => c.status === "warn"),
    pass: checks.filter((c) => c.status === "pass"),
  };

  const allChecks = [...grouped.fail, ...grouped.warn, ...grouped.pass];

  return (
    <div className="space-y-1.5">
      {allChecks.map((check) => (
        <div
          key={check.id}
          className={`flex items-start gap-2 p-2 rounded text-sm ${STATUS_BG[check.status]}`}
        >
          <span className={`font-bold ${STATUS_COLOR[check.status]} shrink-0`}>
            {STATUS_ICON[check.status]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{check.label}</span>
              {check.impact === "geo" && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">
                  GEO
                </span>
              )}
              {check.impact === "both" && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
                  SEO+GEO
                </span>
              )}
            </div>
            {check.value && (
              <p className="text-xs text-muted-foreground truncate">
                {check.value}
              </p>
            )}
            {check.status !== "pass" && check.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {check.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

```


## `src/components/siteaudit/AuditRecommendationCard.tsx`

```tsx
"use client";

import type { AuditRecommendation } from "@/lib/siteaudit/types";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-l-red-500 bg-red-50",
  high: "border-l-orange-500 bg-orange-50",
  medium: "border-l-yellow-500 bg-yellow-50",
  low: "border-l-blue-500 bg-blue-50",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critique",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

const DIMENSION_LABELS: Record<string, string> = {
  seo: "SEO",
  performance: "Performance",
  accessibility: "Accessibilité",
  readability: "Lisibilité",
  geo: "GEO / LLM",
};

export function AuditRecommendationCard({
  recommendation,
}: {
  recommendation: AuditRecommendation;
}) {
  const { priority, dimension, title, description, action, impact_points, effort } =
    recommendation;

  return (
    <div
      className={`border-l-4 rounded-r-lg p-4 space-y-2 ${PRIORITY_COLORS[priority]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm">{title}</h4>
        <div className="flex gap-1 shrink-0">
          <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded">
            {PRIORITY_LABELS[priority]}
          </span>
          <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded">
            {DIMENSION_LABELS[dimension]}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="bg-white/60 rounded p-2">
        <p className="text-xs font-medium">Action :</p>
        <p className="text-xs text-muted-foreground">{action}</p>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>+{impact_points} pts estimés</span>
        <span>
          Effort :{" "}
          {effort === "low" ? "faible" : effort === "medium" ? "moyen" : "élevé"}
        </span>
      </div>
    </div>
  );
}

```


## `src/components/siteaudit/AuditScoreCard.tsx`

```tsx
"use client";

function getColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function getBg(score: number): string {
  if (score >= 80) return "bg-green-50 border-green-200";
  if (score >= 60) return "bg-yellow-50 border-yellow-200";
  if (score >= 40) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

export function AuditScoreCard({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon?: string;
}) {
  return (
    <div className={`border rounded-lg p-4 ${getBg(score)}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </span>
      </div>
      <div className={`text-3xl font-bold mt-1 ${getColor(score)}`}>
        {score}
        <span className="text-sm font-normal text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

```


## `src/components/siteaudit/ScoreGauge.tsx`

```tsx
"use client";

function getColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getStrokeColor(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 60) return "stroke-yellow-500";
  if (score >= 40) return "stroke-orange-500";
  return "stroke-red-500";
}

export function ScoreGauge({
  score,
  label,
  size = 120,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={getStrokeColor(score)}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className={`text-2xl font-bold ${getColor(score)}`}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
      <span className="text-xs font-medium text-muted-foreground mt-1">
        {label}
      </span>
    </div>
  );
}

```


## `src/components/ui/badge.tsx`

```tsx
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }

```


## `src/components/ui/button.tsx`

```tsx
"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#6B1E1E] via-[#8B2C2C] to-[#A53535] text-white shadow-sm hover:from-[#5C1A1A] hover:via-[#7A2525] hover:to-[#8B2C2C] [a]:hover:from-[#5C1A1A] [a]:hover:via-[#7A2525] [a]:hover:to-[#8B2C2C]",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```


## `src/components/ui/card.tsx`

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground shadow-sm ring-1 ring-foreground/5 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl hover:shadow-md transition-shadow",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

```


## `src/components/ui/input.tsx`

```tsx
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }

```


## `src/components/ui/label.tsx`

```tsx
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }

```


## `src/components/ui/progress.tsx`

```tsx
"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("h-full bg-gradient-to-r from-[#6B1E1E] via-[#8B2C2C] to-[#A53535] transition-all", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-sm text-muted-foreground tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}

```


## `src/components/ui/sector-combobox.tsx`

```tsx
"use client";

import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDownIcon, SearchIcon, CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTOR_GROUPS } from "@/lib/constants";
import type { SectorGroup } from "@/lib/constants";

interface SectorComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Show group-level items as selectable options (for classements dual view) */
  allowGroupSelection?: boolean;
}

/** Find the label for a given sector/sub-sector value */
function findLabel(value: string): string {
  for (const group of SECTOR_GROUPS) {
    if (group.value === value) return group.label;
    for (const sub of group.subSectors) {
      if (sub.value === value) return sub.label;
    }
  }
  return "";
}

/** Find which group a sub-sector belongs to */
export function findParentGroup(subSectorValue: string): SectorGroup | undefined {
  return SECTOR_GROUPS.find(
    (g) =>
      g.value === subSectorValue ||
      g.subSectors.some((s) => s.value === subSectorValue)
  );
}

export function SectorCombobox({
  value,
  onValueChange,
  placeholder = "Rechercher un secteur...",
  disabled = false,
  className,
  allowGroupSelection = false,
}: SectorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  // Filter groups and sub-sectors based on search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return SECTOR_GROUPS;

    return SECTOR_GROUPS.map((group) => {
      const groupMatches = group.label.toLowerCase().includes(q);
      const matchingSubs = group.subSectors.filter((s) =>
        s.label.toLowerCase().includes(q)
      );

      if (groupMatches) return group; // Show entire group if group name matches
      if (matchingSubs.length > 0) {
        return { ...group, subSectors: matchingSubs };
      }
      return null;
    }).filter(Boolean) as SectorGroup[];
  }, [search]);

  const selectedLabel = value ? findLabel(value) : "";

  function handleSelect(val: string) {
    onValueChange(val);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange("");
    setSearch("");
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none h-8",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selectedLabel && "text-muted-foreground"
        )}
      >
        <span className="flex-1 text-left truncate">
          {selectedLabel || placeholder}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              <XIcon className="size-3 text-muted-foreground" />
            </span>
          )}
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Taper pour filtrer..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucun secteur trouve.
              </p>
            ) : (
              filtered.map((group) => (
                <div key={group.value} className="scroll-my-1 p-1">
                  {allowGroupSelection ? (
                    <button
                      type="button"
                      onClick={() => handleSelect(group.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer",
                        value === group.value
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {value === group.value && (
                        <CheckIcon className="size-3 shrink-0" />
                      )}
                      {group.label}
                    </button>
                  ) : (
                    <div className="px-1.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </div>
                  )}
                  {group.subSectors.map((sub) => (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => handleSelect(sub.value)}
                      className={cn(
                        "relative flex w-full items-center gap-1.5 rounded-md py-1.5 pr-8 pl-3 text-sm outline-hidden select-none transition-colors cursor-pointer",
                        value === sub.value
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="flex-1 text-left">{sub.label}</span>
                      {value === sub.value && (
                        <CheckIcon className="absolute right-2 size-4" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

```


## `src/components/ui/select.tsx`

```tsx
"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex flex-1 text-left", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn("relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}

```


## `src/components/ui/separator.tsx`

```tsx
"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }

```


## `src/components/ui/tabs.tsx`

```tsx
"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }

```

