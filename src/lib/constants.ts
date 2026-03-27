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
    value: "tourisme",
    label: "Tourisme & Hospitality",
    subSectors: [
      { value: "tourisme-ot", label: "Offices de tourisme" },
      { value: "tourisme-hotel", label: "Hotellerie" },
      { value: "tourisme-restaurant", label: "Restauration" },
      { value: "tourisme-agence", label: "Agences de voyage" },
      { value: "tourisme-activites", label: "Activites & loisirs" },
      { value: "tourisme-camping", label: "Camping & plein air" },
      { value: "tourisme-ski", label: "Stations de ski" },
      { value: "tourisme-spa", label: "Wellness & spa" },
    ],
  },
  {
    value: "banque-finance",
    label: "Banque & Finance",
    subSectors: [
      { value: "finance-banque", label: "Banques" },
      { value: "finance-assurance", label: "Assurances" },
      { value: "finance-fiduciaire", label: "Fiduciaires & comptabilite" },
      { value: "finance-gestion", label: "Gestion de fortune" },
      { value: "finance-fintech", label: "Fintech" },
      { value: "finance-crypto", label: "Crypto & blockchain" },
      { value: "finance-conseil", label: "Conseil financier" },
    ],
  },
  {
    value: "immobilier",
    label: "Immobilier",
    subSectors: [
      { value: "immo-agence", label: "Agences immobilieres" },
      { value: "immo-promotion", label: "Promotion immobiliere" },
      { value: "immo-gestion", label: "Gestion locative (regie)" },
      { value: "immo-commercial", label: "Immobilier commercial" },
      { value: "immo-luxe", label: "Immobilier de prestige" },
    ],
  },
  {
    value: "sante",
    label: "Sante & Bien-etre",
    subSectors: [
      { value: "sante-hopital", label: "Hopitaux & cliniques" },
      { value: "sante-cabinet", label: "Cabinets medicaux" },
      { value: "sante-pharma", label: "Pharmacies" },
      { value: "sante-labo", label: "Laboratoires" },
      { value: "sante-dentaire", label: "Cabinets dentaires" },
      { value: "sante-physio", label: "Physiotherapie" },
      { value: "sante-medtech", label: "Medtech" },
      { value: "sante-veterinaire", label: "Veterinaires" },
    ],
  },
  {
    value: "juridique",
    label: "Juridique & Conseil",
    subSectors: [
      { value: "juridique-avocat", label: "Etudes d'avocats" },
      { value: "juridique-notaire", label: "Notaires" },
      { value: "juridique-conseil", label: "Conseil en management" },
      { value: "juridique-rh", label: "Ressources humaines" },
      { value: "juridique-audit", label: "Audit & revision" },
    ],
  },
  {
    value: "tech-saas",
    label: "Tech & SaaS",
    subSectors: [
      { value: "tech-saas-b2b", label: "SaaS B2B" },
      { value: "tech-saas-b2c", label: "SaaS B2C" },
      { value: "tech-agence-web", label: "Agences web & digitales" },
      { value: "tech-cybersecurite", label: "Cybersecurite" },
      { value: "tech-ia", label: "Intelligence artificielle" },
      { value: "tech-esn", label: "ESN / Services IT" },
    ],
  },
  {
    value: "e-commerce",
    label: "E-commerce & Retail",
    subSectors: [
      { value: "ecom-mode", label: "Mode & textile" },
      { value: "ecom-alimentaire", label: "Alimentaire" },
      { value: "ecom-beaute", label: "Beaute & cosmetique" },
      { value: "ecom-maison", label: "Maison & deco" },
      { value: "ecom-marketplace", label: "Marketplaces" },
      { value: "ecom-luxe", label: "Luxe" },
    ],
  },
  {
    value: "education",
    label: "Education & Formation",
    subSectors: [
      { value: "edu-ecole", label: "Ecoles privees" },
      { value: "edu-universite", label: "Universites & HES" },
      { value: "edu-formation", label: "Formation continue" },
      { value: "edu-edtech", label: "EdTech" },
      { value: "edu-langue", label: "Ecoles de langues" },
    ],
  },
  {
    value: "industrie",
    label: "Industrie & Manufacturing",
    subSectors: [
      { value: "industrie-machine", label: "Machines & equipements" },
      { value: "industrie-alimentaire", label: "Agroalimentaire" },
      { value: "industrie-chimie", label: "Chimie & pharma" },
      { value: "industrie-horlogerie", label: "Horlogerie" },
      { value: "industrie-energie", label: "Energie & cleantech" },
    ],
  },
  {
    value: "artisanat",
    label: "Artisanat & Services locaux",
    subSectors: [
      { value: "artisan-construction", label: "Construction & renovation" },
      { value: "artisan-electricite", label: "Electricite & installations" },
      { value: "artisan-paysagiste", label: "Paysagistes & jardins" },
      { value: "artisan-auto", label: "Garages & automobiles" },
      { value: "artisan-coiffure", label: "Coiffure & esthetique" },
      { value: "artisan-boulangerie", label: "Boulangeries & patisseries" },
    ],
  },
  {
    value: "media",
    label: "Media & Communication",
    subSectors: [
      { value: "media-agence-com", label: "Agences de communication" },
      { value: "media-rp", label: "Relations publiques" },
      { value: "media-presse", label: "Presse & edition" },
      { value: "media-production", label: "Production audiovisuelle" },
      { value: "media-evenementiel", label: "Evenementiel" },
    ],
  },
  {
    value: "transport",
    label: "Transport & Logistique",
    subSectors: [
      { value: "transport-logistique", label: "Logistique & entreposage" },
      { value: "transport-demenagement", label: "Demenagement" },
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
