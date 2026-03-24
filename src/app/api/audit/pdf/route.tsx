import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { AuditPdfDocument } from "@/lib/pdf/audit-pdf";
import React from "react";

/**
 * GET /api/audit/pdf?id=xxx — Generate and download PDF report
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

    // Fetch audit data
    const [auditRes, scoresRes, itemsRes] = await Promise.all([
      supabase.from("audits").select("*").eq("id", auditId).single(),
      supabase.from("audit_scores").select("*").eq("audit_id", auditId).single(),
      supabase
        .from("audit_items")
        .select("*")
        .eq("audit_id", auditId)
        .order("item_code"),
    ]);

    if (!auditRes.data || !scoresRes.data) {
      return NextResponse.json({ error: "Audit non trouvé" }, { status: 404 });
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(AuditPdfDocument, {
        audit: auditRes.data,
        scores: scoresRes.data,
        items: itemsRes.data || [],
      }) as any
    );

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
      { error: "Erreur lors de la génération du PDF", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
