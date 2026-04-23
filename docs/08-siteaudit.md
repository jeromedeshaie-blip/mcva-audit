# 08 — Site Audit (crawler + tech)

**Module** : 08 — Site Audit (crawler + tech)
**Version** : 2.1 (tag `v2.1-release`)

Crawler avec détection domaine parqué (v2.1), checks SEO, readability, perf via PageSpeed, recommandations.

---

## `src/lib/siteaudit/crawler.ts`

```typescript
import * as cheerio from "cheerio";

/**
 * Signature patterns identifying parked-domain pages.
 * Detected via title, body text, or known parking-service hosts.
 * Section 14 règle 10 POLE-PERFORMANCE: vérifier qu'un site existe vraiment avant d'auditer.
 */
const PARKED_DOMAIN_PATTERNS = [
  // Title / body text
  /this\s+domain\s+(is\s+)?(for\s+sale|is\s+parked|may\s+be\s+for\s+sale)/i,
  /buy\s+this\s+domain/i,
  /domain\s+(for\s+sale|parking)/i,
  /domaine\s+(en\s+vente|parqué|a\s+vendre)/i,
  /parked\s+free,\s+courtesy\s+of/i,
  /related\s+searches/i, // GoDaddy parking pages
];

const PARKING_HOSTS = [
  "sedoparking.com",
  "parkingcrew.net",
  "parking.godaddy.com",
  "parkingcrew.com",
  "bodis.com",
  "nameshift.com",
  "afternic.com",
  "dan.com",
];

export interface ParkedDomainError extends Error {
  code: "PARKED_DOMAIN";
  url: string;
  detectedPattern: string;
}

/**
 * Throw a ParkedDomainError if the HTML or redirected URL matches parking signatures.
 * Non-blocking: only throws when signals are strong (host match OR >=2 text patterns).
 */
export function assertNotParkedDomain(html: string, finalUrl: string): void {
  const finalHost = (() => {
    try { return new URL(finalUrl).hostname.toLowerCase(); } catch { return ""; }
  })();

  // Host-level detection (high confidence)
  for (const parkingHost of PARKING_HOSTS) {
    if (finalHost.includes(parkingHost)) {
      const err = new Error(
        `Domaine parqué détecté: ${finalUrl} redirige vers ${parkingHost}. ` +
        `Vérifier la vraie URL du site client avant d'auditer.`
      ) as ParkedDomainError;
      err.code = "PARKED_DOMAIN";
      err.url = finalUrl;
      err.detectedPattern = `host:${parkingHost}`;
      throw err;
    }
  }

  // Text-pattern detection (medium confidence — require 2+ matches)
  const bodyLower = html.slice(0, 50000).toLowerCase();
  let matches = 0;
  let firstMatch = "";
  for (const pattern of PARKED_DOMAIN_PATTERNS) {
    if (pattern.test(bodyLower)) {
      if (!firstMatch) firstMatch = pattern.source;
      matches++;
    }
  }
  if (matches >= 2) {
    const err = new Error(
      `Domaine parqué suspecté: ${finalUrl} (${matches} signaux de parking détectés). ` +
      `Vérifier la vraie URL avant d'auditer.`
    ) as ParkedDomainError;
    err.code = "PARKED_DOMAIN";
    err.url = finalUrl;
    err.detectedPattern = `text:${firstMatch}`;
    throw err;
  }
}

export interface CrawlResult {
  url: string;
  html: string;
  statusCode: number;
  loadTime: number;
  title: string | null;
  metaDescription: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  links: { href: string; text: string; internal: boolean }[];
  images: { src: string; alt: string | null }[];
  canonicalUrl: string | null;
  hreflang: { lang: string; href: string }[];
  robotsMeta: string | null;
  hasViewport: boolean;
  charset: string | null;
  schemaScripts: string[];
  bodyText: string;
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  const start = Date.now();

  const response = await fetch(url, {
    headers: {
      "User-Agent": "MCVAAuditBot/1.0 (+https://mcva.ch/audit)",
      "Accept-Language": "fr-CH,fr;q=0.9,de-CH;q=0.8,en;q=0.7",
    },
    signal: AbortSignal.timeout(15000),
  });

  const html = await response.text();
  const loadTime = Date.now() - start;

