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
    value: "agriculture",
    label: "Agriculture & viticulture",
    subSectors: [
      { value: "agri-montagne", label: "Agriculture de montagne & elevage" },
      { value: "agri-arboriculture", label: "Cultures maraicheres & arboriculture" },
      { value: "agri-foresterie", label: "Foresterie & bois" },
      { value: "agri-viticulture", label: "Viticulture & oenologie" },
    ],
  },
  {
    value: "commerce",
    label: "Commerce & distribution",
    subSectors: [
      { value: "commerce-ecommerce", label: "E-commerce" },
      { value: "commerce-gros", label: "Commerce de gros & negoce international" },
      { value: "commerce-distribution", label: "Grande distribution & retail" },
      { value: "commerce-luxe", label: "Luxe & mode" },
    ],
  },
  {
    value: "construction",
    label: "Construction & immobilier",
    subSectors: [
      { value: "construction-archi", label: "Architecture & bureaux d'etudes" },
      { value: "construction-gc", label: "Construction & genie civil" },
      { value: "construction-facility", label: "Facility management" },
      { value: "construction-promotion", label: "Promotion immobiliere" },
      { value: "construction-regie", label: "Regie & gestion immobiliere" },
    ],
  },
  {
    value: "energie",
    label: "Energie & environnement",
    subSectors: [
      { value: "energie-cleantech", label: "Cleantech & gestion des dechets" },
      { value: "energie-hydro", label: "Hydroelectricite" },
      { value: "energie-ingenierie", label: "Ingenierie environnementale" },
      { value: "energie-solaire", label: "Solaire & eolien" },
      { value: "energie-utilities", label: "Utilities & distribution (gaz, eau, electricite)" },
    ],
  },
  {
    value: "finance",
    label: "Finance & assurances",
    subSectors: [
      { value: "finance-assurance", label: "Assurances (vie, non-vie, reassurance)" },
      { value: "finance-banque", label: "Banque de detail & privee" },
      { value: "finance-fintech", label: "Fintech & crypto" },
      { value: "finance-gestion", label: "Gestion d'actifs & wealth management" },
      { value: "finance-fiduciaire", label: "Services fiduciaires & audit" },
    ],
  },
  {
    value: "formation",
    label: "Formation & recherche",
    subSectors: [
      { value: "formation-edtech", label: "EdTech" },
      { value: "formation-pro", label: "Formation professionnelle & continue" },
      { value: "formation-hes", label: "Hautes ecoles & universites" },
      { value: "formation-recherche", label: "Recherche publique & privee (EPFL, ETHZ, instituts)" },
    ],
  },
  {
    value: "horlogerie",
    label: "Horlogerie & joaillerie",
    subSectors: [
      { value: "horlogerie-composants", label: "Composants & sous-traitance horlogere" },
      { value: "horlogerie-haute", label: "Haute horlogerie" },
      { value: "horlogerie-moyenne", label: "Horlogerie de gamme moyenne" },
      { value: "horlogerie-joaillerie", label: "Joaillerie & pierres precieuses" },
    ],
  },
  {
    value: "industrie",
    label: "Industrie & manufacturing",
    subSectors: [
      { value: "industrie-agroalimentaire", label: "Agroalimentaire & transformation" },
      { value: "industrie-chimie", label: "Chimie & materiaux" },
      { value: "industrie-machines", label: "Machines-outils & equipements industriels" },
      { value: "industrie-metallurgie", label: "Metallurgie & traitement de surface" },
      { value: "industrie-microtech", label: "Microtechnique & precision" },
    ],
  },
  {
    value: "pharma",
    label: "Pharma, biotech & medtech",
    subSectors: [
      { value: "pharma-biotech", label: "Biotechnologie" },
      { value: "pharma-cro", label: "CRO & services cliniques" },
      { value: "pharma-medtech", label: "Dispositifs medicaux & medtech" },
      { value: "pharma-rd", label: "Pharma (R&D, production, distribution)" },
    ],
  },
  {
    value: "sante",
    label: "Sante & social",
    subSectors: [
      { value: "sante-dentaire", label: "Cabinets medicaux & dentaires" },
      { value: "sante-ems", label: "EMS & soins a domicile" },
      { value: "sante-hopital", label: "Hopitaux & cliniques privees" },
      { value: "sante-pharma", label: "Pharmacies" },
      { value: "sante-bienetre", label: "Sante mentale & bien-etre" },
    ],
  },
  {
    value: "secteur-public",
    label: "Secteur public & organisations internationales",
    subSectors: [
      { value: "public-admin", label: "Administrations federales, cantonales, communales" },
      { value: "public-ong", label: "ONG & associations" },
      { value: "public-oi", label: "Organisations internationales (ONU, CICR, OMC)" },
      { value: "public-para", label: "Parapublic (CFF, La Poste, Swisscom)" },
    ],
  },
  {
    value: "services",
    label: "Services aux entreprises",
    subSectors: [
      { value: "services-com", label: "Communication, marketing & RP" },
      { value: "services-conseil", label: "Conseil en management & strategie" },
      { value: "services-juridique", label: "Juridique & notariat" },
      { value: "services-recrutement", label: "Recrutement & travail temporaire" },
      { value: "services-traduction", label: "Traduction & services linguistiques" },
    ],
  },
  {
    value: "tech",
    label: "Technologies & digital",
    subSectors: [
      { value: "tech-cybersecurite", label: "Cybersecurite" },
      { value: "tech-data-ia", label: "Data & intelligence artificielle" },
      { value: "tech-saas", label: "Editeurs de logiciels / SaaS" },
      { value: "tech-esn", label: "ESN & conseil IT" },
      { value: "tech-telecom", label: "Telecommunications" },
    ],
  },
  {
    value: "tourisme",
    label: "Tourisme & hospitality",
    subSectors: [
      { value: "tourisme-agence", label: "Agences & tour-operateurs" },
      { value: "tourisme-evenementiel", label: "Evenementiel & congres" },
      { value: "tourisme-hotel", label: "Hotellerie & resorts" },
      { value: "tourisme-ski", label: "Remontees mecaniques & domaines skiables" },
      { value: "tourisme-restaurant", label: "Restauration & gastronomie" },
    ],
  },
  {
    value: "transport",
    label: "Transport & logistique",
    subSectors: [
      { value: "transport-aviation", label: "Aviation & aeroportuaire" },
      { value: "transport-fret", label: "Fret & logistique internationale" },
      { value: "transport-ferroviaire", label: "Transport ferroviaire" },
      { value: "transport-routier", label: "Transport routier" },
      { value: "transport-shipping", label: "Shipping & transit" },
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
  ultra: { core_eeat: 80, cite: 40, perf: 15, a11y: 20, rgesn: 20, tech: 15, contenu: 15, total: 205 },
} as const;

/** Quality levels for audit */
export const QUALITY_LEVELS = [
  { value: "eco", label: "Eco (test)", description: "Haiku + 1 modele GEO — ~$0.03", icon: "" },
  { value: "standard", label: "Standard", description: "Sonnet + 2 modeles GEO — ~$0.30", icon: "" },
  { value: "premium", label: "Premium (client)", description: "Sonnet + 4 modeles GEO — ~$0.50", icon: "" },
  { value: "ultra", label: "Ultra (7 themes)", description: "Sonnet + 4 modeles GEO + notes detaillees — ~$3.00", icon: "" },
] as const;

/** Quality level configuration */
export const QUALITY_CONFIG = {
  eco: {
    scoringModel: "claude-haiku-4-20250404" as const,
    htmlMaxChars: 20000,
    geoModels: ["claude"] as const,
    maxTokensScoring: 1500,
    actionPlanModel: "claude-haiku-4-20250404" as const,
    actionPlanMaxTokens: 2500,
    actionPlanCount: 15,
    notesDepth: "concise" as const,
  },
  standard: {
    scoringModel: "claude-sonnet-4-6" as const,
    htmlMaxChars: 30000,
    geoModels: ["claude", "openai"] as const,
    maxTokensScoring: 2000,
    actionPlanModel: "claude-sonnet-4-6" as const,
    actionPlanMaxTokens: 2500,
    actionPlanCount: 15,
    notesDepth: "concise" as const,
  },
  premium: {
    scoringModel: "claude-sonnet-4-6" as const,
    htmlMaxChars: 30000,
    geoModels: ["claude", "openai", "perplexity", "gemini"] as const,
    maxTokensScoring: 2000,
    actionPlanModel: "claude-sonnet-4-6" as const,
    actionPlanMaxTokens: 2500,
    actionPlanCount: 15,
    notesDepth: "concise" as const,
  },
  ultra: {
    scoringModel: "claude-sonnet-4-6" as const,
    htmlMaxChars: 50000,
    geoModels: ["claude", "openai", "perplexity", "gemini"] as const,
    maxTokensScoring: 4000,
    actionPlanModel: "claude-sonnet-4-6" as const,
    actionPlanMaxTokens: 8000,
    actionPlanCount: 25,
    notesDepth: "detailed" as const,
  },
} as const;

export type QualityConfig = typeof QUALITY_CONFIG[keyof typeof QUALITY_CONFIG];
