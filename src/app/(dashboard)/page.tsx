"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/audit/score-gauge";
import type { Audit, AuditScores } from "@/types/audit";

interface AuditWithScores {
  audit: Audit;
  scores: AuditScores | null;
}

export default function DashboardPage() {
  const [recentAudits, setRecentAudits] = useState<AuditWithScores[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudits() {
      try {
        const res = await fetch("/api/audit");
        if (res.ok) {
          const data = await res.json();
          setRecentAudits(data.audits || []);
        }
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    }
    fetchAudits();
  }, []);

  const completedAudits = recentAudits.filter(
    (a) => a.audit.status === "completed"
  );
  const avgSeo =
    completedAudits.length > 0
      ? Math.round(
          completedAudits.reduce(
            (sum, a) => sum + (a.scores?.score_seo || 0),
            0
          ) / completedAudits.length
        )
      : 0;
  const avgGeo =
    completedAudits.length > 0
      ? Math.round(
          completedAudits.reduce(
            (sum, a) => sum + (a.scores?.score_geo || 0),
            0
          ) / completedAudits.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Vue d&apos;ensemble de vos audits SEO/GEO.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Audit Express</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  30 criteres — 2-3 minutes
                </p>
              </div>
              <Link href="/audit-express">
                <Button>Lancer</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Audit Complet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  120 criteres — 5-15 minutes
                </p>
              </div>
              <Link href="/audit-complet">
                <Button variant="outline">Lancer</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      {completedAudits.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{recentAudits.length}</p>
              <p className="text-sm text-muted-foreground">Audits lances</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{completedAudits.length}</p>
              <p className="text-sm text-muted-foreground">Audits termines</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{avgSeo}</p>
              <p className="text-sm text-muted-foreground">Score SEO moyen</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{avgGeo}</p>
              <p className="text-sm text-muted-foreground">Score GEO moyen</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent audits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audits recents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : recentAudits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Aucun audit pour le moment.</p>
              <Link href="/audit-express">
                <Button className="mt-4">Lancer votre premier audit</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAudits.map(({ audit, scores }) => (
                <div
                  key={audit.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{audit.domain}</span>
                        <Badge
                          variant={
                            audit.audit_type === "express"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {audit.audit_type === "express"
                            ? "Express"
                            : "Complet"}
                        </Badge>
                        <StatusBadge status={audit.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(audit.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {audit.sector ? ` — ${audit.sector}` : ""}
                      </p>
                    </div>
                  </div>
                  {scores && audit.status === "completed" && (
                    <div className="flex items-center gap-4">
                      <ScoreGauge
                        score={scores.score_seo}
                        label="SEO"
                        size="sm"
                      />
                      <ScoreGauge
                        score={scores.score_geo}
                        label="GEO"
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "En attente", variant: "outline" },
    processing: { label: "En cours", variant: "secondary" },
    completed: { label: "Termine", variant: "default" },
    error: { label: "Erreur", variant: "destructive" },
  };
  const { label, variant } = config[status] || config.pending;
  return <Badge variant={variant}>{label}</Badge>;
}
