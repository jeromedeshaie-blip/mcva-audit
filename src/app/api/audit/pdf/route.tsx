import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { htmlToPdf } from "@/lib/pdf/html-to-pdf";
import { renderAuditPdf } from "@/lib/pdf/templates/render";
import { renderPreAuditPdf } from "@/lib/pdf/templates/render-pre-audit";
import { renderUltraAuditPdf } from "@/lib/pdf/templates/render-ultra";

export const maxDuration = 60;

/**
 * GET /api/audit/pdf?id=xxx — Generate and download PDF report
 * Uses Puppeteer + @sparticuz/chromium for HTML→PDF conversion.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const auditId = request.nextUrl.searchParams.get("id");
    if (!auditId) {
      return NextResponse.json({ error: "ID audit requis" }, { status: 400 });
    }

    // Fetch audit data in parallel
    const [auditRes, scoresRes, itemsRes, actionsRes, uploadsRes] = await Promise.all([
      supabase.from("audits").select("*").eq("id", auditId).single(),
      supabase.from("audit_scores").select("*").eq("audit_id", auditId).single(),
      supabase
        .from("audit_items")
        .select("*")
        .eq("audit_id", auditId)
        .order("item_code"),
      supabase
        .from("audit_actions")
        .select("*")
        .eq("audit_id", auditId)
        .order("priority"),
      supabase
        .from("audit_uploads")
        .select("source, parsed_data, status")
        .eq("audit_id", auditId)
        .eq("status", "parsed"),
    ]);

    if (!auditRes.data || !scoresRes.data) {
      return NextResponse.json({ error: "Audit non trouvé" }, { status: 404 });
    }

    // Look up benchmark ranking for this domain (full audits only)
    let benchmarkRanking = undefined;
    if (auditRes.data.audit_type === "full" || auditRes.data.audit_type === "ultra") {
      const domain = auditRes.data.domain;
      const { data: benchmarkDomain } = await supabase
        .from("benchmark_domains")
        .select("benchmark_id, domain, rank_seo, rank_geo, score_seo, score_geo")
        .eq("domain", domain)
        .not("rank_seo", "is", null)
        .limit(1);

      if (benchmarkDomain && benchmarkDomain.length > 0) {
        const bmId = benchmarkDomain[0].benchmark_id;
        const [bmRes, bmDomainsRes] = await Promise.all([
          supabase.from("benchmarks").select("*").eq("id", bmId).single(),
          supabase
            .from("benchmark_domains")
            .select("*")
            .eq("benchmark_id", bmId)
            .order("rank_seo", { ascending: true, nullsFirst: false }),
        ]);

        if (bmRes.data && bmDomainsRes.data) {
          benchmarkRanking = {
            benchmarkName: bmRes.data.name,
            geographicScope: bmRes.data.geographic_scope,
            subCategory: bmRes.data.sub_category,
            domains: bmDomainsRes.data,
            clientDomain: domain,
          };
        }
      }
    }

    // Select template based on audit_type
    const auditType = auditRes.data.audit_type;
    const audit = auditRes.data;
    const scores = scoresRes.data;
    const items = itemsRes.data || [];
    const actions = actionsRes.data || [];

    let html: string;
    if (auditType === "pre_audit" || auditType === "express") {
      html = renderPreAuditPdf({
        audit,
        scores,
        items,
        actions,
        theme: audit.theme || (audit.themes?.[0]) || "seo",
      });
    } else if (auditType === "ultra") {
      // Extract parsed Semrush/Qwairy data from uploads
      const uploads = uploadsRes.data || [];
      const semrushUpload = uploads.find((u: any) => u.source === "semrush");
      const qwairyUpload = uploads.find((u: any) => u.source === "qwairy");

      const semrushData = semrushUpload?.parsed_data
        ? {
            rank_ch: semrushUpload.parsed_data.rank_ch,
            mots_cles: semrushUpload.parsed_data.keywords?.length ?? semrushUpload.parsed_data.mots_cles,
            trafic: semrushUpload.parsed_data.trafic ?? semrushUpload.parsed_data.traffic,
            authority_score: semrushUpload.parsed_data.authority_score,
            backlinks: semrushUpload.parsed_data.backlinks,
            top_keywords: semrushUpload.parsed_data.keywords?.slice(0, 10),
            competitors: semrushUpload.parsed_data.competitors,
          }
        : undefined;

      const qwairyData = qwairyUpload?.parsed_data
        ? {
            mention_rate: qwairyUpload.parsed_data.mention_rate,
            source_rate: qwairyUpload.parsed_data.source_rate,
            sov: qwairyUpload.parsed_data.sov ?? qwairyUpload.parsed_data.share_of_voice,
            sentiment: qwairyUpload.parsed_data.sentiment,
            prompts: qwairyUpload.parsed_data.prompts,
            responses: qwairyUpload.parsed_data.responses,
            llms: qwairyUpload.parsed_data.llms,
            llm_distribution: qwairyUpload.parsed_data.llm_distribution ?? qwairyUpload.parsed_data.per_llm,
            sov_competitors: qwairyUpload.parsed_data.sov_competitors ?? qwairyUpload.parsed_data.competitors,
            sentiment_benchmark: qwairyUpload.parsed_data.sentiment_benchmark,
            sentiment_insight: qwairyUpload.parsed_data.sentiment_insight,
          }
        : undefined;

      html = renderUltraAuditPdf({
        audit,
        scores,
        items,
        actions,
        benchmarkRanking,
        themeScores: {
          seo: scores.score_seo ?? 0,
          geo: scores.score_geo ?? 0,
          perf: scores.score_perf,          // null = non évalué
          a11y: scores.score_a11y,
          rgesn: scores.score_rgesn,
          tech: scores.score_tech,
          contenu: scores.score_contenu,
        },
        clientContext: {
          clientName: audit.brand_name || audit.domain,
          sector: audit.sector || undefined,
        },
        semrushData,
        qwairyData,
      });
    } else {
      html = renderAuditPdf({
        audit,
        scores,
        items,
        actions,
        benchmarkRanking,
      });
    }

    const format = request.nextUrl.searchParams.get("format");

    // Mode HTML: return printable HTML page (browser print → PDF)
    if (format === "html") {
      const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Audit PDF</title>
<style>@media print { @page { margin: 0; } body { margin: 0; } }</style>
<script>window.onload=function(){window.print();}</script>
</head><body>${html}</body></html>`;
      return new NextResponse(printHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Mode PDF: convert HTML → PDF via Puppeteer
    try {
      const pdfBuffer = await htmlToPdf(html);
      const filename = `audit-${auditRes.data.audit_type}-${auditRes.data.domain}-${new Date().toISOString().split("T")[0]}.pdf`;
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (pdfErr) {
      console.error("[pdf] Puppeteer failed, returning HTML fallback:", pdfErr);
      // Fallback: return printable HTML
      const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Audit PDF</title>
<style>body{margin:0}@media print{body{margin:0}}</style>
<script>window.onload=function(){window.print();}</script>
</head><body>${html}</body></html>`;
      return new NextResponse(printHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch (error) {
    console.error("[pdf] Generation failed:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la génération du PDF",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
