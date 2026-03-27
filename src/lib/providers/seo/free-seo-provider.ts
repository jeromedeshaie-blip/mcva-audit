import type { SeoProvider } from "./seo-provider";
import type { SeoData, CompetitorData, CoreWebVitals, TechnicalCheck, SchemaDetail, ReadabilityData } from "@/types/audit";
import * as cheerio from "cheerio";

const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Max HTML response size: 5 MB */
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

/** Blocked hosts for SSRF protection */
const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fd/i,
  /^\[?fc/i,
  /metadata\.google\.internal/i,
];

function isBlockedUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname;
    return BLOCKED_HOSTS.some((pattern) => pattern.test(hostname));
  } catch {
    return true; // block unparseable URLs
  }
}

/**
 * FreeSeoProvider — Palier 1 (Construction)
 *
 * Analyse SEO basée sur :
 * - Scraping HTML (Cheerio) : meta tags, headings, schema.org, liens, images
 * - Google PageSpeed Insights API (gratuit) : Core Web Vitals, performance score
 *
 * Les champs Semrush-only (organic_traffic, backlinks, authority_score, etc.)
 * retournent null.
 */
export class FreeSeoProvider implements SeoProvider {
  readonly name = "free" as const;

  async getDomainOverview(domain: string): Promise<SeoData> {
    const url = domain.startsWith("https://") || domain.startsWith("http://")
      ? domain
      : `https://${domain}`;

    if (isBlockedUrl(url)) {
      throw new Error(`URL bloquée pour raisons de sécurité : ${url}`);
    }

    const [htmlData, pageSpeedData, robotsData] = await Promise.allSettled([
      this.analyzeHTML(url),
      this.getPageSpeedData(url),
      this.checkRobotsTxt(url),
    ]);

    const html = htmlData.status === "fulfilled" ? htmlData.value : getEmptyHtmlAnalysis();
    const pageSpeed = pageSpeedData.status === "fulfilled" ? pageSpeedData.value : null;
    const robots = robotsData.status === "fulfilled" ? robotsData.value : { exists: false, hasSitemap: false, sitemapUrl: null };

    // Build technical checks
    const technicalChecks = buildTechnicalChecks(html, robots, url);
    const schemaDetail = parseSchemaDetail(html.schema_scripts || []);
    const readability = analyzeReadability(html.body_text || "");

    return {
      // HTML analysis (always available)
      meta_title: html.meta_title,
      meta_description: html.meta_description,
      h1_count: html.h1_count,
      h2_count: html.h2_count,
      has_schema_org: html.has_schema_org,
      schema_types: html.schema_types,
      internal_links_count: html.internal_links_count,
      external_links_count: html.external_links_count,
      images_without_alt: html.images_without_alt,

      // PageSpeed (free API)
      page_speed_score: pageSpeed?.score ?? null,
      core_web_vitals: pageSpeed?.core_web_vitals ?? null,

      // Technical checks (enriched)
      technical_checks: technicalChecks,
      schema_detail: schemaDetail,
      readability,
      has_https: url.startsWith("https://"),
      has_viewport: html.has_viewport,
      has_canonical: !!html.canonical_url,
      canonical_url: html.canonical_url,
      has_robots_txt: robots.exists,
      has_sitemap: robots.hasSitemap,
      sitemap_url: robots.sitemapUrl,
      hreflang_tags: html.hreflang_tags,
      meta_title_length: html.meta_title ? html.meta_title.length : null,
      meta_description_length: html.meta_description ? html.meta_description.length : null,

      // Semrush-only — null in Palier 1
      organic_traffic: null,
      organic_keywords: null,
      authority_score: null,
      backlinks_total: null,
      referring_domains: null,
      top_keywords: null,
    };
  }

  async getCompetitors(_domain: string): Promise<CompetitorData[] | null> {
    // Not available in Palier 1
    return null;
  }

