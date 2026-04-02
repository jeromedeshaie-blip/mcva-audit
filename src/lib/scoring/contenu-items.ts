/**
 * Définition des 15 items Audit de Contenu.
 * Dimensions : profondeur, qualité, légal, potentiel GEO.
 * Les items marqués `isPreAudit: true` sont vérifiables en pré-audit automatisé.
 */

export interface ContenuItemDef {
  code: string;
  label: string;
  dimension: "depth" | "quality" | "legal" | "geo_potential";
  description: string;
  isPreAudit: boolean;
}

export const CONTENU_ITEMS: ContenuItemDef[] = [
  // === Depth (5 items) ===
  { code: "CONT01", label: "Pages principales avec contenu substantiel (>300 mots)", dimension: "depth", description: "Les pages stratégiques contiennent un contenu suffisamment développé (minimum 300 mots) pour apporter une réelle valeur au visiteur.", isPreAudit: true },
  { code: "CONT02", label: "FAQ structurée présente", dimension: "depth", description: "Une section FAQ est présente, structurée avec des balises sémantiques et idéalement balisée en schema.org FAQPage.", isPreAudit: true },
  { code: "CONT03", label: "Blog/actualités actif (publications récentes)", dimension: "depth", description: "Un espace blog ou actualités est maintenu avec des publications récentes (moins de 3 mois), démontrant une activité éditoriale régulière.", isPreAudit: true },
  { code: "CONT04", label: "Témoignages/cas clients présents", dimension: "depth", description: "Le site présente des témoignages clients ou des études de cas concrètes renforçant la crédibilité et l'expérience.", isPreAudit: false },
  { code: "CONT05", label: "Contenu multimédia (vidéos, infographies)", dimension: "depth", description: "Le contenu est enrichi par des éléments multimédias pertinents (vidéos, infographies, schémas) qui complètent le texte.", isPreAudit: false },

  // === Quality (5 items) ===
  { code: "CONT06", label: "Hiérarchie Hn claire et descriptive", dimension: "quality", description: "Les titres H1 à H6 forment une hiérarchie logique et descriptive qui structure le contenu de manière compréhensible.", isPreAudit: true },
  { code: "CONT07", label: "Lisibilité adaptée à l'audience (Flesch ≥ 50)", dimension: "quality", description: "Le niveau de lisibilité du contenu est adapté à l'audience cible, avec un score de lisibilité Flesch-Kincaid supérieur ou égal à 50.", isPreAudit: false },
  { code: "CONT08", label: "CTAs présents et clairs sur chaque page", dimension: "quality", description: "Chaque page dispose d'appels à l'action (CTA) visibles, explicites et pertinents guidant le visiteur vers l'étape suivante.", isPreAudit: true },
  { code: "CONT09", label: "Ton de voix cohérent et professionnel", dimension: "quality", description: "Le ton éditorial est uniforme sur l'ensemble du site, professionnel et adapté au positionnement de la marque.", isPreAudit: false },
  { code: "CONT10", label: "Contenu original (pas de texte générique/dupliqué)", dimension: "quality", description: "Le contenu est original, apporte une perspective unique et ne reprend pas du texte générique ou dupliqué d'autres sources.", isPreAudit: false },

  // === Legal (3 items) ===
  { code: "CONT11", label: "Politique de confidentialité conforme nLPD/RGPD", dimension: "legal", description: "Une politique de confidentialité est publiée, conforme à la nLPD suisse et au RGPD européen, détaillant les traitements de données.", isPreAudit: false },
  { code: "CONT12", label: "Mentions légales présentes et complètes", dimension: "legal", description: "Les mentions légales sont présentes avec les informations obligatoires : raison sociale, adresse, contact, numéro d'enregistrement.", isPreAudit: false },
  { code: "CONT13", label: "Gestion des cookies transparente (bannière + paramétrage)", dimension: "legal", description: "Un bandeau cookies conforme est présent avec possibilité de paramétrage granulaire (accepter, refuser, personnaliser).", isPreAudit: false },

  // === GEO Potential (2 items) ===
  { code: "CONT14", label: "Contenu structuré pour citabilité IA (données structurées, FAQ, réponses directes)", dimension: "geo_potential", description: "Le contenu est formaté pour être facilement extrait par les moteurs IA : données structurées schema.org, réponses directes aux questions, paragraphes autonomes et citables.", isPreAudit: false },
  { code: "CONT15", label: "Multilinguisme disponible (opportunité marché)", dimension: "geo_potential", description: "Le site propose du contenu dans plusieurs langues adaptées à son marché cible (FR/DE/EN pour la Suisse, par exemple).", isPreAudit: false },
];

export const CONTENU_PRE_AUDIT_ITEMS = CONTENU_ITEMS.filter((item) => item.isPreAudit);

// Verify counts
if (CONTENU_ITEMS.length !== 15) {
  console.warn(`Expected 15 CONTENU items, got ${CONTENU_ITEMS.length}`);
}