  // Parked-domain detection — throws ParkedDomainError if strong signals found.
  // POLE-PERFORMANCE v2.1 règle 10.
  assertNotParkedDomain(html, response.url || url);

  const $ = cheerio.load(html);

  // Extraction données structurées
  const schemaScripts: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    schemaScripts.push($(el).html() || "");
  });

  // Texte brut du body
  $("script, style, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  // Liens
  const siteHost = new URL(url).hostname;
  const links: CrawlResult["links"] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    try {
      const linkUrl = new URL(href, url);
      links.push({
        href: linkUrl.toString(),
        text,
        internal: linkUrl.hostname === siteHost,
      });
    } catch {
      // invalid URL
    }
  });

  // Images
  const images: CrawlResult["images"] = [];
  $("img").each((_, el) => {
    images.push({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt") ?? null,
    });
  });

  // Hreflang
  const hreflang: CrawlResult["hreflang"] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    hreflang.push({
      lang: $(el).attr("hreflang") || "",
      href: $(el).attr("href") || "",
    });
  });

  return {
    url,
    html,
    statusCode: response.status,
    loadTime,
    title: $("title").first().text().trim() || null,
    metaDescription: $('meta[name="description"]').attr("content") || null,
    h1: $("h1")
      .map((_, el) => $(el).text().trim())
      .get(),
    h2: $("h2")
      .map((_, el) => $(el).text().trim())
      .get(),
    h3: $("h3")
      .map((_, el) => $(el).text().trim())
      .get(),
    links,
    images,
    canonicalUrl: $('link[rel="canonical"]').attr("href") || null,
    hreflang,
    robotsMeta: $('meta[name="robots"]').attr("content") || null,
    hasViewport: $('meta[name="viewport"]').length > 0,
    charset: $("meta[charset]").attr("charset") || null,
    schemaScripts,
    bodyText,
  };
}

export async function checkRobotsTxt(url: string): Promise<{
  exists: boolean;
  hasSitemap: boolean;
  sitemapUrl: string | null;
  blocksAll: boolean;
}> {
  try {
    const robotsUrl = new URL("/robots.txt", url).toString();
    const res = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok)
      return {
        exists: false,
        hasSitemap: false,
        sitemapUrl: null,
        blocksAll: false,
      };

    const text = await res.text();
    const sitemapMatch = text.match(/Sitemap:\s*(.+)/i);
    const blocksAll = /Disallow:\s*\//m.test(text);

    return {
      exists: true,
      hasSitemap: !!sitemapMatch,
      sitemapUrl: sitemapMatch ? sitemapMatch[1].trim() : null,
      blocksAll,
    };
  } catch {
    return {
      exists: false,
      hasSitemap: false,
      sitemapUrl: null,
      blocksAll: false,
    };
  }
}

```


## `src/lib/siteaudit/performance.ts`

```typescript
import type { PerformanceData } from "./types";

