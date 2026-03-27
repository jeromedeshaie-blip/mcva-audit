import { NextRequest, NextResponse } from "next/server";
import { crawlUrl, checkRobotsTxt } from "@/lib/siteaudit/crawler";
import { runSeoChecks } from "@/lib/siteaudit/seo-checker";
import { getPageSpeedScore } from "@/lib/siteaudit/performance";
import { analyzeReadability } from "@/lib/siteaudit/readability";
import {
  computeGlobalScore,
  accessibilityViolationsToScore,
  readabilityToScore,
} from "@/lib/siteaudit/scoring";
import { generateRecommendations } from "@/lib/siteaudit/recommendations";
import { createClient } from "@/lib/supabase/server";
import type { AccessibilityViolation } from "@/lib/siteaudit/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { url, clientId, keywords = [] } = await req.json();

  if (!url)
    return NextResponse.json({ error: "URL requise" }, { status: 400 });

  const startTime = Date.now();

  try {
    // 1. Crawl HTML + robots.txt
    const [crawl, robotsData] = await Promise.all([
      crawlUrl(url),
      checkRobotsTxt(url),
    ]);

    // 2. SEO + Schema
    const {
      checks: seoChecks,
      score: seoScore,
      schemaData,
    } = runSeoChecks(crawl, robotsData);

    // 3. Performance PageSpeed + Readability
    const [perfData, readabilityData] = await Promise.all([
      getPageSpeedScore(url),
      Promise.resolve(analyzeReadability(crawl.bodyText, keywords)),
    ]);

    // 4. Accessibilité basique (MVP sans Puppeteer)
    const accessibilityViolations = runBasicAccessibilityChecks(crawl);
    const accessibilityScore =
      accessibilityViolationsToScore(accessibilityViolations);

    // 5. Score lisibilité
    const readabilityScore = readabilityToScore(
      readabilityData.flesch_score,
      readabilityData.word_count
    );

    // 6. Score global
    const scores = {
      seo: seoScore,
      performance: perfData.score,
      accessibility: accessibilityScore,
      readability: readabilityScore,
    };
    const globalScore = computeGlobalScore(scores);

    // 7. Recommandations
    const recommendations = generateRecommendations(
      seoChecks,
      perfData.mobile,
      accessibilityViolations,
      scores
    );

    const result = {
      url,
      audited_at: new Date().toISOString(),
      score_global: globalScore,
      score_seo: seoScore,
      score_performance: perfData.score,
      score_accessibility: accessibilityScore,
      score_readability: readabilityScore,
      seo_checks: seoChecks,
      performance_data: perfData.mobile,
      accessibility_data: accessibilityViolations,
      readability_data: readabilityData,
      schema_data: schemaData,
      recommendations,
      pages_crawled: 1,
      crawl_duration_ms: Date.now() - startTime,
    };

    // 8. Sauvegarde Supabase
    await supabase.from("siteaudit_results").insert({
      client_id: clientId || null,
      ...result,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Audit échoué : ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      },
      { status: 500 }
    );
  }
}

function runBasicAccessibilityChecks(crawl: any): AccessibilityViolation[] {
  const violations: AccessibilityViolation[] = [];

  const imagesWithoutAlt = crawl.images.filter(
    (img: any) => !img.alt || img.alt.trim() === ""
  );
  if (imagesWithoutAlt.length > 0) {
    violations.push({
      id: "image-alt",
      impact: "serious",
      description: `${imagesWithoutAlt.length} image(s) sans attribut alt`,
      nodes_count: imagesWithoutAlt.length,
      wcag_criteria: "WCAG 2.1 AA 1.1.1",
    });
  }

  return violations;
}
