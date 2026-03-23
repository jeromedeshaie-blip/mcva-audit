import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { createGeoProvider } from "@/lib/providers/geo/geo-provider";
import { scoreItems, aggregateScores, calculateSeoScore } from "@/lib/scoring/scorer";
import * as cheerio from "cheerio";

/**
 * Audit Express — Inngest function
 *
 * Orchestrates: HTML scraping → SEO data → GEO data → CORE-EEAT scoring (20 items) → score aggregation
 * Duration: ~2-3 minutes
 */
export const runExpressAudit = inngest.createFunction(
  { id: "run-express-audit", name: "Run Express Audit", triggers: [{ event: "audit/express.requested" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { auditId, url, domain, sector } = event.data as {
      auditId: string;
      url: string;
      domain: string;
      sector: string;
    };

    const supabase = createServiceClient();

    // Step 1: Update status to processing
    await step.run("update-status-processing", async () => {
      await supabase
        .from("audits")
        .update({ status: "processing" })
        .eq("id", auditId);
    });

    // Step 2: Scrape HTML
    const html = await step.run("scrape-html", async () => {
      const response = await fetch(url.startsWith("http") ? url : `https://${url}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0; +https://mcva.ch)",
        },
        signal: AbortSignal.timeout(15000),
      });
      return response.text();
    });

    // Step 3: Run SEO, GEO, and scoring in parallel
    const [seoData, geoData, scoredItems] = await Promise.all([
      step.run("fetch-seo-data", async () => {
        const seoProvider = await createSeoProvider();
        return seoProvider.getDomainOverview(domain);
      }),

      step.run("fetch-geo-data", async () => {
        const geoProvider = await createGeoProvider();
        const brandName = extractBrandName(html, domain);
        return geoProvider.getAIVisibility(brandName, sector || "général", domain);
      }),

      step.run("score-core-eeat-express", async () => {
        return scoreItems(html, url, "express");
      }),
    ]);

    // Step 4: Aggregate scores and save
    await step.run("save-results", async () => {
      const coreEeatScores = aggregateScores(scoredItems);
      const scoreSeo = calculateSeoScore(coreEeatScores);
      const scoreGeo = geoData.ai_visibility_score;

      const seoProvider = await createSeoProvider();

      // Save scores
      await supabase.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_core_eeat: coreEeatScores,
        score_cite: {}, // CITE scoring to be added
        seo_provider: seoProvider.name,
        seo_data: seoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: geoData,
        competitors: null,
      });

      // Save individual items
      if (scoredItems.length > 0) {
        await supabase.from("audit_items").insert(
          scoredItems.map((item: any) => ({
            audit_id: auditId,
            ...item,
          }))
        );
      }

      // Update audit status
      await supabase
        .from("audits")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", auditId);
    });

    return { auditId, status: "completed" };
  }
);

/**
 * Audit Complet — Inngest function
 *
 * Extends express audit with: full CORE-EEAT (80 items) + CITE (40 items) + action plan + competitors
 * Duration: ~5-15 minutes
 */
export const runFullAudit = inngest.createFunction(
  { id: "run-full-audit", name: "Run Full Audit", triggers: [{ event: "audit/full.requested" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { auditId, url, domain, sector } = event.data as {
      auditId: string;
      url: string;
      domain: string;
      sector: string;
    };

    const supabase = createServiceClient();

    // Step 1: Update status
    await step.run("update-status-processing", async () => {
      await supabase
        .from("audits")
        .update({ status: "processing" })
        .eq("id", auditId);
    });

    // Step 2: Scrape HTML
    const html = await step.run("scrape-html", async () => {
      const response = await fetch(url.startsWith("http") ? url : `https://${url}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0; +https://mcva.ch)",
        },
        signal: AbortSignal.timeout(15000),
      });
      return response.text();
    });

    // Step 3: Parallel data fetching + full scoring
    const [seoData, geoData, competitors, scoredItems] = await Promise.all([
      step.run("fetch-seo-data", async () => {
        const seoProvider = await createSeoProvider();
        return seoProvider.getDomainOverview(domain);
      }),

      step.run("fetch-geo-data", async () => {
        const geoProvider = await createGeoProvider();
        const brandName = extractBrandName(html, domain);
        return geoProvider.getAIVisibility(brandName, sector || "général", domain);
      }),

      step.run("fetch-competitors", async () => {
        const seoProvider = await createSeoProvider();
        return seoProvider.getCompetitors(domain);
      }),

      step.run("score-core-eeat-full", async () => {
        return scoreItems(html, url, "full");
      }),
    ]);

    // Step 4: Generate action plan
    const actions = await step.run("generate-action-plan", async () => {
      return generateActionPlan(scoredItems, seoData, geoData, url);
    });

    // Step 5: Save all results
    await step.run("save-results", async () => {
      const coreEeatScores = aggregateScores(scoredItems);
      const scoreSeo = calculateSeoScore(coreEeatScores);
      const scoreGeo = geoData.ai_visibility_score;

      const seoProvider = await createSeoProvider();

      await supabase.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_core_eeat: coreEeatScores,
        score_cite: {},
        seo_provider: seoProvider.name,
        seo_data: seoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: geoData,
        competitors,
      });

      if (scoredItems.length > 0) {
        await supabase.from("audit_items").insert(
          scoredItems.map((item: any) => ({
            audit_id: auditId,
            ...item,
          }))
        );
      }

      if (actions.length > 0) {
        await supabase.from("audit_actions").insert(
          actions.map((action: any) => ({
            audit_id: auditId,
            ...action,
          }))
        );
      }

      await supabase
        .from("audits")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", auditId);
    });

    return { auditId, status: "completed" };
  }
);

