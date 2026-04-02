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
    const [auditRes, scoresRes, itemsRes, actionsRes] = await Promise.all([
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
      html = renderUltraAuditPdf({
        audit,
        scores,
        items,
        actions,
        benchmarkRanking,
        themeScores: {
          seo: scores.score_seo ?? 0,
          geo: scores.score_geo ?? 0,
          perf: scores.score_perf ?? 0,
          a11y: scores.score_a11y ?? 0,
          rgesn: scores.score_rgesn ?? 0,
          tech: scores.score_tech ?? 0,
          contenu: scores.score_contenu ?? 0,
        },
        clientContext: {
          clientName: audit.brand_name || audit.domain,
          sector: audit.sector || undefined,
        },
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

    // Convert HTML → PDF via Puppeteer
    const pdfBuffer = await htmlToPdf(html);

    const filename = `audit-${auditRes.data.audit_type}-${auditRes.data.domain}-${new Date().toISOString().split("T")[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
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
