import type { CiteDimension } from "@/types/audit";

/**
 * Définition des 40 items CITE (Crédibilité, Influence, Confiance, Engagement).
 * Les 10 items marqués `isExpress: true` sont utilisés dans l'audit express.
 *
 * TODO: À affiner lors de l'atelier avec Arthur (Question ouverte Q7).
 */

export interface CiteItemDef {
  code: string;
  label: string;
  dimension: CiteDimension;
  description: string;
  isExpress: boolean;
}

export const CITE_ITEMS: CiteItemDef[] = [
  // === C — Crédibilité (10 items) ===
  { code: "CI-C01", label: "Ancienneté du domaine", dimension: "C", description: "Le domaine existe depuis plus de 2 ans, démontrant une présence établie.", isExpress: true },
  { code: "CI-C02", label: "Certificat SSL et sécurité", dimension: "C", description: "HTTPS actif avec certificat valide, HSTS configuré.", isExpress: false },
  { code: "CI-C03", label: "Mentions légales et CGV", dimension: "C", description: "Pages légales complètes, conformes RGPD, facilement accessibles.", isExpress: true },
  { code: "CI-C04", label: "Cohérence des informations", dimension: "C", description: "Les informations de l'entreprise (NAP, description, secteur) sont cohérentes sur tous les canaux.", isExpress: false },
  { code: "CI-C05", label: "Pages À propos détaillées", dimension: "C", description: "Page À propos avec histoire, équipe, valeurs, chiffres clés.", isExpress: true },
  { code: "CI-C06", label: "Registre du commerce vérifiable", dimension: "C", description: "Numéro de registre du commerce ou SIRET/IDE mentionné et vérifiable.", isExpress: false },
  { code: "CI-C07", label: "Coordonnées physiques", dimension: "C", description: "Adresse physique, téléphone et email de contact clairement affichés.", isExpress: false },
  { code: "CI-C08", label: "Politique de confidentialité", dimension: "C", description: "Politique de protection des données détaillée et à jour.", isExpress: false },
  { code: "CI-C09", label: "Absence de contenu trompeur", dimension: "C", description: "Pas de fausses promesses, pas de dark patterns, pas de contenu clickbait.", isExpress: false },
  { code: "CI-C10", label: "Qualité éditoriale", dimension: "C", description: "Contenu sans fautes, bien structuré, professionnellement rédigé.", isExpress: false },

  // === I — Influence (10 items) ===
  { code: "CI-I01", label: "Authority Score", dimension: "I", description: "Score d'autorité du domaine (Semrush AS, Moz DA, ou équivalent via signaux publics).", isExpress: true },
  { code: "CI-I02", label: "Volume de backlinks", dimension: "I", description: "Nombre significatif de liens entrants depuis des domaines tiers.", isExpress: false },
  { code: "CI-I03", label: "Diversité des domaines référents", dimension: "I", description: "Backlinks provenant d'un large éventail de domaines, pas concentrés.", isExpress: true },
  { code: "CI-I04", label: "Backlinks depuis sites d'autorité", dimension: "I", description: "Liens depuis des sites .gouv, .edu, médias reconnus, organisations professionnelles.", isExpress: false },
  { code: "CI-I05", label: "Présence médiatique", dimension: "I", description: "Articles de presse, interviews, citations dans les médias spécialisés.", isExpress: true },
  { code: "CI-I06", label: "Audience réseaux sociaux", dimension: "I", description: "Présence active sur les réseaux sociaux avec audience significative.", isExpress: false },
  { code: "CI-I07", label: "Trafic organique estimé", dimension: "I", description: "Volume de trafic organique mensuel (Semrush ou estimation).", isExpress: false },
  { code: "CI-I08", label: "Nombre de mots-clés positionnés", dimension: "I", description: "Volume de mots-clés sur lesquels le domaine se positionne dans le top 100.", isExpress: false },
  { code: "CI-I09", label: "Présence dans les annuaires professionnels", dimension: "I", description: "Référencement dans les annuaires et répertoires de la profession.", isExpress: false },
  { code: "CI-I10", label: "Partenariats et affiliations", dimension: "I", description: "Partenariats visibles avec des organisations reconnues du secteur.", isExpress: false },

  // === T — Confiance / Trust (10 items) ===
  { code: "CI-T01", label: "Avis clients vérifiés", dimension: "T", description: "Avis sur Google Business, Trustpilot, ou plateformes d'avis vérifiés.", isExpress: true },
  { code: "CI-T02", label: "Note moyenne des avis", dimension: "T", description: "Note moyenne supérieure à 4/5 sur les principales plateformes.", isExpress: false },
  { code: "CI-T03", label: "Réponse aux avis", dimension: "T", description: "L'entreprise répond aux avis (positifs et négatifs) de manière professionnelle.", isExpress: false },
  { code: "CI-T04", label: "Témoignages clients détaillés", dimension: "T", description: "Témoignages avec noms, fonctions, entreprises, contexte du projet.", isExpress: true },
  { code: "CI-T05", label: "Études de cas avec résultats", dimension: "T", description: "Études de cas détaillées avec métriques avant/après.", isExpress: false },
  { code: "CI-T06", label: "Labels et certifications", dimension: "T", description: "Labels de qualité, certifications sectorielles, ISO, etc.", isExpress: false },
  { code: "CI-T07", label: "Google Business Profile complet", dimension: "T", description: "Fiche GBP complète avec photos, horaires, services, avis.", isExpress: false },
  { code: "CI-T08", label: "Présence Wikipédia", dimension: "T", description: "Article ou mention sur Wikipédia démontrant la notoriété.", isExpress: false },
  { code: "CI-T09", label: "Transparence tarifaire", dimension: "T", description: "Tarifs ou fourchettes de prix affichés quand applicable.", isExpress: false },
  { code: "CI-T10", label: "Garanties et engagements", dimension: "T", description: "Garanties de service, SLA, engagements qualité formalisés.", isExpress: false },

  // === E — Engagement (10 items) ===
  { code: "CI-E01", label: "Fréquence de publication", dimension: "E", description: "Rythme de publication régulier sur le blog ou les actualités.", isExpress: true },
  { code: "CI-E02", label: "Activité sur les réseaux sociaux", dimension: "E", description: "Publications régulières et interactions sur les réseaux sociaux.", isExpress: false },
  { code: "CI-E03", label: "Newsletter ou contenus récurrents", dimension: "E", description: "Newsletter, podcast, webinaires ou autre format de contenu récurrent.", isExpress: false },
  { code: "CI-E04", label: "Participation à des événements", dimension: "E", description: "Participation à des conférences, salons, webinaires du secteur.", isExpress: true },
  { code: "CI-E05", label: "Communauté active", dimension: "E", description: "Commentaires, forum, ou communauté en ligne active.", isExpress: false },
  { code: "CI-E06", label: "Contenu interactif", dimension: "E", description: "Outils, calculateurs, quiz, ou contenus interactifs proposés.", isExpress: false },
  { code: "CI-E07", label: "Mises à jour du site", dimension: "E", description: "Le site est régulièrement mis à jour (dates récentes visibles).", isExpress: false },
  { code: "CI-E08", label: "Réactivité de contact", dimension: "E", description: "Chat en ligne, formulaire de contact avec réponse rapide promise.", isExpress: false },
  { code: "CI-E09", label: "Contenu à valeur ajoutée gratuit", dimension: "E", description: "Guides, templates, outils gratuits démontrant la générosité de l'expertise.", isExpress: false },
  { code: "CI-E10", label: "Engagement RSE/ESG", dimension: "E", description: "Engagement social ou environnemental visible et documenté.", isExpress: false },
];

export const CITE_EXPRESS_ITEMS = CITE_ITEMS.filter((item) => item.isExpress);

if (CITE_ITEMS.length !== 40) {
  console.warn(`Expected 40 CITE items, got ${CITE_ITEMS.length}`);
}
if (CITE_EXPRESS_ITEMS.length !== 10) {
  console.warn(`Expected 10 CITE express items, got ${CITE_EXPRESS_ITEMS.length}`);
}
