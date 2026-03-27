import type { CrawlResult } from "./crawler";
import type { SeoCheck, SchemaData } from "./types";

export function runSeoChecks(
  crawl: CrawlResult,
  robotsData: {
    exists: boolean;
    hasSitemap: boolean;
    sitemapUrl: string | null;
    blocksAll: boolean;
  }
): { checks: SeoCheck[]; score: number; schemaData: SchemaData } {
  const checks: SeoCheck[] = [];

  // ── BALISES META ──────────────────────────────────────────

  checks.push({
    id: "title_present",
    label: "Balise <title> présente",
    status: crawl.title ? "pass" : "fail",
    value: crawl.title || undefined,
    impact: "both",
  });

  checks.push({
    id: "title_length",
    label: "Longueur du titre (50–60 caractères)",
    status: crawl.title
      ? crawl.title.length >= 30 && crawl.title.length <= 65
        ? "pass"
        : "warn"
      : "fail",
    value: crawl.title ? `${crawl.title.length} caractères` : undefined,
    expected: "30–65 caractères",
    impact: "seo",
  });

  checks.push({
    id: "meta_description",
    label: "Meta description présente",
    status: crawl.metaDescription ? "pass" : "fail",
    value: crawl.metaDescription?.substring(0, 80) || undefined,
    impact: "seo",
    description:
      "Absente — les LLM utilisent la meta description pour comprendre le positionnement du site",
  });

  checks.push({
    id: "meta_description_length",
    label: "Longueur meta description (120–160 car.)",
    status: crawl.metaDescription
      ? crawl.metaDescription.length >= 100 &&
        crawl.metaDescription.length <= 165
        ? "pass"
        : "warn"
      : "fail",
    value: crawl.metaDescription
      ? `${crawl.metaDescription.length} caractères`
      : undefined,
    impact: "seo",
  });

  // ── STRUCTURE H1/H2/H3 ────────────────────────────────────

  checks.push({
    id: "h1_present",
    label: "Balise H1 présente",
    status: crawl.h1.length > 0 ? "pass" : "fail",
    value: crawl.h1[0] || undefined,
    impact: "both",
    description:
      "Le H1 est la première phrase lue par les LLM pour qualifier le site",
  });

  checks.push({
    id: "h1_unique",
    label: "Un seul H1 par page",
    status:
      crawl.h1.length === 1 ? "pass" : crawl.h1.length === 0 ? "fail" : "warn",
    value:
      crawl.h1.length > 1 ? `${crawl.h1.length} H1 trouvés` : undefined,
    impact: "seo",
  });

  checks.push({
    id: "h2_present",
    label: "Balises H2 présentes (structure)",
    status:
      crawl.h2.length >= 2 ? "pass" : crawl.h2.length === 1 ? "warn" : "fail",
    value: `${crawl.h2.length} H2 trouvés`,
    impact: "geo",
    description:
      "Les LLM extraient leurs réponses depuis les sections H2/H3 des pages",
  });

  // ── TECHNIQUE ─────────────────────────────────────────────

  checks.push({
    id: "https",
    label: "Site en HTTPS",
    status: crawl.url.startsWith("https://") ? "pass" : "fail",
    impact: "seo",
  });

  checks.push({
    id: "viewport",
    label: "Meta viewport (responsive)",
    status: crawl.hasViewport ? "pass" : "fail",
    impact: "seo",
  });

  checks.push({
    id: "canonical",
    label: "URL canonique définie",
    status: crawl.canonicalUrl ? "pass" : "warn",
    value: crawl.canonicalUrl || undefined,
    impact: "seo",
  });

  checks.push({
    id: "robots_txt",
    label: "Fichier robots.txt présent",
    status: robotsData.exists ? "pass" : "warn",
    impact: "seo",
  });

  checks.push({
    id: "sitemap",
    label: "Sitemap XML référencé",
    status: robotsData.hasSitemap ? "pass" : "warn",
    value: robotsData.sitemapUrl || undefined,
    impact: "seo",
  });

  // ── IMAGES ────────────────────────────────────────────────

  const imagesWithoutAlt = crawl.images.filter(
    (img) => !img.alt || img.alt.trim() === ""
  ).length;
  const totalImages = crawl.images.length;

  checks.push({
    id: "images_alt",
    label: "Attributs alt sur les images",
    status:
      imagesWithoutAlt === 0
        ? "pass"
        : imagesWithoutAlt <= 2
        ? "warn"
        : "fail",
    value:
      totalImages > 0
        ? `${imagesWithoutAlt}/${totalImages} images sans alt`
        : "Aucune image",
    impact: "seo",
  });

  // ── HREFLANG ──────────────────────────────────────────────

  checks.push({
    id: "hreflang",
    label: "Balises hreflang (multilingue)",
    status: crawl.hreflang.length > 0 ? "pass" : "warn",
    value:
      crawl.hreflang.length > 0
        ? crawl.hreflang.map((h) => h.lang).join(", ")
        : "Absent",
    impact: "geo",
    description:
      "Critique pour le marché suisse — permet aux LLM de distinguer FR/DE/EN",
  });

  // ── SCHEMA.ORG ────────────────────────────────────────────

  const schemaData = parseSchemaData(crawl.schemaScripts);

  checks.push({
    id: "schema_local_business",
    label: "Schema.org LocalBusiness",
    status: schemaData.has_local_business ? "pass" : "fail",
    impact: "geo",
    description:
      "Absent — LocalBusiness est la donnée structurée la plus importante pour être cité par les LLM sur des requêtes géolocalisées",
  });

  checks.push({
    id: "schema_faq",
    label: "Schema.org FAQPage",
    status: schemaData.has_faq ? "pass" : "warn",
    impact: "geo",
    description:
      "Un schema FAQPage structuré en Q&A est directement extrait par ChatGPT et Perplexity",
  });

  // ── CALCUL SCORE SEO (0–100) ──────────────────────────────

  const passCount = checks.filter((c) => c.status === "pass").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const totalChecks = checks.length;
  const score = Math.round(
    ((passCount + warnCount * 0.5) / totalChecks) * 100
  );

  return { checks, score, schemaData };
}

function parseSchemaData(scripts: string[]): SchemaData {
  const schemas: string[] = [];
  let has_local_business = false;
  let has_faq = false;
  let has_breadcrumb = false;
  let has_website = false;
  const issues: string[] = [];

  for (const script of scripts) {
    try {
      const data = JSON.parse(script);
      const types = Array.isArray(data)
        ? data.map((d: any) => d["@type"]).flat()
        : [data["@type"]];

      for (const type of types) {
        if (!type) continue;
        schemas.push(type);
        if (
          [
            "LocalBusiness",
            "AccountingService",
            "FinancialService",
            "ProfessionalService",
          ].includes(type)
        )
          has_local_business = true;
        if (type === "FAQPage") has_faq = true;
        if (type === "BreadcrumbList") has_breadcrumb = true;
        if (type === "WebSite") has_website = true;
      }
    } catch {
      issues.push("JSON-LD invalide ou mal formé");
    }
  }

  if (schemas.length === 0)
    issues.push("Aucune donnée structurée Schema.org trouvée");
  if (!has_local_business)
    issues.push(
      "LocalBusiness manquant — critique pour la visibilité LLM locale"
    );

  return {
    schemas_found: schemas,
    has_local_business,
    has_faq,
    has_breadcrumb,
    has_website,
    issues,
  };
}
