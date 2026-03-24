import type { GeoData, QualityLevel } from "@/types/audit";

/**
 * Interface abstraite pour les providers GEO (visibilité IA).
 *
 * Palier 1 (Construction) : DirectAIGeoProvider — appels directs à 4 modèles (Claude, GPT, Perplexity, Gemini)
 * Palier 2 (Production)   : QwairyProvider — API Qwairy, 38+ modèles
 *
 * Le code métier ne connaît que cette interface.
 * Le swap se fait par configuration (env var GEO_PROVIDER).
 */
export interface GeoProvider {
  readonly name: "direct_ai" | "qwairy";

  /**
   * Mesure la visibilité d'une marque dans les réponses des moteurs IA.
   * Pose des questions sectorielles et détecte si la marque est citée.
   */
  getAIVisibility(brand: string, sector: string, domain: string, quality?: QualityLevel): Promise<GeoData>;

  /**
   * Analyse la perception de la marque par les IA.
   * Retourne le sentiment global et les citations détectées.
   */
  getBrandPerception(brand: string, sector: string): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
    summary: string;
  }>;
}

/**
 * Factory : instancie le bon provider selon la configuration.
 */
export async function createGeoProvider(): Promise<GeoProvider> {
  const providerName = process.env.GEO_PROVIDER || "direct_ai";

  switch (providerName) {
    case "qwairy": {
      const { QwairyProvider } = await import("./qwairy-provider");
      return new QwairyProvider();
    }
    case "direct_ai":
    default: {
      const { DirectAIGeoProvider } = await import("./direct-ai-geo-provider");
      return new DirectAIGeoProvider();
    }
  }
}
