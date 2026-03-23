import type { GeoProvider } from "./geo-provider";
import type { GeoData } from "@/types/audit";

/**
 * QwairyProvider — Palier 2 (Production)
 *
 * À implémenter en Phase 2 quand la licence Qwairy est activée.
 * Pour l'instant, stub qui lève une erreur.
 */
export class QwairyProvider implements GeoProvider {
  readonly name = "qwairy" as const;

  constructor() {
    if (!process.env.QWAIRY_API_KEY) {
      throw new Error(
        "QWAIRY_API_KEY is required. Set GEO_PROVIDER=direct_ai to use Palier 1."
      );
    }
  }

  async getAIVisibility(
    _brand: string,
    _sector: string,
    _domain: string
  ): Promise<GeoData> {
    // TODO: Phase 2 — Implement Qwairy API integration
    // Endpoints: AI Visibility Score, Citation Detection, 38+ models
    throw new Error("QwairyProvider not yet implemented. Switch to GEO_PROVIDER=direct_ai.");
  }

  async getBrandPerception(
    _brand: string,
    _sector: string
  ): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
    summary: string;
  }> {
    // TODO: Phase 2 — Implement Qwairy Brand Perception endpoint
    throw new Error("QwairyProvider not yet implemented. Switch to GEO_PROVIDER=direct_ai.");
  }
}
