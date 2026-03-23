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

/** Max polling duration before timeout (5 minutes for express, 20 for full) */
export const POLLING_TIMEOUT_MS = {
  express: 5 * 60 * 1000,
  full: 20 * 60 * 1000,
} as const;

/** Number of items per audit type */
export const AUDIT_ITEM_COUNTS = {
  express: { core_eeat: 20, cite: 10, total: 30 },
  full: { core_eeat: 80, cite: 40, total: 120 },
} as const;
