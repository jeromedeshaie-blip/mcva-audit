/**
 * Shared constants for the MCVA Audit Platform.
 */

export interface SectorGroup {
  value: string;
  label: string;
  subSectors: { value: string; label: string }[];
}

export const SECTOR_GROUPS: SectorGroup[] = [
  {
    value: "artisanat",
    label: "Artisanat & services locaux",
    subSectors: [
      { value: "artisan-boulangerie", label: "Boulangeries & patisseries" },
      { value: "artisan-coiffure", label: "Coiffure & esthetique" },
      { value: "artisan-construction", label: "Construction & renovation" },
      { value: "artisan-electricite", label: "Electricite & installations" },
      { value: "artisan-auto", label: "Garages & automobiles" },
      { value: "artisan-paysagiste", label: "Paysagistes & jardins" },
    ],
  },
  {
    value: "banque-finance",
    label: "Banque & finance",
    subSectors: [
      { value: "finance-assurance", label: "Assurances" },
      { value: "finance-banque", label: "Banques" },
      { value: "finance-conseil", label: "Conseil financier" },
      { value: "finance-crypto", label: "Crypto & blockchain" },
      { value: "finance-fiduciaire", label: "Fiduciaires & comptabilite" },
      { value: "finance-fintech", label: "Fintech" },
      { value: "finance-gestion", label: "Gestion de fortune" },
    ],
  },
  {
    value: "e-commerce",
    label: "E-commerce & distribution",
    subSectors: [
      { value: "ecom-alimentaire", label: "Alimentaire" },
      { value: "ecom-beaute", label: "Beaute & cosmetique" },
      { value: "ecom-luxe", label: "Luxe" },
      { value: "ecom-maison", label: "Maison & decoration" },
      { value: "ecom-marketplace", label: "Marketplaces" },
      { value: "ecom-mode", label: "Mode & textile" },
    ],
  },
  {
    value: "education",
    label: "Education & formation",
    subSectors: [
      { value: "edu-langue", label: "Ecoles de langues" },
      { value: "edu-ecole", label: "Ecoles privees" },
      { value: "edu-edtech", label: "EdTech" },
      { value: "edu-formation", label: "Formation continue" },
      { value: "edu-universite", label: "Universites & HES" },
    ],
  },
  {
    value: "immobilier",
    label: "Immobilier",
    subSectors: [
      { value: "immo-agence", label: "Agences immobilieres" },
      { value: "immo-gestion", label: "Gestion locative (regie)" },
      { value: "immo-commercial", label: "Immobilier commercial" },
      { value: "immo-luxe", label: "Immobilier de prestige" },
      { value: "immo-promotion", label: "Promotion immobiliere" },
    ],
  },
  {
    value: "industrie",
    label: "Industrie & production",
    subSectors: [
      { value: "industrie-alimentaire", label: "Agroalimentaire" },
      { value: "industrie-chimie", label: "Chimie & pharma" },
      { value: "industrie-energie", label: "Energie & cleantech" },
      { value: "industrie-horlogerie", label: "Horlogerie" },
      { value: "industrie-machine", label: "Machines & equipements" },
    ],
  },
  {
    value: "juridique",
    label: "Juridique & conseil",
    subSectors: [
      { value: "juridique-audit", label: "Audit & revision" },
      { value: "juridique-conseil", label: "Conseil en management" },
      { value: "juridique-avocat", label: "Etudes d'avocats" },
      { value: "juridique-notaire", label: "Notaires" },
      { value: "juridique-rh", label: "Ressources humaines" },
    ],
  },
  {
    value: "media",
    label: "Media & communication",
    subSectors: [
      { value: "media-agence-com", label: "Agences de communication" },
      { value: "media-evenementiel", label: "Evenementiel" },
      { value: "media-presse", label: "Presse & edition" },
      { value: "media-production", label: "Production audiovisuelle" },
      { value: "media-rp", label: "Relations publiques" },
    ],
  },
  {
    value: "sante",
    label: "Sante & bien-etre",
    subSectors: [
      { value: "sante-dentaire", label: "Cabinets dentaires" },
      { value: "sante-cabinet", label: "Cabinets medicaux" },
      { value: "sante-hopital", label: "Hopitaux & cliniques" },
      { value: "sante-labo", label: "Laboratoires" },
      { value: "sante-medtech", label: "Medtech" },
      { value: "sante-pharma", label: "Pharmacies" },
      { value: "sante-physio", label: "Physiotherapie" },
      { value: "sante-veterinaire", label: "Veterinaires" },
    ],
  },
  {
    value: "tech-saas",
    label: "Tech & SaaS",
    subSectors: [
      { value: "tech-agence-web", label: "Agences web & digitales" },
      { value: "tech-cybersecurite", label: "Cybersecurite" },
      { value: "tech-esn", label: "ESN / Services IT" },
      { value: "tech-ia", label: "Intelligence artificielle" },
      { value: "tech-saas-b2b", label: "SaaS B2B" },
      { value: "tech-saas-b2c", label: "SaaS B2C" },
    ],
  },
  {
    value: "tourisme",
    label: "Tourisme & hotellerie",
    subSectors: [
      { value: "tourisme-activites", label: "Activites & loisirs" },
      { value: "tourisme-agence", label: "Agences de voyage" },
      { value: "tourisme-camping", label: "Camping & plein air" },
      { value: "tourisme-hotel", label: "Hotellerie" },
      { value: "tourisme-ot", label: "Offices de tourisme" },
      { value: "tourisme-restaurant", label: "Restauration" },
      { value: "tourisme-ski", label: "Stations de ski" },
      { value: "tourisme-spa", label: "Wellness & spa" },
    ],
  },
  {
    value: "transport",
    label: "Transport & logistique",
    subSectors: [
      { value: "transport-demenagement", label: "Demenagement" },
      { value: "transport-logistique", label: "Logistique & entreposage" },
      { value: "transport-taxi", label: "Taxi & VTC" },
      { value: "transport-maritime", label: "Transport maritime" },
    ],
  },
] as const;

/** Flat list of all sectors (groups + sub-sectors) for backward compatibility */
export const SECTORS = SECTOR_GROUPS.flatMap((group) => [
  { value: group.value, label: group.label },
  ...group.subSectors,
]);

export type SectorValue = string;

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
  { value: "eco", label: "Eco (test)", description: "Haiku + 1 modele GEO — ~$0.03", icon: "" },
  { value: "standard", label: "Standard", description: "Sonnet + 2 modeles GEO — ~$0.30", icon: "" },
  { value: "premium", label: "Premium (client)", description: "Sonnet + 4 modeles GEO — ~$0.50", icon: "" },
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