// --- Helpers ---

function extractBrandName(html: string, domain: string): string {
  const $ = cheerio.load(html);

  // Try og:site_name first
  const siteName = $('meta[property="og:site_name"]').attr("content");
  if (siteName) return siteName;

  // Try Organization schema
  const orgSchema = $('script[type="application/ld+json"]')
    .toArray()
    .map((el) => {
      try {
        return JSON.parse($(el).html() || "");
      } catch {
        return null;
      }
    })
    .find((json) => json?.["@type"] === "Organization");

  if (orgSchema?.name) return orgSchema.name;

  // Fallback: domain without TLD
  return domain.replace(/\.(com|fr|ch|io|org|net)$/i, "");
}

async function generateActionPlan(
  items: Array<{ item_code: string; item_label: string; status: string; score: number; notes: string | null; dimension?: string }>,
  _seoData: unknown,
  _geoData: unknown,
  _url: string
): Promise<Array<{
  priority: "P1" | "P2" | "P3" | "P4";
  title: string;
  description: string;
  impact_points: number;
  effort: string;
  category: string;
}>> {
  // Generate actions from failed/partial items
  const actionable = items.filter((item) => item.status !== "pass");

  return actionable
    .sort((a, b) => a.score - b.score) // worst first
    .slice(0, 15) // top 15 recommendations
    .map((item, idx) => ({
      priority: (idx < 3 ? "P1" : idx < 7 ? "P2" : idx < 12 ? "P3" : "P4") as "P1" | "P2" | "P3" | "P4",
      title: `Améliorer : ${item.item_label}`,
      description: item.notes || `Le critère ${item.item_code} nécessite une amélioration.`,
      impact_points: Math.max(0, 100 - item.score),
      effort: item.score < 25 ? "1-2 jours" : "< 30 min",
      category: categorizeItem(item.item_code),
    }));
}

function categorizeItem(code: string): string {
  const prefix = code.replace(/\d+$/, "");
  const map: Record<string, string> = {
    C: "contenu",
    O: "technique",
    R: "notoriete",
    E: "contenu",
    Exp: "contenu",
    Ept: "contenu",
    A: "notoriete",
    T: "technique",
  };
  return map[prefix] || "SEO";
}

export const functions = [runExpressAudit, runFullAudit];
