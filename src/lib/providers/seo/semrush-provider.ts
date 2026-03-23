import type { SeoProvider } from "./seo-provider";
import type { SeoData, CompetitorData } from "@/types/audit";

/**
 * SemrushProvider — Palier 2 (Production)
 *
 * À implémenter en Phase 2 quand la licence Semrush est activée.
 * Pour l'instant, stub qui lève une erreur.
 */
export class SemrushProvider implements SeoProvider {
  readonly name = "semrush" as const;

  constructor() {
    if (!process.env.SEMRUSH_API_KEY) {
      throw new Error(
        "SEMRUSH_API_KEY is required. Set SEO_PROVIDER=free to use Palier 1."
      );
    }
  }

  async getDomainOverview(_domain: string): Promise<SeoData> {
    // TODO: Phase 2 — Implement Semrush API v3 integration
    // Endpoints: Domain Overview, Organic Research
    throw new Error("SemrushProvider not yet implemented. Switch to SEO_PROVIDER=free.");
  }

  async getCompetitors(_domain: string): Promise<CompetitorData[] | null> {
    // TODO: Phase 2 — Implement Semrush Competitors endpoint
    throw new Error("SemrushProvider not yet implemented. Switch to SEO_PROVIDER=free.");
  }
}