  private async analyzeHTML(url: string): Promise<HtmlAnalysis> {
    if (isBlockedUrl(url)) {
      throw new Error(`URL bloquée pour raisons de sécurité : ${url}`);
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MCVAAuditBot/1.0; +https://mcva.ch)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    // Check Content-Length header if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error(`Réponse trop volumineuse (${contentLength} octets, max: ${MAX_RESPONSE_SIZE})`);
    }

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Impossible de lire la réponse");
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel();
        throw new Error(`Réponse trop volumineuse (>${MAX_RESPONSE_SIZE} octets)`);
      }
      chunks.push(value);
    }

    const html = new TextDecoder().decode(
      Buffer.concat(chunks)
    );
    const $ = cheerio.load(html);

    const baseUrl = new URL(url);
    let internalLinks = 0;
    let externalLinks = 0;

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      // Skip non-HTTP protocols
      if (/^(javascript|mailto|tel|data|blob):/i.test(href)) return;
      if (href.startsWith("#")) return;
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.protocol !== "http:" && linkUrl.protocol !== "https:") return;
        if (linkUrl.hostname === baseUrl.hostname) {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch {
        // relative links count as internal
        internalLinks++;
      }
    });

    const schemaTypes: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "");
        const type = json["@type"];
        if (type) {
          schemaTypes.push(Array.isArray(type) ? type.join(", ") : type);
        }
      } catch {
        // ignore malformed JSON-LD
      }
    });

    // Hreflang tags
    const hreflangTags: { lang: string; href: string }[] = [];
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      hreflangTags.push({
        lang: $(el).attr("hreflang") || "",
        href: $(el).attr("href") || "",
      });
    });

    // Schema.org raw scripts for detailed parsing
    const schemaScripts: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      schemaScripts.push($(el).html() || "");
    });

    // Body text for readability analysis
    const $bodyClone = cheerio.load($.html());
    $bodyClone("script, style, noscript, nav, footer, header").remove();
    const bodyText = $bodyClone("body").text().replace(/\s+/g, " ").trim();

    return {
      meta_title: $("title").first().text().trim() || null,
      meta_description:
        $('meta[name="description"]').attr("content")?.trim() || null,
      h1_count: $("h1").length,
      h2_count: $("h2").length,
      has_schema_org: schemaTypes.length > 0,
      schema_types: schemaTypes,
      internal_links_count: internalLinks,
      external_links_count: externalLinks,
      images_without_alt: $("img").filter((_, el) => !$(el).attr("alt")).length,
      // New fields
      has_viewport: $('meta[name="viewport"]').length > 0,
      canonical_url: $('link[rel="canonical"]').attr("href") || null,
      hreflang_tags: hreflangTags,
      schema_scripts: schemaScripts,
      body_text: bodyText,
    };
  }

  private async checkRobotsTxt(url: string): Promise<{
    exists: boolean;
    hasSitemap: boolean;
    sitemapUrl: string | null;
  }> {
    try {
      const robotsUrl = new URL("/robots.txt", url).toString();
      const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { exists: false, hasSitemap: false, sitemapUrl: null };

      const text = await res.text();
      const sitemapMatch = text.match(/Sitemap:\s*(.+)/i);

      return {
        exists: true,
        hasSitemap: !!sitemapMatch,
        sitemapUrl: sitemapMatch ? sitemapMatch[1].trim() : null,
      };
    } catch {
      return { exists: false, hasSitemap: false, sitemapUrl: null };
    }
  }

  private async getPageSpeedData(
    url: string
  ): Promise<{ score: number; core_web_vitals: CoreWebVitals } | null> {
    const apiKey = process.env.PAGESPEED_API_KEY;
    const params = new URLSearchParams({
      url,
      category: "performance",
      strategy: "mobile",
    });
    if (apiKey) params.set("key", apiKey);

    const response = await fetch(`${PAGESPEED_API_URL}?${params}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    if (!lighthouse) return null;

    const audits = lighthouse.audits || {};

    return {
      score: Math.round((lighthouse.categories?.performance?.score || 0) * 100),
      core_web_vitals: {
        lcp: audits["largest-contentful-paint"]?.numericValue ?? null,
        fid: audits["max-potential-fid"]?.numericValue ?? null,
        cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
        inp: audits["interaction-to-next-paint"]?.numericValue ?? null,
        ttfb: audits["server-response-time"]?.numericValue ?? null,
      },
    };
  }
}

// --- Helpers ---

interface HtmlAnalysis {
  meta_title: string | null;
  meta_description: string | null;
  h1_count: number;
  h2_count: number;
  has_schema_org: boolean;
  schema_types: string[];
  internal_links_count: number;
  external_links_count: number;
  images_without_alt: number;
  // Enriched fields
  has_viewport: boolean;
  canonical_url: string | null;
  hreflang_tags: { lang: string; href: string }[];
  schema_scripts: string[];
  body_text: string;
}

function getEmptyHtmlAnalysis(): HtmlAnalysis {
  return {
    meta_title: null,
    meta_description: null,
    h1_count: 0,
    h2_count: 0,
    has_schema_org: false,
    schema_types: [],
    internal_links_count: 0,
    external_links_count: 0,
    images_without_alt: 0,
    has_viewport: false,
    canonical_url: null,
    hreflang_tags: [],
    schema_scripts: [],
    body_text: "",
  };
}

// ============================================================
// Technical Checks Builder
// ============================================================

function buildTechnicalChecks(
  html: HtmlAnalysis,
  robots: { exists: boolean; hasSitemap: boolean; sitemapUrl: string | null },
  url: string
): TechnicalCheck[] {
  const checks: TechnicalCheck[] = [];

  // -- META --
  checks.push({
    id: "title_present",
    label: "Balise <title> presente",
    status: html.meta_title ? "pass" : "fail",
    value: html.meta_title || undefined,
    impact: "both",
  });

  checks.push({
    id: "title_length",
    label: "Longueur du titre (30-65 car.)",
    status: html.meta_title
      ? html.meta_title.length >= 30 && html.meta_title.length <= 65
        ? "pass"
        : "warn"
      : "fail",
    value: html.meta_title ? `${html.meta_title.length} caracteres` : undefined,
    expected: "30-65 caracteres",
    impact: "seo",
  });

  checks.push({
    id: "meta_description",
    label: "Meta description presente",
    status: html.meta_description ? "pass" : "fail",
    value: html.meta_description?.substring(0, 80) || undefined,
    impact: "seo",
    description: "Les LLM utilisent la meta description pour comprendre le positionnement du site",
  });

  checks.push({
    id: "meta_description_length",
    label: "Longueur meta description (100-165 car.)",
    status: html.meta_description
      ? html.meta_description.length >= 100 && html.meta_description.length <= 165
        ? "pass"
        : "warn"
      : "fail",
    value: html.meta_description ? `${html.meta_description.length} caracteres` : undefined,
    impact: "seo",
  });

  // -- STRUCTURE H1/H2 --
  checks.push({
    id: "h1_present",
    label: "Balise H1 presente",
    status: html.h1_count > 0 ? "pass" : "fail",
    value: `${html.h1_count} H1`,
    impact: "both",
    description: "Le H1 est le premier signal lu par les LLM pour qualifier le site",
  });

  checks.push({
    id: "h1_unique",
    label: "Un seul H1 par page",
    status: html.h1_count === 1 ? "pass" : html.h1_count === 0 ? "fail" : "warn",
    value: html.h1_count > 1 ? `${html.h1_count} H1 trouves` : undefined,
    impact: "seo",
  });

  checks.push({
    id: "h2_present",
    label: "Balises H2 presentes (structure)",
    status: html.h2_count >= 2 ? "pass" : html.h2_count === 1 ? "warn" : "fail",
    value: `${html.h2_count} H2`,
    impact: "geo",
    description: "Les LLM extraient leurs reponses depuis les sections H2/H3",
  });

  // -- TECHNIQUE --
  checks.push({
    id: "https",
    label: "Site en HTTPS",
    status: url.startsWith("https://") ? "pass" : "fail",
    impact: "seo",
  });

  checks.push({
    id: "viewport",
    label: "Meta viewport (responsive)",
    status: html.has_viewport ? "pass" : "fail",
    impact: "seo",
  });

  checks.push({
    id: "canonical",
    label: "URL canonique definie",
    status: html.canonical_url ? "pass" : "warn",
    value: html.canonical_url || undefined,
    impact: "seo",
  });

  checks.push({
    id: "robots_txt",
    label: "Fichier robots.txt present",
    status: robots.exists ? "pass" : "warn",
    impact: "seo",
  });

  checks.push({
    id: "sitemap",
    label: "Sitemap XML reference",
    status: robots.hasSitemap ? "pass" : "warn",
    value: robots.sitemapUrl || undefined,
    impact: "seo",
  });

  // -- IMAGES --
  const imgWithoutAlt = html.images_without_alt;
  checks.push({
    id: "images_alt",
    label: "Attributs alt sur les images",
    status: imgWithoutAlt === 0 ? "pass" : imgWithoutAlt <= 2 ? "warn" : "fail",
    value: `${imgWithoutAlt} image(s) sans alt`,
    impact: "seo",
  });

  // -- HREFLANG (critical for Swiss market) --
  checks.push({
    id: "hreflang",
    label: "Balises hreflang (multilingue)",
    status: html.hreflang_tags.length > 0 ? "pass" : "warn",
    value: html.hreflang_tags.length > 0
      ? html.hreflang_tags.map((h) => h.lang).join(", ")
      : "Absent",
    impact: "geo",
    description: "Critique pour le marche suisse — permet aux LLM de distinguer FR/DE/EN",
  });

  // -- SCHEMA.ORG DETAIL --
  const schemaDetail = parseSchemaDetail(html.schema_scripts);

  checks.push({
    id: "schema_local_business",
    label: "Schema.org LocalBusiness",
    status: schemaDetail.has_local_business ? "pass" : "fail",
    impact: "geo",
    description: "Donnee structuree la plus importante pour la visibilite LLM locale",
  });

  checks.push({
    id: "schema_faq",
    label: "Schema.org FAQPage",
    status: schemaDetail.has_faq ? "pass" : "warn",
    impact: "geo",
    description: "Un schema FAQ est directement extrait par ChatGPT et Perplexity",
  });

  checks.push({
    id: "schema_breadcrumb",
    label: "Schema.org BreadcrumbList",
    status: schemaDetail.has_breadcrumb ? "pass" : "warn",
    impact: "seo",
  });

  return checks;
}

// ============================================================
// Schema.org Detailed Parser
// ============================================================

function parseSchemaDetail(scripts: string[]): SchemaDetail {
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
            "LocalBusiness", "AccountingService", "FinancialService",
            "ProfessionalService", "TouristInformationCenter", "LodgingBusiness",
            "Restaurant", "Store", "MedicalBusiness", "LegalService",
          ].includes(type)
        ) {
          has_local_business = true;
        }
        if (type === "FAQPage") has_faq = true;
        if (type === "BreadcrumbList") has_breadcrumb = true;
        if (type === "WebSite") has_website = true;
      }
    } catch {
      issues.push("JSON-LD invalide ou mal forme");
    }
  }

  if (schemas.length === 0) issues.push("Aucune donnee structuree Schema.org trouvee");
  if (!has_local_business) issues.push("LocalBusiness manquant — critique pour la visibilite LLM locale");

  return { schemas_found: schemas, has_local_business, has_faq, has_breadcrumb, has_website, issues };
}

// ============================================================
// Readability Analysis (Flesch FR/DE)
// ============================================================

function detectLanguage(text: string): "fr" | "de" | "en" {
  const frWords = ["les", "des", "une", "pour", "dans", "avec", "vous", "nous", "votre", "notre"];
  const deWords = ["die", "der", "das", "und", "für", "mit", "sie", "ihr", "ihre", "wir"];
  const words = text.toLowerCase().split(/\s+/).slice(0, 500); // sample first 500 words

  const frScore = words.filter((w) => frWords.includes(w)).length;
  const deScore = words.filter((w) => deWords.includes(w)).length;

  if (deScore > frScore && deScore > 5) return "de";
  if (frScore > 5) return "fr";
  return "en";
}

function countSyllables(word: string, lang: "fr" | "de" | "en"): number {
  const vowels = lang === "de" ? /[aeiouäöüy]/gi : /[aeiouéèêëàâùûîïôy]/gi;
  const matches = word.match(vowels);
  return Math.max(1, matches?.length ?? 1);
}

function analyzeReadability(text: string): ReadabilityData {
  const lang = detectLanguage(text);
  const cleanText = text.replace(/\s+/g, " ").trim();
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 10);

  if (words.length < 50) {
    return {
      flesch_score: 0,
      flesch_level: "Contenu insuffisant",
      lang_detected: lang,
      avg_sentence_length: 0,
      avg_word_length: 0,
      word_count: words.length,
    };
  }

  const avgSentenceLength = words.length / Math.max(sentences.length, 1);
  const avgSyllables = words.reduce((sum, w) => sum + countSyllables(w, lang), 0) / words.length;
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;

  // Flesch FR (Kandel & Moles 1958): 207 - 1.015 * ASL - 73.6 * ASW
  const fleschScore =
    lang === "fr"
      ? Math.max(0, Math.min(100, Math.round(207 - 1.015 * avgSentenceLength - 73.6 * avgSyllables)))
      : Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllables)));

  const fleschLevel =
    fleschScore >= 70 ? "Tres facile a lire" :
    fleschScore >= 60 ? "Facile" :
    fleschScore >= 50 ? "Assez facile" :
    fleschScore >= 40 ? "Standard" :
    fleschScore >= 30 ? "Assez difficile" :
    "Difficile";

  return {
    flesch_score: fleschScore,
    flesch_level: fleschLevel,
    lang_detected: lang,
    avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
    avg_word_length: Math.round(avgWordLength * 10) / 10,
    word_count: words.length,
  };
}

// ============================================================
// Robots.txt checker
// ============================================================
