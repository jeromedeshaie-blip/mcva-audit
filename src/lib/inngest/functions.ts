import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { createSeoProvider } from "@/lib/providers/seo/seo-provider";
import { createGeoProvider } from "@/lib/providers/geo/geo-provider";
import { scoreItems, scoreCiteItems, aggregateScores, calculateSeoScore } from "@/lib/scoring/scorer";
import type { QualityLevel } from "@/types/audit";
import * as cheerio from "cheerio";

// --- Shared helpers ---

async function updateAuditStatus(auditId: string, status: string, extra?: Record<string, unknown>) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("audits")
    .update({ status, ...extra })
    .eq("id", auditId);
  if (error) {
    console.error(`[audit:${auditId}] Failed to update status to ${status}:`, error.message);
    throw new Error(`DB update failed: ${error.message}`);
  }
}

async function scrapeHtml(url: string): Promise<string> {
  const fullUrl = url.startsWith("https://") || url.startsWith("http://") ? url : `https://${url}`;

  const response = await fetch(fullUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0; +https://mcva.ch)",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${fullUrl}`);
  }

  const html = await response.text();

  if (!html || html.length < 100) {
    throw new Error(`Contenu HTML vide ou insuffisant pour ${fullUrl}`);
  }

  return html;
}

/**
 * Audit Express — Inngest function
 *
 * Steps exécutés séquentiellement pour garantir la durabilité Inngest :
 * 1. Update status → 2. Scrape HTML → 3-6. SEO/GEO/Scoring (parallel via Promise.allSettled in step) → 7. Save
 * Duration: ~2-3 minutes
 */
