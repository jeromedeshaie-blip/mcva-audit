"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Page — Intégrations Google (GSC + GA4)
 * Phase 2B POLE-PERF v2.1
 */
export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const connectedParam = searchParams.get("connected");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    // No dedicated endpoint; we just try listing sites/properties
    const [gscRes, ga4Res] = await Promise.all([
      fetch("/api/integrations/google/fetch-gsc").then((r) => r.json()).catch(() => null),
      fetch("/api/integrations/google/fetch-ga4").then((r) => r.json()).catch(() => null),
    ]);
    setConnections({
      google_gsc: gscRes?.sites ? { connected: true, sites: gscRes.sites } : { connected: false },
      google_ga4: ga4Res?.properties ? { connected: true, properties: ga4Res.properties } : { connected: false },
    });
    setLoading(false);
  }

  async function disconnect(provider: string) {
    await fetch("/api/integrations/google/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    fetchStatus();
  }

  function connect(provider: string) {
    window.location.href = `/api/integrations/google/authorize?provider=${provider}`;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Intégrations — Google Search Console & Analytics 4</h1>
      <p className="text-sm text-muted-foreground">
        Connectez vos comptes Google pour auto-remplir les blocs B (GSC) et C (GA4) du Wizard Ultra.
        POLE-PERF v2.1 Phase 2B. Données officielles, gratuites, illimitées.
      </p>

      {connectedParam && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          ✓ Connecté : {connectedParam === "google_gsc" ? "Google Search Console" : "Google Analytics 4"}
        </div>
      )}
      {errorParam && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          ⚠️ Erreur OAuth : {errorParam}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Google Search Console
            {connections.google_gsc?.connected && (
              <Badge className="ml-2" variant="default">✓ Connecté</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Scope : <code>webmasters.readonly</code>. Fournit requêtes, pages, positions, CTR, impressions (16 mois).
          </p>
          {loading ? (
            <p className="text-xs">Chargement...</p>
          ) : connections.google_gsc?.connected ? (
            <div className="space-y-2">
              <p className="text-xs">Sites accessibles : <strong>{connections.google_gsc.sites?.length || 0}</strong></p>
              <Button variant="outline" onClick={() => disconnect("google_gsc")}>Déconnecter</Button>
            </div>
          ) : (
            <Button onClick={() => connect("google_gsc")}>Connecter GSC</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Google Analytics 4
            {connections.google_ga4?.connected && (
              <Badge className="ml-2" variant="default">✓ Connecté</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Scope : <code>analytics.readonly</code>. Fournit sessions, utilisateurs, engagement, conversions (12 mois, Organic Search).
          </p>
          {loading ? (
            <p className="text-xs">Chargement...</p>
          ) : connections.google_ga4?.connected ? (
            <div className="space-y-2">
              <p className="text-xs">Properties accessibles : <strong>{connections.google_ga4.properties?.length || 0}</strong></p>
              <Button variant="outline" onClick={() => disconnect("google_ga4")}>Déconnecter</Button>
            </div>
          ) : (
            <Button onClick={() => connect("google_ga4")}>Connecter GA4</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration requise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Variables d'environnement Vercel :
          </p>
          <ul className="list-disc pl-5 font-mono text-xs">
            <li>GOOGLE_OAUTH_CLIENT_ID</li>
            <li>GOOGLE_OAUTH_CLIENT_SECRET</li>
            <li>NEXT_PUBLIC_SITE_URL</li>
          </ul>
          <p>
            Créer un projet Google Cloud et activer Search Console API + GA Data API.
            Configurer l'URI de redirect : <code className="text-xs">{"{NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback"}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
