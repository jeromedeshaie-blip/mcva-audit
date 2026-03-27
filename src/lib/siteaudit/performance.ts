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
      signal: AbortSignal.timeout(30000),
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
