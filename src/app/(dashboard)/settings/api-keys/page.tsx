"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Page — API Keys (Phase 3A v3)
 * Génération + liste + révocation des clés d'import local.
 */

interface ApiKey {
  id: string;
  label: string;
  key_prefix: string;
  scope: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [newScope, setNewScope] = useState<"audit-import" | "llmwatch-read" | "full">("audit-import");
  const [generating, setGenerating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ plaintext: string; label: string; example_curl: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  async function fetchKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    if (!newLabel || newLabel.length < 3) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel, scope: newScope }),
      });
      const data = await res.json();
      if (data.success && data.key) {
        setRevealedKey({
          plaintext: data.key.plaintext,
          label: data.key.label,
          example_curl: data.example_curl,
        });
        setNewLabel("");
        fetchKeys();
      } else {
        alert(data.error || "Erreur génération");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(id: string, label: string) {
    if (!confirm(`Révoquer la clé "${label}" ? Impossible à annuler.`)) return;
    await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
    fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Clés API</h1>
        <p className="text-sm text-muted-foreground">
          Authentifient les clients externes (ex: crawler Mac Studio) qui importent des audits.
          Scope <code>audit-import</code> requis pour <code>/api/audit-import/from-local</code>.
        </p>
      </div>

      {/* Révélation ponctuelle après génération */}
      {revealedKey && (
        <Card className="border-2 border-amber-400 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">
              🔑 Clé générée — <span className="font-mono">{revealedKey.label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-bold text-red-800">
              ⚠ Copie cette clé MAINTENANT. Elle ne sera plus jamais affichée.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-black p-3 font-mono text-xs text-green-300">
                {revealedKey.plaintext}
              </code>
              <Button onClick={() => copyToClipboard(revealedKey.plaintext)} variant="outline">
                {copiedKey ? "Copié ✓" : "Copier"}
              </Button>
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">Voir exemple curl</summary>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-xs">{revealedKey.example_curl}</pre>
            </details>
            <Button onClick={() => setRevealedKey(null)} variant="outline" size="sm">
              J'ai copié la clé, fermer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Générer une nouvelle clé */}
      <Card>
        <CardHeader><CardTitle>Générer une nouvelle clé</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="label">Label (3-80 caractères)</Label>
            <Input
              id="label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="ex: mac-studio-local, laptop-prod, ci-github"
            />
          </div>
          <div>
            <Label htmlFor="scope">Scope</Label>
            <select
              id="scope"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={newScope}
              onChange={(e) => setNewScope(e.target.value as any)}
            >
              <option value="audit-import">audit-import (Mac Studio crawler)</option>
              <option value="llmwatch-read">llmwatch-read (lecture scores)</option>
              <option value="full">full (tout — à réserver aux admins)</option>
            </select>
          </div>
          <Button onClick={generate} disabled={generating || !newLabel || newLabel.length < 3}>
            {generating ? "Génération…" : "Générer la clé"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Maximum 10 clés actives par utilisateur. Révoquer les clés inutilisées.
          </p>
        </CardContent>
      </Card>

      {/* Clés actives */}
      <Card>
        <CardHeader>
          <CardTitle>
            Clés actives ({activeKeys.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune clé active.</p>
          ) : (
            <div className="space-y-2">
              {activeKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{k.label}</span>
                      <Badge variant="outline">{k.scope}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <code className="font-mono">{k.key_prefix}…</code>
                      {" · Créée "}
                      {new Date(k.created_at).toLocaleDateString("fr-CH")}
                      {k.last_used_at && (
                        <>{" · Utilisée "} {new Date(k.last_used_at).toLocaleDateString("fr-CH")}</>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => revoke(k.id, k.label)}
                    variant="outline"
                    size="sm"
                  >
                    Révoquer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clés révoquées (history) */}
      {revokedKeys.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Clés révoquées ({revokedKeys.length})
          </summary>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {revokedKeys.map((k) => (
              <div key={k.id} className="rounded border border-dashed p-2">
                <span className="font-medium">{k.label}</span> · {k.key_prefix}… · révoquée{" "}
                {k.revoked_at ? new Date(k.revoked_at).toLocaleDateString("fr-CH") : "?"}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