export async function getPageSpeedScore(url: string): Promise<{
  mobile: PerformanceData;
  desktop: PerformanceData;
  score: number;
}> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  const baseUrl =
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

  async function fetchStrategy(
    strategy: "mobile" | "desktop"
  ): Promise<PerformanceData> {
    const params = new URLSearchParams({
      url,
      strategy,
      ...(apiKey ? { key: apiKey } : {}),
      category: "performance",
    });

    const res = await fetch(`${baseUrl}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();

    const cats = data.lighthouseResult?.categories;
    const audits = data.lighthouseResult?.audits;

    return {
      score: Math.round((cats?.performance?.score ?? 0) * 100),
      lcp: Math.round(
        audits?.["largest-contentful-paint"]?.numericValue ?? 0
      ),
      cls: audits?.["cumulative-layout-shift"]?.numericValue ?? 0,
      fid: Math.round(
        audits?.["max-potential-fid"]?.numericValue ?? 0
      ),
      ttfb: Math.round(
        audits?.["server-response-time"]?.numericValue ?? 0
      ),
      fcp: Math.round(
        audits?.["first-contentful-paint"]?.numericValue ?? 0
      ),
      mobile_score:
        strategy === "mobile"
          ? Math.round((cats?.performance?.score ?? 0) * 100)
          : 0,
      desktop_score:
        strategy === "desktop"
          ? Math.round((cats?.performance?.score ?? 0) * 100)
          : 0,
    };
  }

  const [mobile, desktop] = await Promise.all([
    fetchStrategy("mobile"),
    fetchStrategy("desktop"),
  ]);

  const score = Math.round(mobile.score * 0.6 + desktop.score * 0.4);

  return {
    mobile: { ...mobile, desktop_score: desktop.score },
    desktop: { ...desktop, mobile_score: mobile.score },
    score,
  };
}

```


## `src/lib/siteaudit/readability.ts`

```typescript
import type { ReadabilityData } from "./types";

function detectLanguage(text: string): "fr" | "de" | "en" {
  const frWords = [
    "les", "des", "une", "pour", "dans", "avec", "vous", "nous", "votre", "notre",
  ];
  const deWords = [
    "die", "der", "das", "und", "für", "mit", "sie", "ihr", "ihre", "wir",
  ];
  const words = text.toLowerCase().split(/\s+/);

  const frScore = words.filter((w) => frWords.includes(w)).length;
  const deScore = words.filter((w) => deWords.includes(w)).length;

  if (deScore > frScore && deScore > 5) return "de";
  if (frScore > 5) return "fr";
  return "en";
}

function countSyllables(word: string, lang: "fr" | "de" | "en"): number {
  const vowels =
    lang === "de"
      ? /[aeiouäöüy]/gi
      : /[aeiouéèêëàâùûîïôy]/gi;
  const matches = word.match(vowels);
  return Math.max(1, matches?.length ?? 1);
}

export function analyzeReadability(
  text: string,
  keywords: string[] = []
): ReadabilityData {
  const lang = detectLanguage(text);

  const cleanText = text.replace(/\s+/g, " ").trim();
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  const sentences = cleanText
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 10);

  if (words.length < 50) {
    return {
      flesch_score: 0,
      flesch_level: "Contenu insuffisant pour analyse",
      lang_detected: lang,
      avg_sentence_length: 0,
      avg_word_length: 0,
      keyword_density: {},
      word_count: words.length,
    };
  }

  const avgSentenceLength = words.length / Math.max(sentences.length, 1);
  const avgSyllables =
    words.reduce((sum, w) => sum + countSyllables(w, lang), 0) / words.length;
  const avgWordLength =
    words.reduce((sum, w) => sum + w.length, 0) / words.length;

  // Formule Flesch adaptée FR (Kandel & Moles 1958)
  const fleschScore =
    lang === "fr"
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              207 - 1.015 * avgSentenceLength - 73.6 * avgSyllables
            )
          )
        )
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllables
            )
          )
        );

  const fleschLevel =
    fleschScore >= 70
      ? "Très facile à lire"
      : fleschScore >= 60
      ? "Facile"
      : fleschScore >= 50
      ? "Assez facile"
      : fleschScore >= 40
      ? "Standard"
      : fleschScore >= 30
      ? "Assez difficile"
      : "Difficile — à simplifier";

  const keyword_density: Record<string, number> = {};
  const textLower = cleanText.toLowerCase();
  for (const kw of keywords) {
    const regex = new RegExp(kw.toLowerCase(), "g");
    const matches = textLower.match(regex);
    if (matches) {
      keyword_density[kw] =
        Math.round((matches.length / words.length) * 100 * 10) / 10;
    }
  }

  return {
    flesch_score: fleschScore,
    flesch_level: fleschLevel,
    lang_detected: lang,
    avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
    avg_word_length: Math.round(avgWordLength * 10) / 10,
    keyword_density,
    word_count: words.length,
  };
}

```


## `src/lib/siteaudit/recommendations.ts`

```typescript
import type {
  SeoCheck,
  AuditRecommendation,
  PerformanceData,
  AccessibilityViolation,
} from "./types";

export function generateRecommendations(
  seoChecks: SeoCheck[],
  performance: PerformanceData,
  accessibility: AccessibilityViolation[],
  scores: {
    seo: number;
    performance: number;
    accessibility: number;
    readability: number;
  }
): AuditRecommendation[] {
  const recommendations: AuditRecommendation[] = [];

  const failedChecks = seoChecks.filter((c) => c.status === "fail");
  const warnChecks = seoChecks.filter((c) => c.status === "warn");

  // ── SEO / GEO ─────────────────────────────────────────────

  if (failedChecks.find((c) => c.id === "schema_local_business")) {
    recommendations.push({
      id: "add_local_business_schema",
      priority: "critical",
      dimension: "geo",
      title: "Ajouter un schema.org LocalBusiness",
      description:
        "Votre site ne contient aucune donnée structurée LocalBusiness. C'est la cause principale de votre faible visibilité dans ChatGPT et Gemini sur les requêtes géolocalisées.",
      action:
        'Ajouter un bloc <script type="application/ld+json"> avec @type: "LocalBusiness", incluant name, address, telephone, openingHours, geo, url.',
      impact_points: 15,
      effort: "low",
    });
  }

  if (
    failedChecks.find((c) => c.id === "schema_faq") ||
    warnChecks.find((c) => c.id === "schema_faq")
  ) {
    recommendations.push({
      id: "add_faq_schema",
      priority: "high",
      dimension: "geo",
      title: "Créer une page FAQ avec Schema.org FAQPage",
      description:
        "Les LLM extraient directement les réponses depuis les pages FAQ structurées. Une page Q&A métier serait citée par Perplexity et Claude.",
      action:
        "Créer une page /faq avec 8–12 questions/réponses métier et le markup Schema.org FAQPage correspondant.",
      impact_points: 12,
      effort: "medium",
    });
  }

  if (
    failedChecks.find((c) => c.id === "h1_present") ||
    failedChecks.find((c) => c.id === "h1_unique")
  ) {
    recommendations.push({
      id: "fix_h1",
      priority: "critical",
      dimension: "seo",
      title: "Corriger la structure H1",
      description:
        "Le H1 est le premier signal lu par les moteurs de recherche ET par les LLM pour comprendre le positionnement du site.",
      action:
        "Définir un H1 unique et explicite sur la page d'accueil incluant votre activité et localisation.",
      impact_points: 10,
      effort: "low",
    });
  }

  if (
    seoChecks.find((c) => c.id === "hreflang")?.status !== "pass"
  ) {
    recommendations.push({
      id: "add_hreflang",
      priority: "high",
      dimension: "geo",
      title: "Ajouter les balises hreflang FR/DE",
      description:
        "Critique pour le marché suisse bilingue. Sans hreflang, les LLM ne peuvent pas identifier que votre site sert aussi une clientèle alémanique.",
      action:
        'Ajouter <link rel="alternate" hreflang="fr-CH"> et <link rel="alternate" hreflang="de-CH"> dans le <head>.',
      impact_points: 8,
      effort: "medium",
    });
  }

  if (failedChecks.find((c) => c.id === "meta_description")) {
    recommendations.push({
      id: "add_meta_description",
      priority: "high",
      dimension: "seo",
      title: "Ajouter une meta description",
      description:
        "La meta description est utilisée par les LLM pour résumer le positionnement du site.",
      action:
        "Rédiger une meta description de 140–160 caractères incluant les mots-clés prioritaires.",
      impact_points: 6,
      effort: "low",
    });
  }

  // ── PERFORMANCE ───────────────────────────────────────────

  if (performance.score < 50) {
    recommendations.push({
      id: "improve_performance_critical",
      priority: "critical",
      dimension: "performance",
      title: `Performance critique — score ${performance.score}/100`,
      description: `Google pénalise fortement les sites lents. LCP actuel : ${
        Math.round((performance.lcp / 1000) * 10) / 10
      }s (objectif < 2.5s).`,
      action:
        "Compresser les images (format WebP), activer le cache navigateur, minifier CSS/JS, utiliser un CDN.",
      impact_points: 10,
      effort: "high",
    });
  } else if (performance.score < 75) {
    recommendations.push({
      id: "improve_performance",
      priority: "medium",
      dimension: "performance",
      title: `Performance à améliorer — score ${performance.score}/100`,
      description: `Le site est fonctionnel mais améliorable. Mobile : ${performance.mobile_score}/100, Desktop : ${performance.desktop_score}/100.`,
      action:
        "Optimiser les images et différer le chargement des scripts non-critiques.",
      impact_points: 6,
      effort: "medium",
    });
  }

  // ── ACCESSIBILITÉ ─────────────────────────────────────────

  const criticalViolations = accessibility.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  if (criticalViolations.length > 0) {
    recommendations.push({
      id: "fix_accessibility_critical",
      priority: "high",
      dimension: "accessibility",
      title: `${criticalViolations.length} violation(s) d'accessibilité critiques`,
      description: `Violations WCAG critiques détectées : ${criticalViolations
        .map((v) => v.description)
        .join(", ")}.`,
      action:
        "Corriger les violations critiques en priorité : contraste des couleurs, attributs alt manquants, structure des formulaires.",
      impact_points: 8,
      effort: "medium",
    });
  }

  // Tri par priorité + impact
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      b.impact_points - a.impact_points
  );
}

