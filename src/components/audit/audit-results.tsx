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
                dimensions={scores.score_core_eeat}
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
              {Object.keys(scores.score_cite).length > 0 ? (
                <>
                  <DimensionBar dimensions={scores.score_cite} type="cite" />
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
              value={scores.geo_data.models_coverage?.toString() || "0"}
            />
            <MetricCard
              label="Citations detectees"
              value={scores.geo_data.citation_count?.toString() || "0"}
            />
            <MetricCard
              label="Marque mentionnee"
              value={scores.geo_data.brand_mentioned ? "Oui" : "Non"}
            />
            <MetricCard
              label="Sentiment"
              value={formatSentiment(scores.geo_data.brand_sentiment)}
            />
          </div>
          {scores.geo_data.models_tested && (
            <div className="mt-4 space-y-2">
              {scores.geo_data.models_tested.map((model) => (
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
