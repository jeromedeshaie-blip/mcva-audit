"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreGauge } from "./score-gauge";
import { DimensionBar } from "./dimension-bar";
import type { AuditScores, AuditItem, AuditAction } from "@/types/audit";
import { AUDIT_ITEM_COUNTS } from "@/lib/constants";

interface AuditResultsProps {
  scores: AuditScores;
  items: AuditItem[];
  actions: AuditAction[];
  auditType: "express" | "full";
}

export function AuditResults({
  scores,
  items,
  actions,
  auditType,
}: AuditResultsProps) {
  const totalItems = AUDIT_ITEM_COUNTS[auditType].total;
  const evaluatedItems = items.length;

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-12">
            <ScoreGauge score={scores.score_seo} label="Score SEO" size="lg" />
            <ScoreGauge score={scores.score_geo} label="Score GEO" size="lg" />
          </div>
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
          className="flex items-start gap-3 p-4 border rounded-lg"
        >
          <PriorityBadge priority={action.priority} />
          <div className="flex-1">
            <h4 className="font-medium text-sm">{action.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {action.description}
            </p>
            <div className="flex gap-4 mt-2">
              <span className="text-xs">
                Impact: <strong>+{action.impact_points} pts</strong>
              </span>
              <span className="text-xs">
                Effort: <strong>{action.effort}</strong>
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
    P1: "bg-red-600 text-white",
    P2: "bg-orange-500 text-white",
    P3: "bg-amber-400 text-black",
    P4: "bg-gray-300 text-black",
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-bold ${colors[priority] || colors.P4}`}
    >
      {priority}
    </span>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 bg-muted rounded-lg">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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
