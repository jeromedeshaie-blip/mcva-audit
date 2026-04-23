import type { SeoProvider } from "./seo-provider";
import type { SeoData, CompetitorData } from "@/types/audit";

/**
 * SemrushProvider — DEPRECATED since v2.1 (2026-04-23).
 *
 * @deprecated Semrush non disponible depuis avril 2026.
 * Utiliser le Wizard Ultra (6 blocs A-F) avec AWT + GSC + GA4 + Moz + SimilarWeb + Seobility.
 * Voir POLE-PERFORMANCE.md v2.1 section 6.
 *
 * Ce provider reste en place pour la rétro-compatibilité des audits archivés
 * mais lève une erreur à l'initialisation si utilisé.
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
