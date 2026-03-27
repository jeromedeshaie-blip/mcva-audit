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
