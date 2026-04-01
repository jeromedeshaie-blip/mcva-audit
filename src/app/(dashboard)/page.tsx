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
    <div className="space-y-8">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0808] via-[#1A0F0F] to-[#2A1515] p-8 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, #A53535 0%, transparent 50%), radial-gradient(circle at 80% 50%, #8B2C2C 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-white/60 mt-2 max-w-xl">
            Vue d&apos;ensemble de vos audits SEO/GEO. Lancez un audit pour
            evaluer la visibilite de votre site sur les moteurs de recherche et les IA generatives.
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="group relative overflow-hidden border-transparent bg-gradient-to-br from-[#FFFFFF] to-white">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#8B2C2C] to-[#A53535]" />
          <CardContent className="pt-6 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg">Audit Express</h3>
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
        <Card className="group relative overflow-hidden border-transparent bg-gradient-to-br from-[#FFFFFF] to-white">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#A53535] to-[#7A2525]" />
          <CardContent className="pt-6 pl-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-lg">Audit Complet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  120 criteres — 30-60 secondes
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
          <StatCard value={recentAudits.length} label="Audits lances" />
          <StatCard value={completedAudits.length} label="Audits termines" />
          <StatCard value={avgSeo} label="Score SEO moyen" suffix="/100" />
          <StatCard value={avgGeo} label="Score GEO moyen" suffix="/100" />
        </div>
      )}

      {/* Recent audits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Audits recents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          ) : recentAudits.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8B2C2C]/10 to-[#A53535]/10 mx-auto mb-4 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#A53535]">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-muted-foreground font-medium">Aucun audit pour le moment.</p>
              <p className="text-sm text-muted-foreground mt-1">Lancez votre premier audit pour commencer.</p>
              <Link href="/audit-express">
                <Button className="mt-4">Lancer votre premier audit</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentAudits.map(({ audit, scores }) => (
                <Link
                  key={audit.id}
                  href={`/audit/${audit.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold group-hover:text-[#8B2C2C] transition-colors">{audit.domain}</span>
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
                  <div className="flex items-center gap-4">
                    {scores && audit.status === "completed" && (
                      <>
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
                      </>
                    )}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-muted-foreground/40 group-hover:text-[#A53535] transition-colors ml-2">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <p className="text-3xl font-heading font-bold tabular-nums">
          {value}<span className="text-lg text-muted-foreground font-normal">{suffix}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
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
