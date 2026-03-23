import type { SeoProvider } from "./seo-provider";
import type { SeoData, CompetitorData, CoreWebVitals } from "@/types/audit";
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

    const [htmlData, pageSpeedData] = await Promise.allSettled([
      this.analyzeHTML(url),
      this.getPageSpeedData(url),
    ]);

    const html = htmlData.status === "fulfilled" ? htmlData.value : getEmptyHtmlAnalysis();
    const pageSpeed = pageSpeedData.status === "fulfilled" ? pageSpeedData.value : null;

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
    };
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
  };
}