```


## `src/lib/siteaudit/scoring.ts`

```typescript
const DIMENSION_WEIGHTS = {
  seo: 0.35,
  performance: 0.3,
  accessibility: 0.2,
  readability: 0.15,
};

export function computeGlobalScore(scores: {
  seo: number;
  performance: number;
  accessibility: number;
  readability: number;
}): number {
  return Math.round(
    scores.seo * DIMENSION_WEIGHTS.seo +
      scores.performance * DIMENSION_WEIGHTS.performance +
      scores.accessibility * DIMENSION_WEIGHTS.accessibility +
      scores.readability * DIMENSION_WEIGHTS.readability
  );
}

export function accessibilityViolationsToScore(
  violations: {
    impact: "critical" | "serious" | "moderate" | "minor";
    nodes_count: number;
  }[]
): number {
  if (!violations.length) return 100;

  const penalty = violations.reduce((sum, v) => {
    const weights = { critical: 20, serious: 10, moderate: 5, minor: 2 };
    return sum + weights[v.impact] * Math.min(v.nodes_count, 3);
  }, 0);

  return Math.max(0, 100 - penalty);
}

export function readabilityToScore(
  flesch: number,
  wordCount: number
): number {
  if (wordCount < 50) return 20;
  if (wordCount < 200) return 40;
  const base = Math.min(flesch, 100);
  const volumeBonus = Math.min(10, Math.floor(wordCount / 100));
  return Math.min(100, Math.round(base + volumeBonus));
}

