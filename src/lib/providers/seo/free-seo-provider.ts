import type { SeoProvider } from "./seo-provider";
import type { SeoData, CompetitorData, CoreWebVitals } from "@/types/audit";
import * as cheerio from "cheerio";

const PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

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
    const url = domain.startsWith("http") ? domain : `https://${domain}`;

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
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MCVAAuditBot/1.0; +https://mcva.ch)",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const baseUrl = new URL(url);
    let internalLinks = 0;
    let externalLinks = 0;

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        const linkUrl = new URL(href, url);
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
