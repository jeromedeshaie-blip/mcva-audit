/**
 * Définition des 20 items Accessibilité (RGAA 4.1.2).
 * Couvre les 13 thématiques RGAA, priorisées par impact.
 * Les items marqués `isPreAudit: true` sont vérifiables en pré-audit automatisé.
 */

export interface A11yItemDef {
  code: string;
  label: string;
  dimension: string; // maps to RGAA thematic
  description: string;
  isPreAudit: boolean;
}

export const A11Y_ITEMS: A11yItemDef[] = [
  // === Images ===
  { code: "A11Y01", label: "Textes alternatifs (alt) présents et pertinents", dimension: "images", description: "Toutes les images porteuses d'information possèdent un attribut alt décrivant leur contenu de manière pertinente.", isPreAudit: true },
  { code: "A11Y02", label: "Images décoratives marquées aria-hidden", dimension: "images", description: "Les images purement décoratives sont marquées avec aria-hidden=\"true\" ou un alt vide pour être ignorées par les lecteurs d'écran.", isPreAudit: true },

  // === Couleurs ===
  { code: "A11Y03", label: "Contraste texte/fond ≥ 4.5:1", dimension: "couleurs", description: "Le ratio de contraste entre le texte et son arrière-plan respecte le minimum WCAG AA de 4.5:1 (3:1 pour les grands textes).", isPreAudit: true },
  { code: "A11Y04", label: "Information non véhiculée uniquement par la couleur", dimension: "couleurs", description: "L'information transmise par la couleur est doublée par un autre moyen visuel (icône, texte, motif).", isPreAudit: false },

  // === Liens ===
  { code: "A11Y05", label: "Intitulés de liens explicites et descriptifs", dimension: "liens", description: "Chaque lien possède un intitulé compréhensible hors contexte (pas de « cliquez ici » ou « en savoir plus » seul).", isPreAudit: true },

  // === Scripts ===
  { code: "A11Y06", label: "Composants interactifs accessibles au clavier", dimension: "scripts", description: "Tous les composants interactifs (menus, modales, accordéons) sont utilisables au clavier sans souris.", isPreAudit: false },
  { code: "A11Y07", label: "Messages de statut accessibles (aria-live)", dimension: "scripts", description: "Les messages de statut dynamiques (succès, erreur, chargement) utilisent aria-live pour être annoncés par les lecteurs d'écran.", isPreAudit: false },

  // === Éléments obligatoires ===
  { code: "A11Y08", label: "Titre de page présent et pertinent", dimension: "elements_obligatoires", description: "Chaque page possède un élément <title> unique et descriptif reflétant son contenu.", isPreAudit: true },
  { code: "A11Y09", label: "Langue de la page déclarée (lang)", dimension: "elements_obligatoires", description: "L'attribut lang est présent sur la balise <html> et correspond à la langue principale du contenu.", isPreAudit: false },

  // === Structuration ===
  { code: "A11Y10", label: "Hiérarchie des titres (H1→H6) logique et sans saut", dimension: "structuration", description: "La hiérarchie des titres est cohérente : un seul H1 par page, pas de saut de niveau (ex. H2 → H4 sans H3).", isPreAudit: false },
  { code: "A11Y11", label: "Listes correctement balisées (ul/ol/dl)", dimension: "structuration", description: "Les listes de contenu utilisent les balises sémantiques appropriées (ul, ol, dl) et non des paragraphes ou des div.", isPreAudit: false },

  // === Présentation ===
  { code: "A11Y12", label: "Zoom 200% sans perte de contenu", dimension: "presentation", description: "Le contenu reste lisible et fonctionnel avec un zoom navigateur à 200%, sans perte d'information ni barre de défilement horizontale.", isPreAudit: false },
  { code: "A11Y13", label: "Focus visible sur les éléments interactifs", dimension: "presentation", description: "Un indicateur de focus clairement visible est affiché sur tous les éléments interactifs lors de la navigation clavier.", isPreAudit: false },

  // === Formulaires ===
  { code: "A11Y14", label: "Labels associés à chaque champ", dimension: "formulaires", description: "Chaque champ de formulaire est associé à un label explicite via l'attribut for/id ou un aria-label.", isPreAudit: false },
  { code: "A11Y15", label: "Messages d'erreur explicites et accessibles", dimension: "formulaires", description: "Les erreurs de formulaire sont décrites de manière explicite, associées au champ concerné et annoncées aux technologies d'assistance.", isPreAudit: false },

  // === Navigation ===
  { code: "A11Y16", label: "Ordre de tabulation logique", dimension: "navigation", description: "L'ordre de tabulation suit l'ordre visuel et logique du contenu, sans piège clavier.", isPreAudit: false },
  { code: "A11Y17", label: "Skip link présent", dimension: "navigation", description: "Un lien d'évitement (« Aller au contenu principal ») est présent en début de page pour sauter la navigation.", isPreAudit: false },

  // === Cadres ===
  { code: "A11Y18", label: "Titres de frames/iframes", dimension: "cadres", description: "Chaque iframe et frame possède un attribut title décrivant son contenu.", isPreAudit: false },

  // === Multimédia ===
  { code: "A11Y19", label: "Sous-titres pour les vidéos", dimension: "multimedia", description: "Les vidéos contenant de la parole disposent de sous-titres synchronisés et fidèles.", isPreAudit: false },

  // === Consultation ===
  { code: "A11Y20", label: "Documents téléchargeables accessibles", dimension: "consultation", description: "Les documents proposés en téléchargement (PDF, DOCX) respectent les règles d'accessibilité (structure, alt, balisage).", isPreAudit: false },
];

export const A11Y_PRE_AUDIT_ITEMS = A11Y_ITEMS.filter((item) => item.isPreAudit);

// Verify counts
if (A11Y_ITEMS.length !== 20) {
  console.warn(`Expected 20 A11Y items, got ${A11Y_ITEMS.length}`);
}
