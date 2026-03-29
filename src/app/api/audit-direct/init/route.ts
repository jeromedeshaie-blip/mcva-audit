import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
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
  const { url, sector = "général", quality = "standard" } = body;
  if (!url) return NextResponse.json({ error: "URL requise" }, { status: 400 });

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
      audit_type: "full",
      status: "processing",
      created_by: user.id,
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

  // Store HTML + brand in DB
  const { error: updateErr } = await serviceClient
    .from("audits")
    .update({ scraped_html: html, brand_name: brandName })
    .eq("id", audit.id);

  if (updateErr) {
    return NextResponse.json({ error: "Erreur stockage HTML", detail: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    auditId: audit.id,
    domain,
    brandName,
    htmlLength: html.length,
    url: fullUrl,
  });
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