```


## `src/lib/siteaudit/seo-checker.ts`

```typescript
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

```


## `src/lib/siteaudit/types.ts`

```typescript
export type AuditStatus = "pass" | "warn" | "fail";
export type Priority = "critical" | "high" | "medium" | "low";

export interface SeoCheck {
  id: string;
  label: string;
  status: AuditStatus;
  value?: string;
  expected?: string;
  impact: "seo" | "geo" | "both";
  description?: string;
}

export interface PerformanceData {
  score: number;
  lcp: number;
  cls: number;
  fid: number;
  ttfb: number;
  fcp: number;
  mobile_score: number;
  desktop_score: number;
}

export interface AccessibilityViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  nodes_count: number;
  wcag_criteria: string;
}

export interface ReadabilityData {
  flesch_score: number;
  flesch_level: string;
  lang_detected: string;
  avg_sentence_length: number;
  avg_word_length: number;
  keyword_density: Record<string, number>;
  word_count: number;
}

export interface SchemaData {
  schemas_found: string[];
  has_local_business: boolean;
  has_faq: boolean;
  has_breadcrumb: boolean;
  has_website: boolean;
  issues: string[];
}

export interface AuditRecommendation {
  id: string;
  priority: Priority;
  dimension: "seo" | "performance" | "accessibility" | "readability" | "geo";
  title: string;
  description: string;
  action: string;
  impact_points: number;
  effort: "low" | "medium" | "high";
}

export interface SiteAuditResult {
  url: string;
  audited_at: string;
  score_global: number;
  score_seo: number;
  score_performance: number;
  score_accessibility: number;
  score_readability: number;
  seo_checks: SeoCheck[];
  performance_data: PerformanceData;
  accessibility_data: AccessibilityViolation[];
  readability_data: ReadabilityData;
  schema_data: SchemaData;
  recommendations: AuditRecommendation[];
  pages_crawled: number;
  crawl_duration_ms: number;
  error?: string;
}

```

