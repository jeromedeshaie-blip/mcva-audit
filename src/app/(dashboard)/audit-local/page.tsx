"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Page — Audit Local (Phase 3C v3)
 * Liste les imports depuis crawler Mac Studio + CLI template.
 */

interface LocalImport {
  id: string;
  source: string;
  extractor_model: string;
  crawler_version: string;
  pages_count: number;
  spa_detected: boolean;
  extraction_duration_ms: number;
  uploaded_at: string;
  audit?: {
    id: string;
    url: string;
    domain: string;
    audit_type: string;
    reference: string | null;
    status: string;
    created_at: string;
    completed_at: string | null;
  } | { id: string; url: string; domain: string; audit_type: string; reference: string | null; status: string; created_at: string; completed_at: string | null }[];
}

export default function AuditLocalPage() {
  const [imports, setImports] = useState<LocalImport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchImports(); }, []);

  async function fetchImports() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-import/list");
      const data = await res.json();
      setImports(data.imports || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Imports locaux (Mac Studio)</h1>
        <p className="text-sm text-muted-foreground">
          Audits crawlés localement via le script Python avec Gemma 4, puis uploadés ici pour scoring cloud.
          Bypass le timeout Vercel 60s et gère les sites SPA.
        </p>
      </div>

      {/* Quick start CLI */}
      <Card>
        <CardHeader><CardTitle>Commande type</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-black p-3 font-mono text-xs text-green-300">
            <div># 1. Générer une clé API (une fois)</div>
            <div className="text-yellow-300">→ Aller dans <Link href="/settings/api-keys" className="underline">Clés API</Link></div>
            <br />
            <div># 2. Configurer le crawler (une fois)</div>
            <div>cd tools/local-crawler</div>
            <div>python3.12 -m venv .venv && source .venv/bin/activate</div>
            <div>pip install -r requirements.txt</div>
            <div>python -m playwright install chromium</div>
            <div>ollama pull gemma4:31b</div>
            <div>cp .env.example .env   # remplir MCVA_API_KEY</div>
            <br />
            <div># 3. Lancer un audit</div>
            <div>python audit_local.py \</div>
            <div>&nbsp;&nbsp;--url https://exemple.ch \</div>
            <div>&nbsp;&nbsp;--sector finance-fiduciaire \</div>
            <div>&nbsp;&nbsp;--audit-type ultra \</div>
            <div>&nbsp;&nbsp;--quality premium</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Docs complètes : <code>tools/local-crawler/README.md</code> dans le repo.
          </p>
        </CardContent>
      </Card>

      {/* Historique imports */}
      <Card>
        <CardHeader>
          <CardTitle>Historique ({imports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : imports.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucun import local pour l'instant.
              <br />
              <span className="text-xs">Configure le crawler Mac Studio et lance ton premier audit.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => {
                const audit = Array.isArray(imp.audit) ? imp.audit[0] : imp.audit;
                if (!audit) return null;
                return (
                  <div key={imp.id} className="rounded-md border p-3 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/audit/${audit.id}`}
                            className="truncate font-medium hover:underline"
                          >
                            {audit.domain}
                          </Link>
                          {audit.reference && (
                            <Badge variant="outline" className="text-xs">
                              {audit.reference}
                            </Badge>
                          )}
                          <Badge
                            variant={audit.status === "completed" ? "default" : "outline"}
                            className="text-xs"
                          >
                            {audit.status}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          <span className="uppercase">{audit.audit_type}</span>
                          {" · "}
                          {imp.pages_count} page{imp.pages_count > 1 ? "s" : ""}
                          {" · "}
                          {Math.round(imp.extraction_duration_ms / 1000)}s
                          {" · "}
                          <code>{imp.extractor_model}</code>
                          {imp.spa_detected && (
                            <Badge variant="outline" className="ml-2 border-yellow-400 text-yellow-700 text-[10px]">
                              SPA
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {audit.url}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        {new Date(imp.uploaded_at).toLocaleDateString("fr-CH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        <br />
                        {new Date(imp.uploaded_at).toLocaleTimeString("fr-CH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
