/**
 * Définition des 20 items Éco-conception (RGESN).
 * Focus sur les critères observables côté client.
 * `isAuditableRemotely: false` pour les items nécessitant un accès serveur/code.
 */

export interface RgesnItemDef {
  code: string;
  label: string;
  dimension: "strategy" | "ux_ui" | "content" | "frontend" | "backend" | "hosting";
  description: string;
  isPreAudit: boolean;
  isAuditableRemotely: boolean;
}

export const RGESN_ITEMS: RgesnItemDef[] = [
  // === UX/UI (5 items) ===
  { code: "RGESN01", label: "Pas d'autoplay vidéo/audio", dimension: "ux_ui", description: "Aucune vidéo ou piste audio ne se lance automatiquement au chargement de la page (réf. RGESN 4.1).", isPreAudit: true, isAuditableRemotely: true },
  { code: "RGESN02", label: "Pas de scroll infini", dimension: "ux_ui", description: "Le site utilise une pagination classique plutôt qu'un défilement infini qui charge du contenu en continu (réf. RGESN 4.2).", isPreAudit: true, isAuditableRemotely: true },
  { code: "RGESN03", label: "Composants natifs privilégiés (pas de surcouche JS)", dimension: "ux_ui", description: "Les composants d'interface utilisent les éléments HTML natifs plutôt que des surcouches JavaScript lourdes (réf. RGESN 4.5).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN04", label: "Sobriété média (vidéos/animations limitées au nécessaire)", dimension: "ux_ui", description: "Les vidéos et animations sont utilisées uniquement quand elles apportent une valeur informationnelle réelle (réf. RGESN 4.7).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN05", label: "≤2 familles de polices, poids total ≤ 400Ko", dimension: "ux_ui", description: "Le site utilise au maximum 2 familles de polices pour un poids total n'excédant pas 400 Ko (réf. RGESN 4.8).", isPreAudit: true, isAuditableRemotely: true },

  // === Content (5 items) ===
  { code: "RGESN06", label: "Images au format adapté (WebP/AVIF)", dimension: "content", description: "Les images sont servies dans des formats modernes et efficaces comme WebP ou AVIF (réf. RGESN 5.1).", isPreAudit: true, isAuditableRemotely: true },
  { code: "RGESN07", label: "Images compressées et redimensionnées", dimension: "content", description: "Les images sont compressées de manière adaptée à leur usage et redimensionnées aux dimensions nécessaires (réf. RGESN 5.2).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN08", label: "Vidéos en définition adaptée au contexte", dimension: "content", description: "Les vidéos sont servies dans une résolution adaptée au contexte d'affichage et au terminal (réf. RGESN 5.3).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN09", label: "Mode audio seul disponible pour les vidéos", dimension: "content", description: "Un mode écoute seule est proposé pour les vidéos dont le contenu audio est suffisant (réf. RGESN 5.5).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN10", label: "Contenus obsolètes archivés/supprimés", dimension: "content", description: "Les contenus périmés ou obsolètes sont archivés ou supprimés régulièrement (réf. RGESN 5.8).", isPreAudit: false, isAuditableRemotely: true },

  // === Frontend (5 items) ===
  { code: "RGESN11", label: "Poids page + requêtes limités par écran", dimension: "frontend", description: "Le poids total de la page et le nombre de requêtes HTTP sont maîtrisés et limités (réf. RGESN 6.1).", isPreAudit: true, isAuditableRemotely: true },
  { code: "RGESN12", label: "Cache navigateur configuré", dimension: "frontend", description: "Les en-têtes de cache HTTP (Cache-Control, ETag) sont correctement configurés pour les ressources statiques (réf. RGESN 6.2).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN13", label: "Ressources compressées (gzip/brotli)", dimension: "frontend", description: "Les ressources textuelles (HTML, CSS, JS) sont servies avec compression gzip ou brotli (réf. RGESN 6.3).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN14", label: "Dimensions images = dimensions affichage", dimension: "frontend", description: "Les images sont servies aux dimensions réelles d'affichage, sans redimensionnement côté navigateur (réf. RGESN 6.4).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN15", label: "Pas de ressources inutiles chargées", dimension: "frontend", description: "Aucune ressource (JS, CSS, police, image) n'est chargée sans être effectivement utilisée sur la page (réf. RGESN 6.5).", isPreAudit: false, isAuditableRemotely: true },

  // === Backend/Hosting (5 items) ===
  { code: "RGESN16", label: "Cache serveur configuré", dimension: "backend", description: "Un mécanisme de cache côté serveur est en place pour éviter les recalculs inutiles (réf. RGESN 7.1).", isPreAudit: false, isAuditableRemotely: false },
  { code: "RGESN17", label: "Durées de rétention des données définies", dimension: "backend", description: "Les durées de conservation des données sont définies et les données expirées sont purgées (réf. RGESN 7.2).", isPreAudit: false, isAuditableRemotely: false },
  { code: "RGESN18", label: "Hébergement éco-responsable", dimension: "hosting", description: "L'hébergeur affiche une politique environnementale et des engagements mesurables (réf. RGESN 8.1).", isPreAudit: false, isAuditableRemotely: true },
  { code: "RGESN19", label: "Énergie renouvelable documentée", dimension: "hosting", description: "L'hébergeur documente sa part d'énergie renouvelable dans son mix énergétique (réf. RGESN 8.5).", isPreAudit: false, isAuditableRemotely: false },
  { code: "RGESN20", label: "Localisation serveur cohérente avec audience", dimension: "hosting", description: "Les serveurs sont géographiquement proches de l'audience cible pour minimiser la latence et l'empreinte réseau (réf. RGESN 8.6).", isPreAudit: false, isAuditableRemotely: true },
];

export const RGESN_PRE_AUDIT_ITEMS = RGESN_ITEMS.filter((item) => item.isPreAudit);
export const RGESN_REMOTE_AUDITABLE_ITEMS = RGESN_ITEMS.filter((item) => item.isAuditableRemotely);

// Verify counts
if (RGESN_ITEMS.length !== 20) {
  console.warn(`Expected 20 RGESN items, got ${RGESN_ITEMS.length}`);
}
