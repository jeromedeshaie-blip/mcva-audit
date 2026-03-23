import type { SeoData, CompetitorData } from "@/types/audit";

/**
 * Interface abstraite pour les providers SEO.
 *
 * Palier 1 (Construction) : FreeSeoProvider — HTML analysis + PageSpeed API
 * Palier 2 (Production)   : SemrushProvider — Semrush API v3
 *
 * Le code métier ne connaît que cette interface.
 * Le swap se fait par configuration (env var SEO_PROVIDER).
 */
export interface SeoProvider {
  readonly name: "free" | "semrush";

  /**
   * Récupère les données SEO d'un domaine.
   * En Palier 1, les champs Semrush-only (organic_traffic, backlinks, etc.) sont null.
   */
  getDomainOverview(domain: string): Promise<SeoData>;

  /**
   * Récupère les concurrents organiques d'un domaine.
   * Retourne null en Palier 1 (pas de données disponibles).
   */
  getCompetitors(domain: string): Promise<CompetitorData[] | null>;
}

/**
 * Factory : instancie le bon provider selon la configuration.
 */
export async function createSeoProvider(): Promise<SeoProvider> {
  const providerName = process.env.SEO_PROVIDER || "free";

  switch (providerName) {
    case "semrush": {
      const { SemrushProvider } = await import("./semrush-provider");
      return new SemrushProvider();
    }
    case "free":
    default: {
      const { FreeSeoProvider } = await import("./free-seo-provider");
      return new FreeSeoProvider();
    }
  }
}
