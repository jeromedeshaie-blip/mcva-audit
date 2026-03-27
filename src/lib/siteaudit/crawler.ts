import * as cheerio from "cheerio";

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
