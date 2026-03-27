"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LlmWatchClient } from "@/lib/llmwatch/types";

type ViewState = "list" | "create";

export default function LlmWatchAdminPage() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("list");
  const [clients, setClients] = useState<LlmWatchClient[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [queriesFr, setQueriesFr] = useState("");
  const [competitorsText, setCompetitorsText] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/llmwatch/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const queries = queriesFr
      .split("\n")
      .filter((q) => q.trim())
      .map((q) => ({ text_fr: q.trim() }));

    const competitors = competitorsText
      .split("\n")
      .filter((c) => c.trim())
      .map((c) => ({
        name: c.trim(),
        keywords: c.trim().toLowerCase().split(/\s+/),
      }));

    try {
      const res = await fetch("/api/llmwatch/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sector,
          location,
          contact_email: contactEmail,
          queries,
          competitors,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      // Reset and go back to list
      setName("");
      setSector("");
      setLocation("");
      setContactEmail("");
      setQueriesFr("");
      setCompetitorsText("");
      setView("list");
      fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setCreating(false);
    }
  };

  if (view === "create") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nouveau client LLM Watch</h1>
          <Button variant="outline" onClick={() => setView("list")}>
            Retour
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de l&apos;entreprise</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Fiduciaire Rochat SA"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email de contact</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@rochat.ch"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Secteur</Label>
                  <Input
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="fiduciaire"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Localisation</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lausanne, Suisse"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Requetes metier (une par ligne, en francais)</Label>
                <textarea
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={queriesFr}
                  onChange={(e) => setQueriesFr(e.target.value)}
                  placeholder={`Quelle est la meilleure fiduciaire a Lausanne ?\nA qui confier ma comptabilite en Suisse romande ?\nQuels sont les meilleurs experts-comptables du canton de Vaud ?`}
                />
              </div>

              <div className="space-y-2">
                <Label>Concurrents a surveiller (un par ligne)</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={competitorsText}
                  onChange={(e) => setCompetitorsText(e.target.value)}
                  placeholder={`Fidulex SA\nCompta Plus Lausanne\nBDO Suisse`}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}

              <Button type="submit" disabled={creating || !name || !contactEmail}>
                {creating ? "Creation..." : "Creer le client"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLM Watch — Administration</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des clients et suivi des collectes.
          </p>
        </div>
        <Button onClick={() => setView("create")}>Nouveau client</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-muted-foreground mb-4">Aucun client LLM Watch.</p>
            <Button onClick={() => setView("create")}>
              Ajouter votre premier client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => router.push(`/llmwatch/dashboard/${c.id}`)}
            >
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {c.sector} — {c.location}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={c.active ? "default" : "secondary"}>
                    {c.active ? "Actif" : "Inactif"}
                  </Badge>
                  <Badge variant="outline">{c.plan}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
