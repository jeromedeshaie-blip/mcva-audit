"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LlmWatchLandingPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LLM Watch</h1>
        <p className="text-muted-foreground mt-1">
          Monitoring continu de votre visibilite dans les IA generatives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4 LLM surveilles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ChatGPT, Perplexity, Claude et Gemini interroges chaque semaine
              avec vos requetes metier en FR, DE et EN.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score 0-100</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Un score composite pondere par LLM, par langue, avec suivi de
              l&apos;evolution et benchmark concurrents.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Alertes automatiques</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Email automatique si un concurrent gagne ou perd plus de 10
              points en une semaine.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => router.push("/llmwatch/admin")}>
          Administration
        </Button>
      </div>
    </div>
  );
}
