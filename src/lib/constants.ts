/**
 * Shared constants for the MCVA Audit Platform.
 */

export const SECTORS = [
  { value: "e-commerce", label: "E-commerce" },
  { value: "luxe", label: "Luxe" },
  { value: "banque-finance", label: "Banque & Finance" },
  { value: "pharma-sante", label: "Pharma & Santé" },
  { value: "tech-saas", label: "Tech / SaaS" },
  { value: "immobilier", label: "Immobilier" },
  { value: "tourisme", label: "Tourisme" },
  { value: "education", label: "Éducation" },
  { value: "autre", label: "Autre" },
] as const;

export type SectorValue = (typeof SECTORS)[number]["value"];

/** Max polling duration before timeout */
export const POLLING_TIMEOUT_MS = {
  express: 5 * 60 * 1000,
  full: 20 * 60 * 1000,
  benchmark: 30 * 60 * 1000,
} as const;

/** Geographic scopes for benchmarks */
export const GEOGRAPHIC_SCOPES = [
  { value: "local", label: "Local (ville/commune)" },
  { value: "canton", label: "Canton" },
  { value: "suisse-romande", label: "Suisse romande" },
  { value: "suisse", label: "Suisse" },
  { value: "europe", label: "Europe" },
  { value: "monde", label: "Monde" },
] as const;

/** Number of items per audit type */
export const AUDIT_ITEM_COUNTS = {
  express: { core_eeat: 20, cite: 10, total: 30 },
  full: { core_eeat: 80, cite: 40, total: 120 },
} as const;

/** Quality levels for audit */
export const QUALITY_LEVELS = [
  { value: "eco", label: "Éco (test)", description: "Haiku + 1 modèle GEO — ~$0.03", icon: "⚡" },
  { value: "standard", label: "Standard", description: "Sonnet + 2 modèles GEO — ~$0.30", icon: "⚖️" },
  { value: "premium", label: "Premium (client)", description: "Sonnet + 4 modèles GEO — ~$0.50", icon: "💎" },
] as const;

/** Quality level configuration */
export const QUALITY_CONFIG = {
  eco: {
    scoringModel: "claude-haiku-4-20250404" as const,
    htmlMaxChars: 20000,
    geoModels: ["claude"] as const,
    maxTokensScoring: 1500,
  },
  standard: {
    scoringModel: "claude-sonnet-4-6" as const,
    htmlMaxChars: 50000,
    geoModels: ["claude", "openai"] as const,
    maxTokensScoring: 2000,
  },
  premium: {
    scoringModel: "claude-sonnet-4-6" as const,
    htmlMaxChars: 50000,
    geoModels: ["claude", "openai", "perplexity", "gemini"] as const,
    maxTokensScoring: 2000,
  },
} as const;

export type QualityConfig = typeof QUALITY_CONFIG[keyof typeof QUALITY_CONFIG];
