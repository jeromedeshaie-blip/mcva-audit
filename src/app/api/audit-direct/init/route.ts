import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import * as cheerio from "cheerio";

export const maxDuration = 60;

/**
 * POST /api/audit-direct/init
 * Step 1: Create audit record + scrape HTML + store in DB
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { url, sector = "général", quality = "standard", level = "full", themes = [] } = body;
  if (!url) return NextResponse.json({ error: "URL requise" }, { status: 400 });

  // Map front-end level to DB audit_type
  const auditTypeMap: Record<string, string> = {
    pre_audit: "pre_audit",
    express: "express",
    complet: "full",
    full: "full",
    ultra: "ultra",
  };
  const auditType = auditTypeMap[level] || "full";

  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const domain = (() => {
    try { return new URL(fullUrl).hostname.replace(/^www\./, ""); } catch { return url; }
  })();

  const serviceClient = createServiceClient();

  // Create audit record
  const { data: audit, error: createErr } = await serviceClient
    .from("audits")
    .insert({
      url: fullUrl,
      domain,
      sector: sector || null,
      audit_type: auditType,
      status: "processing",
      created_by: user.id,
      theme: auditType !== "ultra" && themes.length === 1 ? themes[0] : null,
      themes: themes.length > 0 ? themes : null,
    })
    .select()
    .single();

  if (createErr || !audit) {
    return NextResponse.json({ error: "Erreur création audit", detail: createErr?.message }, { status: 500 });
  }

  // Scrape HTML
  let html: string;
  try {
    const response = await fetch(fullUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MCVAAuditBot/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
    if (html.length < 100) throw new Error("HTML trop court");
  } catch (e: any) {
    await serviceClient.from("audits").update({ status: "error" }).eq("id", audit.id);
    return NextResponse.json({ error: "Scraping échoué", detail: e.message }, { status: 500 });
  }

  // Extract brand name
  const brandName = extractBrandName(html, domain);

  // Detect SPA/client-rendered sites (Wix, React SPA, etc.)
  const spaDetected = detectSpa(html);

  // Store HTML + brand + SPA flag in DB
  const { error: updateErr } = await serviceClient
    .from("audits")
    .update({ scraped_html: html, brand_name: brandName, is_spa: spaDetected })
    .eq("id", audit.id);

  if (updateErr) {
    return NextResponse.json({ error: "Erreur stockage HTML", detail: updateErr.message }, { status: 500 });
  }

  // For ultra audits, fire Inngest event to run the full pipeline asynchronously
  if (auditType === "ultra") {
    try {
      await inngest.send({
        name: "audit/ultra.requested",
        data: {
          auditId: audit.id,
          url: fullUrl,
          domain,
          sector: sector || "général",
          quality: "ultra",
        },
      });
      console.log(`[audit:${audit.id}] Inngest ultra event sent`);
    } catch (inngestError: any) {
      console.error(`[audit:${audit.id}] Inngest ultra send failed:`, inngestError?.message);
      await serviceClient.from("audits").update({ status: "error" }).eq("id", audit.id);
      return NextResponse.json(
        { error: "Erreur lancement audit ultra", detail: inngestError?.message || "Service d'orchestration indisponible" },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    auditId: audit.id,
    domain,
    brandName,
    htmlLength: html.length,
    url: fullUrl,
    spaDetected,
  });
}

/**
 * Detect SPA / client-rendered sites where HTML is mostly empty shells.
 * Wix, heavy React SPAs, Angular apps etc. render via JS — the static HTML
 * contains mostly script tags and very little readable content.
 */
function detectSpa(html: string): boolean {
  // Strip all <script> and <style> tags to measure real content
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const textLength = stripped.length;
  const htmlLength = html.length;

  // Known SPA platforms
  const wixMarkers = ["wix-viewer-model", "wixCodeApi", "X-Wix-", "clientSideRender", "wix-thunderbolt"];
  const hasWixMarker = wixMarkers.some((m) => html.includes(m));

  // If Wix detected, always flag
  if (hasWixMarker) return true;

  // Count structural HTML elements — SSR sites have real content tags
  const pCount = (html.match(/<p[\s>]/gi) || []).length;
  const hCount = (html.match(/<h[1-6][\s>]/gi) || []).length;
  const imgCount = (html.match(/<img[\s>]/gi) || []).length;
  const scriptCount = (html.match(/<script[\s>]/gi) || []).length;

  // If the page has meaningful structural content, it's NOT a SPA shell
  // even if JS/CSS inflate the total HTML size
  const hasStructuralContent = pCount >= 3 || hCount >= 2 || (pCount >= 1 && imgCount >= 2);

  // Only flag as SPA if very little text AND no structural content
  if (htmlLength > 10000 && textLength / htmlLength < 0.02 && !hasStructuralContent) return true;

  // If almost no content tags but lots of scripts → SPA shell
  if (scriptCount > 20 && pCount < 2 && hCount < 2 && textLength < 500) return true;

  return false;
}

function extractBrandName(html: string, domain: string): string {
  const $ = cheerio.load(html);
  const siteName = $('meta[property="og:site_name"]').attr("content");
  if (siteName) return siteName;

  let orgName: string | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (orgName) return;
    try {
      const json = JSON.parse($(el).html() || "");
      if (json?.["@type"] === "Organization" && json.name) { orgName = json.name; return; }
      if (Array.isArray(json?.["@graph"])) {
        const org = json["@graph"].find((item: any) => item?.["@type"] === "Organization" && item.name);
        if (org) orgName = org.name;
      }
    } catch { /* ignore */ }
  });
  if (orgName) return orgName;

  const title = $("title").text();
  if (title) {
    const parts = title.split(/[|\-–—]/);
    if (parts.length > 1) return parts[parts.length - 1].trim();
    return parts[0].trim();
  }
  return domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
}
