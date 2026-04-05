"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditResults } from "@/components/audit/audit-results";
import type { Audit, AuditScores, AuditItem, AuditAction } from "@/types/audit";

type PageState = "loading" | "ready" | "error";

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [state, setState] = useState<PageState>("loading");
  const [audit, setAudit] = useState<Audit | null>(null);
  const [scores, setScores] = useState<AuditScores | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [actions, setActions] = useState<AuditAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auditId) return;

    async function fetchAudit() {
      try {
        const res = await fetch(`/api/audit?id=${auditId}`);
        if (!res.ok) {
          throw new Error("Impossible de charger l'audit");
        }
        const data = await res.json();

        if (!data.audit) {
          throw new Error("Audit introuvable");
        }

        setAudit(data.audit);
        setScores(data.scores || null);
        setItems(data.items || []);
        setActions(data.actions || []);
        setState("ready");
      } catch (e: any) {
        setError(e.message);
        setState("error");
      }
    }

    fetchAudit();
  }, [auditId]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Chargement de l&apos;audit...</p>
      </div>
    );
  }

  if (state === "error" || !audit) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">{error || "Audit introuvable"}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/")}>
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = audit.status === "completed" && scores;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A0808] via-[#1A0F0F] to-[#2A1515] p-6 text-white">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 70%, #A53535 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-3">
            <Link href="/" className="hover:text-white/80 transition-colors">
              Tableau de bord
            </Link>
            <span>/</span>
            <span className="text-white/70">Audit</span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {audit.domain}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className="bg-white/10 text-white/80 border-white/20"
                >
                  {audit.audit_type === "express" ? "Express" : audit.audit_type === "ultra" ? "Ultra" : "Complet"}
                </Badge>
                <StatusBadge status={audit.status} />
                <span className="text-sm text-white/50">
                  {new Date(audit.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {audit.sector && (
                  <span className="text-sm text-white/50">
                    — {audit.sector}
                  </span>
                )}
              </div>
            </div>

            {isCompleted && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() =>
                    window.open(`/api/audit/pdf?id=${auditId}&format=html`, "_blank")
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mr-2"
                  >
                    <path
                      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Telecharger PDF
                </Button>
                {audit.audit_type === "express" && (
                  <Link
                    href={`/nouveau-audit?url=${encodeURIComponent(audit.url)}&sector=${encodeURIComponent(audit.sector || "")}&from=${audit.id}`}
                  >
                    <Button className="bg-white text-[#0A0808] hover:bg-white/90">
                      Lancer l&apos;audit complet
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status messages for non-completed audits */}
      {audit.status === "processing" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 border-[#A53535] border-t-transparent animate-spin" />
              <p className="text-muted-foreground">
                Audit en cours de traitement...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {audit.status === "error" && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">
              Cet audit a rencontre une erreur.
            </p>
            <Link
              href={audit.audit_type === "ultra"
                ? `/nouveau-audit?url=${encodeURIComponent(audit.url)}&sector=${encodeURIComponent(audit.sector || "")}`
                : `/audit-${audit.audit_type === "express" ? "express" : "complet"}?url=${encodeURIComponent(audit.url)}&sector=${encodeURIComponent(audit.sector || "")}`}
            >
              <Button variant="outline" className="mt-3">
                Relancer l&apos;audit
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {isCompleted && scores && (
        <AuditResults
          scores={scores}
          items={items}
          actions={actions}
          auditType={audit.audit_type as "express" | "full" | "ultra"}
          isSpa={audit.is_spa}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; classes: string }
  > = {
    pending: {
      label: "En attente",
      classes: "bg-white/10 text-white/60 border-white/20",
    },
    processing: {
      label: "En cours",
      classes: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    completed: {
      label: "Termine",
      classes: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    error: {
      label: "Erreur",
      classes: "bg-red-500/20 text-red-300 border-red-500/30",
    },
  };
  const { label, classes } = config[status] || config.pending;
  return (
    <Badge variant="outline" className={classes}>
      {label}
    </Badge>
  );
}
