/**
 * Définition des 15 items Technical.
 * Les 5 items marqués `isPreAudit: true` sont utilisés dans le pré-audit.
 * L'audit complet/ultra utilise les 15 items.
 */

export interface TechItemDef {
  code: string;
  label: string;
  dimension: string; // "stack" | "security" | "ia_access"
  description: string;
  isPreAudit: boolean;
}

export const TECH_ITEMS: TechItemDef[] = [
  // === Stack & Hosting (5 items) ===
  { code: "TECH01", label: "HTTPS avec redirection HTTP→HTTPS", dimension: "stack", description: "Le site force la connexion sécurisée via une redirection automatique HTTP vers HTTPS.", isPreAudit: true },
  { code: "TECH02", label: "Certificat SSL valide et à jour", dimension: "stack", description: "Le certificat SSL/TLS est valide, non expiré et émis par une autorité reconnue.", isPreAudit: true },
  { code: "TECH03", label: "Responsive design (4 breakpoints)", dimension: "stack", description: "Le site s'adapte correctement à 4 breakpoints (mobile, tablette, desktop, large desktop).", isPreAudit: true },
  { code: "TECH04", label: "Plateforme identifiée et à jour", dimension: "stack", description: "Le CMS ou framework utilisé est identifiable et dans une version récente/supportée.", isPreAudit: false },
  { code: "TECH05", label: "DNS correctement configuré (SPF/DKIM/DMARC si visible)", dimension: "stack", description: "La configuration DNS inclut les enregistrements SPF, DKIM et DMARC pour l'authentification email.", isPreAudit: false },

  // === Security Headers (5 items) ===
  { code: "TECH06", label: "Content-Security-Policy présent", dimension: "security", description: "L'en-tête Content-Security-Policy est défini pour limiter les sources de contenu autorisées.", isPreAudit: true },
  { code: "TECH07", label: "X-Frame-Options / X-Content-Type-Options présents", dimension: "security", description: "Les en-têtes X-Frame-Options et X-Content-Type-Options sont définis pour prévenir le clickjacking et le MIME sniffing.", isPreAudit: true },
  { code: "TECH08", label: "Referrer-Policy configurée", dimension: "security", description: "L'en-tête Referrer-Policy est défini pour contrôler les informations de référent transmises.", isPreAudit: false },
  { code: "TECH09", label: "Permissions-Policy configurée", dimension: "security", description: "L'en-tête Permissions-Policy est défini pour restreindre l'accès aux API navigateur (caméra, géolocalisation, etc.).", isPreAudit: false },
  { code: "TECH10", label: "Strict-Transport-Security (HSTS)", dimension: "security", description: "L'en-tête HSTS est défini pour forcer les connexions HTTPS sur une durée longue.", isPreAudit: false },

  // === IA Accessibility (5 items) ===
  { code: "TECH11", label: "robots.txt autorise les bots IA (GPTBot, ClaudeBot, PerplexityBot)", dimension: "ia_access", description: "Le fichier robots.txt n'interdit pas l'accès aux crawlers des moteurs IA principaux.", isPreAudit: false },
  { code: "TECH12", label: "llms.txt présent et renseigné", dimension: "ia_access", description: "Un fichier llms.txt est présent à la racine et fournit le contexte nécessaire aux LLM.", isPreAudit: false },
  { code: "TECH13", label: "sitemap.xml valide et à jour", dimension: "ia_access", description: "Le sitemap XML est présent, valide, référencé dans robots.txt et contient les pages actives.", isPreAudit: false },
  { code: "TECH14", label: "Données structurées schema.org (LocalBusiness, FAQ, etc.)", dimension: "ia_access", description: "Des données structurées schema.org pertinentes sont implémentées (LocalBusiness, FAQ, Organization, etc.).", isPreAudit: false },
  { code: "TECH15", label: "Pas d'anomalies techniques (copyright à jour, liens morts, erreurs console)", dimension: "ia_access", description: "Aucune anomalie technique visible : copyright à jour, pas de liens morts, pas d'erreurs JavaScript en console.", isPreAudit: false },
];

export const TECH_PRE_AUDIT_ITEMS = TECH_ITEMS.filter((item) => item.isPreAudit);

// Verify counts
if (TECH_ITEMS.length !== 15) {
  console.warn(`Expected 15 TECH items, got ${TECH_ITEMS.length}`);
}
if (TECH_PRE_AUDIT_ITEMS.length !== 5) {
  console.warn(`Expected 5 pre-audit TECH items, got ${TECH_PRE_AUDIT_ITEMS.length}`);
}
