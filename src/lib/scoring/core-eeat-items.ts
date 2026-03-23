import type { CoreEeatDimension } from "@/types/audit";

/**
 * Définition des 80 items CORE-EEAT.
 * Les 20 items marqués `isExpress: true` sont les plus discriminants
 * et sont utilisés dans l'audit express.
 *
 * TODO: À affiner lors de l'atelier avec Arthur (Question ouverte Q7).
 * Les items express actuels sont une sélection préliminaire basée sur
 * le repo aaron-he-zhu/seo-geo-claude-skills.
 */

export interface CoreEeatItemDef {
  code: string;
  label: string;
  dimension: CoreEeatDimension;
  description: string;
  isExpress: boolean;
  isGeoFirst: boolean;
}

export const CORE_EEAT_ITEMS: CoreEeatItemDef[] = [
  // === C — Contextual Clarity (10 items) ===
  { code: "C01", label: "Titre de page clair et descriptif", dimension: "C", description: "Le title tag reflète précisément le contenu et l'intention de la page.", isExpress: true, isGeoFirst: false },
  { code: "C02", label: "Structure de contenu IA-compatible", dimension: "C", description: "Le contenu est structuré de manière à être facilement extrait et cité par les moteurs IA (définitions claires, paragraphes autonomes).", isExpress: true, isGeoFirst: true },
  { code: "C03", label: "Hiérarchie de headings logique", dimension: "C", description: "H1 unique, H2-H6 en cascade logique reflétant la structure du contenu.", isExpress: false, isGeoFirst: false },
  { code: "C04", label: "Introduction contextualisante", dimension: "C", description: "Le premier paragraphe définit clairement le sujet, le contexte et la valeur pour le lecteur.", isExpress: false, isGeoFirst: false },
  { code: "C05", label: "Méta-description optimisée", dimension: "C", description: "Meta description présente, unique, entre 120-160 caractères, incitant au clic.", isExpress: true, isGeoFirst: false },
  { code: "C06", label: "URL sémantique", dimension: "C", description: "L'URL est courte, lisible et contient les mots-clés principaux.", isExpress: false, isGeoFirst: false },
  { code: "C07", label: "Fil d'Ariane (breadcrumb)", dimension: "C", description: "Breadcrumb visible et balisé en structured data.", isExpress: false, isGeoFirst: false },
  { code: "C08", label: "Langue déclarée", dimension: "C", description: "Attribut lang sur la balise html, cohérent avec le contenu.", isExpress: false, isGeoFirst: false },
  { code: "C09", label: "Données structurées contextuelles", dimension: "C", description: "Schema.org pertinent (FAQ, HowTo, Article, Organization) pour enrichir la compréhension IA.", isExpress: true, isGeoFirst: true },
  { code: "C10", label: "Cohérence titre/contenu", dimension: "C", description: "Le contenu de la page correspond effectivement à ce que le titre et la meta description promettent.", isExpress: false, isGeoFirst: false },

  // === O — Optimization Quality (10 items) ===
  { code: "O01", label: "Mot-clé principal dans le titre", dimension: "O", description: "Le mot-clé cible apparaît naturellement dans le title tag.", isExpress: true, isGeoFirst: false },
  { code: "O02", label: "Densité et placement des mots-clés", dimension: "O", description: "Mots-clés présents dans H1, premiers paragraphes, sans sur-optimisation.", isExpress: false, isGeoFirst: false },
  { code: "O03", label: "Optimisation pour les questions IA", dimension: "O", description: "Le contenu répond directement à des questions que les utilisateurs posent aux IA (format question/réponse).", isExpress: true, isGeoFirst: true },
  { code: "O04", label: "Images optimisées (alt, taille, format)", dimension: "O", description: "Toutes les images ont un alt descriptif, sont compressées et en format moderne (WebP/AVIF).", isExpress: true, isGeoFirst: false },
  { code: "O05", label: "Maillage interne contextuel", dimension: "O", description: "Liens internes pertinents avec ancres descriptives vers les pages stratégiques.", isExpress: false, isGeoFirst: false },
  { code: "O06", label: "Temps de chargement", dimension: "O", description: "LCP < 2.5s, Core Web Vitals dans le vert.", isExpress: false, isGeoFirst: false },
  { code: "O07", label: "Mobile-first", dimension: "O", description: "Le site est responsive et offre une UX optimale sur mobile.", isExpress: false, isGeoFirst: false },
  { code: "O08", label: "Canonicalisation", dimension: "O", description: "Balise canonical correctement définie, pas de contenu dupliqué.", isExpress: false, isGeoFirst: false },
  { code: "O09", label: "Sitemap XML", dimension: "O", description: "Sitemap à jour, soumis à Google Search Console.", isExpress: false, isGeoFirst: false },
  { code: "O10", label: "Robots.txt cohérent", dimension: "O", description: "Robots.txt ne bloque pas les pages stratégiques, autorise les crawlers IA.", isExpress: false, isGeoFirst: false },

  // === R — Reputation & References (10 items) ===
  { code: "R01", label: "Citations par les moteurs IA", dimension: "R", description: "La marque est citée dans les réponses de ChatGPT, Perplexity, Claude, Gemini.", isExpress: true, isGeoFirst: true },
  { code: "R02", label: "Présence dans les sources fiables", dimension: "R", description: "Mentions sur Wikipédia, articles de presse, sites institutionnels.", isExpress: true, isGeoFirst: true },
  { code: "R03", label: "Backlinks de qualité", dimension: "R", description: "Liens entrants depuis des domaines à forte autorité et thématiquement pertinents.", isExpress: false, isGeoFirst: true },
  { code: "R04", label: "Diversité des domaines référents", dimension: "R", description: "Les backlinks proviennent de domaines variés, pas d'un seul réseau.", isExpress: false, isGeoFirst: true },
  { code: "R05", label: "Mentions de marque sans lien", dimension: "R", description: "La marque est mentionnée sur des sites tiers même sans lien hypertexte.", isExpress: false, isGeoFirst: true },
  { code: "R06", label: "Avis et témoignages", dimension: "R", description: "Avis clients visibles, balisés en schema.org (Review, AggregateRating).", isExpress: false, isGeoFirst: false },
  { code: "R07", label: "Présence Google Business Profile", dimension: "R", description: "Fiche GBP complète et à jour avec avis.", isExpress: false, isGeoFirst: false },
  { code: "R08", label: "Cohérence NAP", dimension: "R", description: "Nom, Adresse, Téléphone identiques sur tous les annuaires.", isExpress: false, isGeoFirst: false },
  { code: "R09", label: "Liens sortants vers des sources fiables", dimension: "R", description: "Le contenu cite des sources reconnues (études, rapports, institutions).", isExpress: false, isGeoFirst: false },
  { code: "R10", label: "Absence de signaux négatifs", dimension: "R", description: "Pas de pénalités manuelles, pas de contenu toxique associé.", isExpress: false, isGeoFirst: false },

  // === E — Engagement Signals (10 items) ===
  { code: "E01", label: "Contenu engageant et partageable", dimension: "E", description: "Le contenu incite au partage social et à l'interaction, format adapté aux citations IA.", isExpress: true, isGeoFirst: true },
  { code: "E02", label: "Call-to-action clairs", dimension: "E", description: "CTAs visibles et pertinents guidant l'utilisateur.", isExpress: false, isGeoFirst: false },
  { code: "E03", label: "Contenu multimédia", dimension: "E", description: "Vidéos, infographies, images enrichissant l'expérience.", isExpress: true, isGeoFirst: false },
  { code: "E04", label: "Lisibilité du contenu", dimension: "E", description: "Paragraphes courts, listes à puces, mise en forme facilitant la lecture.", isExpress: false, isGeoFirst: false },
  { code: "E05", label: "Temps de lecture estimé", dimension: "E", description: "Contenu substantiel (> 1500 mots pour les pages piliers).", isExpress: false, isGeoFirst: false },
  { code: "E06", label: "Interaction utilisateur", dimension: "E", description: "Formulaires, commentaires, chat ou autres mécanismes d'interaction.", isExpress: false, isGeoFirst: false },
  { code: "E07", label: "Partage social facilité", dimension: "E", description: "Boutons de partage, Open Graph tags, Twitter Cards.", isExpress: false, isGeoFirst: false },
  { code: "E08", label: "Navigation intuitive", dimension: "E", description: "Menu clair, recherche interne, accès rapide aux pages clés.", isExpress: false, isGeoFirst: false },
  { code: "E09", label: "Absence de publicité intrusive", dimension: "E", description: "Pas de popups agressifs, pas d'interstitiels bloquants.", isExpress: false, isGeoFirst: false },
  { code: "E10", label: "Accessibilité (a11y)", dimension: "E", description: "Contraste suffisant, navigation clavier, ARIA labels.", isExpress: false, isGeoFirst: false },

  // === Exp — Experience (10 items) ===
  { code: "Exp01", label: "Contenu basé sur l'expérience réelle", dimension: "Exp", description: "Le contenu démontre une expérience directe du sujet (cas clients, exemples vécus).", isExpress: true, isGeoFirst: false },
  { code: "Exp02", label: "Études de cas détaillées", dimension: "Exp", description: "Présence d'études de cas avec métriques et résultats concrets.", isExpress: true, isGeoFirst: false },
  { code: "Exp03", label: "Témoignages clients authentiques", dimension: "Exp", description: "Témoignages avec noms, entreprises, photos — pas de témoignages génériques.", isExpress: false, isGeoFirst: false },
  { code: "Exp04", label: "Contenu original (pas IA générique)", dimension: "Exp", description: "Le contenu apporte une perspective unique, pas du texte IA reformulé.", isExpress: false, isGeoFirst: false },
  { code: "Exp05", label: "Visuels originaux", dimension: "Exp", description: "Photos, captures d'écran, graphiques créés en interne (pas de stock photos génériques).", isExpress: false, isGeoFirst: false },
  { code: "Exp06", label: "Démonstration de processus", dimension: "Exp", description: "Le contenu montre le comment (tutoriels, méthodologies, behind-the-scenes).", isExpress: false, isGeoFirst: false },
  { code: "Exp07", label: "Contenu à jour", dimension: "Exp", description: "Dates de publication/mise à jour visibles, contenu actualisé.", isExpress: false, isGeoFirst: false },
  { code: "Exp08", label: "Granularité du contenu", dimension: "Exp", description: "Le sujet est traité en profondeur, pas en surface.", isExpress: false, isGeoFirst: false },
  { code: "Exp09", label: "Perspective locale/sectorielle", dimension: "Exp", description: "Le contenu intègre des spécificités locales ou sectorielles pertinentes.", isExpress: false, isGeoFirst: false },
  { code: "Exp10", label: "Portfolio / réalisations", dimension: "Exp", description: "Section portfolio ou réalisations démontrant l'expérience concrète.", isExpress: false, isGeoFirst: false },

  // === Ept — Expertise (10 items) ===
  { code: "Ept01", label: "Auteurs identifiés et qualifiés", dimension: "Ept", description: "Les auteurs sont nommés avec bio, qualifications et liens vers profils professionnels.", isExpress: true, isGeoFirst: false },
  { code: "Ept02", label: "Contenu démontrant l'expertise", dimension: "Ept", description: "Analyses approfondies, données exclusives, insights sectoriels non triviaux.", isExpress: true, isGeoFirst: false },
  { code: "Ept03", label: "Certifications et accréditations", dimension: "Ept", description: "Certifications professionnelles, labels, accréditations affichés.", isExpress: false, isGeoFirst: false },
  { code: "Ept04", label: "Publications et interventions", dimension: "Ept", description: "Liens vers des publications, conférences, webinaires des experts.", isExpress: false, isGeoFirst: false },
  { code: "Ept05", label: "Méthodologie expliquée", dimension: "Ept", description: "La méthodologie de travail est documentée et transparente.", isExpress: false, isGeoFirst: false },
  { code: "Ept06", label: "FAQ technique", dimension: "Ept", description: "Section FAQ répondant aux questions techniques du domaine.", isExpress: false, isGeoFirst: false },
  { code: "Ept07", label: "Vocabulaire spécialisé maîtrisé", dimension: "Ept", description: "Utilisation correcte du jargon professionnel du secteur.", isExpress: false, isGeoFirst: false },
  { code: "Ept08", label: "Comparatifs et benchmarks", dimension: "Ept", description: "Présence de comparatifs objectifs basés sur des données.", isExpress: false, isGeoFirst: false },
  { code: "Ept09", label: "Guides et ressources pédagogiques", dimension: "Ept", description: "Contenu éducatif structuré aidant le lecteur à progresser.", isExpress: false, isGeoFirst: false },
  { code: "Ept10", label: "Veille et actualités sectorielles", dimension: "Ept", description: "Contenu de veille démontrant un suivi actif du secteur.", isExpress: false, isGeoFirst: false },

  // === A — Authoritativeness (10 items) ===
  { code: "A01", label: "Reconnaissance sectorielle", dimension: "A", description: "La marque est reconnue comme référence dans son secteur (classements, awards).", isExpress: true, isGeoFirst: false },
  { code: "A02", label: "Couverture médiatique", dimension: "A", description: "Articles de presse, interviews, mentions dans les médias spécialisés.", isExpress: true, isGeoFirst: false },
  { code: "A03", label: "Partenariats stratégiques", dimension: "A", description: "Partenariats avec des organisations reconnues, visibles sur le site.", isExpress: false, isGeoFirst: false },
  { code: "A04", label: "Présence Knowledge Graph Google", dimension: "A", description: "La marque apparaît dans le Knowledge Graph (Knowledge Panel).", isExpress: false, isGeoFirst: false },
  { code: "A05", label: "Page Wikipédia", dimension: "A", description: "Article Wikipédia dédié à la marque ou contribution notable.", isExpress: false, isGeoFirst: false },
  { code: "A06", label: "Profils sociaux vérifiés", dimension: "A", description: "Comptes sociaux actifs, vérifiés, avec audience significative.", isExpress: false, isGeoFirst: false },
  { code: "A07", label: "Contenu repris par des tiers", dimension: "A", description: "Le contenu est cité, repris ou référencé par d'autres sites d'autorité.", isExpress: false, isGeoFirst: false },
  { code: "A08", label: "Ancienneté du domaine", dimension: "A", description: "Le domaine a un historique établi (> 2 ans).", isExpress: false, isGeoFirst: false },
  { code: "A09", label: "Consistance de publication", dimension: "A", description: "Rythme de publication régulier démontrant un engagement continu.", isExpress: false, isGeoFirst: false },
  { code: "A10", label: "Ecosystem de contenu", dimension: "A", description: "Blog, podcast, newsletter, chaîne YouTube — présence multi-canal.", isExpress: false, isGeoFirst: false },

  // === T — Trustworthiness (10 items) ===
  { code: "T01", label: "HTTPS et sécurité", dimension: "T", description: "Certificat SSL valide, HSTS activé, pas de contenu mixte.", isExpress: true, isGeoFirst: false },
  { code: "T02", label: "Mentions légales complètes", dimension: "T", description: "CGV, politique de confidentialité, mentions légales conformes RGPD.", isExpress: true, isGeoFirst: false },
  { code: "T03", label: "Coordonnées vérifiables", dimension: "T", description: "Adresse physique, téléphone, email de contact facilement accessibles.", isExpress: false, isGeoFirst: false },
  { code: "T04", label: "Transparence tarifaire", dimension: "T", description: "Tarifs ou fourchettes de prix affichés quand applicable.", isExpress: false, isGeoFirst: false },
  { code: "T05", label: "Politique de retour/garantie", dimension: "T", description: "Conditions de retour/garantie claires (e-commerce).", isExpress: false, isGeoFirst: false },
  { code: "T06", label: "Avis vérifiés", dimension: "T", description: "Avis provenant de plateformes vérifiées (Google, Trustpilot, etc.).", isExpress: false, isGeoFirst: false },
  { code: "T07", label: "Absence de dark patterns", dimension: "T", description: "Pas de techniques manipulatoires (urgence artificielle, opt-out cachés).", isExpress: false, isGeoFirst: false },
  { code: "T08", label: "Transparence sur l'utilisation de l'IA", dimension: "T", description: "Si du contenu est généré par IA, c'est indiqué.", isExpress: false, isGeoFirst: false },
  { code: "T09", label: "Sécurité des données utilisateur", dimension: "T", description: "Formulaires sécurisés, pas de fuite de données, conformité RGPD.", isExpress: false, isGeoFirst: false },
  { code: "T10", label: "Sources citées et vérifiables", dimension: "T", description: "Les affirmations sont soutenues par des sources avec liens.", isExpress: false, isGeoFirst: false },
];

export const EXPRESS_ITEMS = CORE_EEAT_ITEMS.filter((item) => item.isExpress);
export const GEO_FIRST_ITEMS = CORE_EEAT_ITEMS.filter((item) => item.isGeoFirst);

// Verify counts
if (CORE_EEAT_ITEMS.length !== 80) {
  console.warn(`Expected 80 CORE-EEAT items, got ${CORE_EEAT_ITEMS.length}`);
}
if (EXPRESS_ITEMS.length !== 20) {
  console.warn(`Expected 20 express items, got ${EXPRESS_ITEMS.length}`);
}
