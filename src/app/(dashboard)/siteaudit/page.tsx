"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuditScoreCard } from "@/components/siteaudit/AuditScoreCard";
import { AuditCheckList } from "@/components/siteaudit/AuditCheckList";
import { AuditRecommendationCard } from "@/components/siteaudit/AuditRecommendationCard";
import { ScoreGauge } from "@/components/siteaudit/ScoreGauge";
import type { SiteAuditResult } from "@/lib/siteaudit/types";

export default function SiteAuditPage() {
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SiteAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith("http")) {
        targetUrl = `https://${targetUrl}`;
      }

      const res = await fetch("/api/siteaudit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'audit");
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site Audit</h1>
        <p className="text-muted-foreground mt-1">
          Audit technique SEO, performance, accessibilité et lisibilité
        </p>
      </div>

      {/* Formulaire */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="https://www.example.ch"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
            />
            <Input
              placeholder="Mots-clés (optionnel, séparés par des virgules)"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="flex-1"
            />
            <Button onClick={runAudit} disabled={loading || !url}>
              {loading ? "Analyse en cours..." : "Lancer l'audit"}
            </Button>
          </div>
          {loading && (
            <p className="text-sm text-muted-foreground mt-3">
              Crawl du site, analyse PageSpeed, vérifications SEO... Cela peut
              prendre 30 à 60 secondes.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Score global + gauges */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="pt-6 flex justify-center">
                <div className="relative">
                  <ScoreGauge
                    score={result.score_global}
                    label="Score global"
                    size={140}
                  />
                </div>
              </CardContent>
            </Card>
            <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <AuditScoreCard label="SEO Technique" score={result.score_seo} />
              <AuditScoreCard
                label="Performance"
                score={result.score_performance}
              />
              <AuditScoreCard
                label="Accessibilité"
                score={result.score_accessibility}
              />
              <AuditScoreCard
                label="Lisibilité"
                score={result.score_readability}
              />
            </div>
          </div>

          {/* Recommandations */}
          {result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Recommandations prioritaires ({result.recommendations.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.recommendations.map((r) => (
                  <AuditRecommendationCard key={r.id} recommendation={r} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Vérifications SEO détaillées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Vérifications SEO / GEO</CardTitle>
              </CardHeader>
              <CardContent>
                <AuditCheckList checks={result.seo_checks} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Données structurées (Schema.org)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.schema_data.schemas_found.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium mb-2">Schemas trouvés :</p>
                    <div className="flex flex-wrap gap-1">
                      {result.schema_data.schemas_found.map((s, i) => (
                        <span
                          key={i}
                          className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">
                    Aucune donnée structurée trouvée
                  </p>
                )}
                {result.schema_data.issues.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Problèmes :</p>
                    {result.schema_data.issues.map((issue, i) => (
                      <p
                        key={i}
                        className="text-xs text-muted-foreground flex items-center gap-1"
                      >
                        <span className="text-red-500">!</span> {issue}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Performance détaillée */}
          <Card>
            <CardHeader>
              <CardTitle>Performance (PageSpeed Insights)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">
                    {(result.performance_data.lcp / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-muted-foreground">
                    LCP (Largest Contentful Paint)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.performance_data.cls.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    CLS (Layout Shift)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.performance_data.fid}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    FID (First Input Delay)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.performance_data.ttfb}ms
                  </div>
                  <div className="text-xs text-muted-foreground">
                    TTFB (Time to First Byte)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {(result.performance_data.fcp / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-muted-foreground">
                    FCP (First Contentful Paint)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lisibilité */}
          <Card>
            <CardHeader>
              <CardTitle>Lisibilité du contenu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {result.readability_data.flesch_score}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Score Flesch
                  </div>
                  <div className="text-xs mt-0.5">
                    {result.readability_data.flesch_level}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.readability_data.word_count}
                  </div>
                  <div className="text-xs text-muted-foreground">Mots</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {result.readability_data.avg_sentence_length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mots / phrase (moy.)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold uppercase">
                    {result.readability_data.lang_detected}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Langue détectée
                  </div>
                </div>
              </div>
              {Object.keys(result.readability_data.keyword_density).length >
                0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">
                    Densité mots-clés :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      result.readability_data.keyword_density
                    ).map(([kw, density]) => (
                      <span
                        key={kw}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {kw}: {density}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accessibilité */}
          {result.accessibility_data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Accessibilité ({result.accessibility_data.length} violation
                  {result.accessibility_data.length > 1 ? "s" : ""})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.accessibility_data.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-start gap-2 p-2 bg-red-50 rounded text-sm"
                  >
                    <span className="text-red-600 font-bold shrink-0">!</span>
                    <div>
                      <span className="font-medium">{v.description}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({v.wcag_criteria})
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <p className="text-xs text-muted-foreground text-right">
            Audit réalisé en {(result.crawl_duration_ms / 1000).toFixed(1)}s —{" "}
            {result.pages_crawled} page(s) analysée(s) —{" "}
            {new Date(result.audited_at).toLocaleString("fr-CH")}
          </p>
        </>
      )}
    </div>
  );
}