export const runExpressAudit = inngest.createFunction(
  {
    id: "run-express-audit",
    name: "Run Express Audit",
    triggers: [{ event: "audit/express.requested" }],
    onFailure: async ({ event }: { event: any }) => {
      const auditId = event.data?.event?.data?.auditId;
      if (auditId) {
        try {
          await updateAuditStatus(auditId, "error");
        } catch (e) {
          console.error(`[audit:${auditId}] Failed to set error status on failure:`, e);
        }
      }
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { auditId, url, domain, sector, quality: rawQuality } = event.data as {
      auditId: string;
      url: string;
      domain: string;
      sector: string;
      quality?: string;
    };
    const quality = (rawQuality || "standard") as QualityLevel;

    // Step 1: Update status to processing
    await step.run("update-status-processing", async () => {
      await updateAuditStatus(auditId, "processing");
    });

    // Step 2: Scrape HTML
    const html = await step.run("scrape-html", async () => {
      return scrapeHtml(url);
    });

    // Steps 3-6: Each step.run individually (Inngest memoization-safe)
    const seoData = await step.run("fetch-seo-data", async () => {
      const seoProvider = await createSeoProvider();
      return seoProvider.getDomainOverview(domain);
    });

    const geoData = await step.run("fetch-geo-data", async () => {
      const geoProvider = await createGeoProvider();
      const brandName = extractBrandName(html, domain);
      return geoProvider.getAIVisibility(brandName, sector || "général", domain, quality);
    });

    const scoredItems = await step.run("score-core-eeat-express", async () => {
      return scoreItems(html, url, "express", quality);
    });

    const citeItems = await step.run("score-cite-express", async () => {
      return scoreCiteItems(html, url, "express", quality);
    });

    // Step 7: Aggregate scores and save
    await step.run("save-results", async () => {
      const supabase = createServiceClient();

      const coreEeatScores = aggregateScores(scoredItems);
      const citeScores = aggregateScores(citeItems);
      const scoreSeo = calculateSeoScore(coreEeatScores);
      const scoreGeo = geoData.ai_visibility_score ?? 0;

      const seoProvider = await createSeoProvider();

      // Save scores
      const { error: scoresError } = await supabase.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_core_eeat: coreEeatScores,
        score_cite: citeScores,
        seo_provider: seoProvider.name,
        seo_data: seoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: geoData,
        competitors: null,
      });

      if (scoresError) {
        console.error(`[audit:${auditId}] Failed to insert scores:`, scoresError.message);
        throw new Error(`DB insert scores failed: ${scoresError.message}`);
      }

      // Save individual items (CORE-EEAT + CITE)
      const allItems = [...scoredItems, ...citeItems];
      if (allItems.length > 0) {
        const { error: itemsError } = await supabase.from("audit_items").insert(
          allItems.map((item: any) => ({
            audit_id: auditId,
            ...item,
          }))
        );
        if (itemsError) {
          console.error(`[audit:${auditId}] Failed to insert items:`, itemsError.message);
          throw new Error(`DB insert items failed: ${itemsError.message}`);
        }
      }

      // Update audit status
      const { error: updateError } = await supabase
        .from("audits")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", auditId);

      if (updateError) {
        console.error(`[audit:${auditId}] Failed to complete audit:`, updateError.message);
        throw new Error(`DB update status failed: ${updateError.message}`);
      }
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
  {
    id: "run-full-audit",
    name: "Run Full Audit",
    triggers: [{ event: "audit/full.requested" }],
    onFailure: async ({ event }: { event: any }) => {
      const auditId = event.data?.event?.data?.auditId;
      if (auditId) {
        try {
          await updateAuditStatus(auditId, "error");
        } catch (e) {
          console.error(`[audit:${auditId}] Failed to set error status on failure:`, e);
        }
      }
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { auditId, url, domain, sector, quality: rawQuality } = event.data as {
      auditId: string;
      url: string;
      domain: string;
      sector: string;
      quality?: string;
    };
    const quality = (rawQuality || "standard") as QualityLevel;

    // Step 1: Update status
    await step.run("update-status-processing", async () => {
      await updateAuditStatus(auditId, "processing");
    });

    // Step 2: Scrape HTML
    const html = await step.run("scrape-html", async () => {
      return scrapeHtml(url);
    });

    // Steps 3-7: Each individually for Inngest durability
    const seoData = await step.run("fetch-seo-data", async () => {
      const seoProvider = await createSeoProvider();
      return seoProvider.getDomainOverview(domain);
    });

    const geoData = await step.run("fetch-geo-data", async () => {
      const geoProvider = await createGeoProvider();
      const brandName = extractBrandName(html, domain);
      return geoProvider.getAIVisibility(brandName, sector || "général", domain, quality);
    });

    const competitors = await step.run("fetch-competitors", async () => {
      const seoProvider = await createSeoProvider();
      return seoProvider.getCompetitors(domain);
    });

    const scoredItems = await step.run("score-core-eeat-full", async () => {
      return scoreItems(html, url, "full", quality);
    });

    const citeItems = await step.run("score-cite-full", async () => {
      return scoreCiteItems(html, url, "full", quality);
    });

    // Step 8: Generate action plan
    const allScoredItems = [...scoredItems, ...citeItems];
    const actions = await step.run("generate-action-plan", async () => {
      return generateActionPlan(allScoredItems, seoData, geoData, url);
    });

    // Step 9: Save all results
    await step.run("save-results", async () => {
      const supabase = createServiceClient();

      const coreEeatScores = aggregateScores(scoredItems);
      const citeScores = aggregateScores(citeItems);
      const scoreSeo = calculateSeoScore(coreEeatScores);
      const scoreGeo = geoData.ai_visibility_score ?? 0;

      const seoProvider = await createSeoProvider();

      const { error: scoresError } = await supabase.from("audit_scores").insert({
        audit_id: auditId,
        score_seo: scoreSeo,
        score_geo: scoreGeo,
        score_core_eeat: coreEeatScores,
        score_cite: citeScores,
        seo_provider: seoProvider.name,
        seo_data: seoData,
        geo_provider: process.env.GEO_PROVIDER || "direct_ai",
        geo_data: geoData,
        competitors,
      });

      if (scoresError) {
        console.error(`[audit:${auditId}] Failed to insert scores:`, scoresError.message);
        throw new Error(`DB insert scores failed: ${scoresError.message}`);
      }

      // Save all items (CORE-EEAT + CITE)
      if (allScoredItems.length > 0) {
        const { error: itemsError } = await supabase.from("audit_items").insert(
          allScoredItems.map((item: any) => ({
            audit_id: auditId,
            ...item,
          }))
        );
        if (itemsError) {
          console.error(`[audit:${auditId}] Failed to insert items:`, itemsError.message);
          throw new Error(`DB insert items failed: ${itemsError.message}`);
        }
      }

      if (actions.length > 0) {
        const { error: actionsError } = await supabase.from("audit_actions").insert(
          actions.map((action: any) => ({
            audit_id: auditId,
            ...action,
          }))
        );
        if (actionsError) {
          console.error(`[audit:${auditId}] Failed to insert actions:`, actionsError.message);
          throw new Error(`DB insert actions failed: ${actionsError.message}`);
        }
      }

      const { error: updateError } = await supabase
        .from("audits")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", auditId);

      if (updateError) {
        console.error(`[audit:${auditId}] Failed to complete audit:`, updateError.message);
        throw new Error(`DB update status failed: ${updateError.message}`);
      }
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

  // Try Organization schema (including @graph arrays)
  let orgName: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (orgName) return;
    try {
      const json = JSON.parse($(el).html() || "");
      // Direct Organization
      if (json?.["@type"] === "Organization" && json.name) {
        orgName = json.name;
        return;
      }
      // @graph array
      if (Array.isArray(json?.["@graph"])) {
        const org = json["@graph"].find((item: any) => item?.["@type"] === "Organization" && item.name);
        if (org) {
          orgName = org.name;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  if (orgName) return orgName;

  // Fallback: domain without TLD (improved regex for more TLDs)
  return domain
    .replace(/\.(com|fr|ch|io|org|net|de|co\.uk|co|tech|ai|dev|app|info|biz)$/i, "")
    .replace(/\./g, " ")
    .trim();
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
  // CITE items: CI-C01, CI-I01, CI-T01, CI-E01
  if (code.startsWith("CI-")) {
    const citeDim = code.charAt(3);
    const citeMap: Record<string, string> = {
      C: "notoriete",
      I: "notoriete",
      T: "contenu",
      E: "contenu",
    };
    return citeMap[citeDim] || "SEO";
  }
  // CORE-EEAT items
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
