// GET /api/llmwatch/pdf?clientId=xxx&format=pdf|html
// Generates a Score GEO PDF report for a client

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { renderLlmWatchPdf, type LlmWatchPdfData } from "@/lib/pdf/templates/render-llmwatch";
import { htmlToPdf } from "@/lib/pdf/html-to-pdf";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  const format = request.nextUrl.searchParams.get("format") || "pdf";

  if (!clientId) {
    return NextResponse.json({ error: "clientId requis" }, { status: 400 });
  }

  const sc = createServiceClient();

  try {
    // Fetch all data in parallel
    const [clientRes, scoresRes, rawResultsRes, competitorsRes] = await Promise.all([
      sc.from("llmwatch_clients").select("*").eq("id", clientId).single(),
      sc.from("llmwatch_scores")
        .select("*")
        .eq("client_id", clientId)
        .order("week_start", { ascending: false })
        .limit(12),
      sc.from("llmwatch_raw_results")
        .select("*, llmwatch_queries!inner(text_fr)")
        .eq("client_id", clientId)
        .order("collected_at", { ascending: false })
        .limit(200),
      sc.from("llmwatch_competitors")
        .select("id, name")
        .eq("client_id", clientId)
        .eq("active", true),
    ]);

    if (!clientRes.data) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    const client = clientRes.data;
    const scores = scoresRes.data || [];
    const rawResults = rawResultsRes.data || [];
    const competitors = competitorsRes.data || [];

    const latestScore = scores[0];
    if (!latestScore) {
      return NextResponse.json(
        { error: "Aucun score disponible. Lancez une analyse d'abord." },
        { status: 400 }
      );
    }

    // Parse score_by_llm
    const scoreByLlm = latestScore.score_by_llm
      ? typeof latestScore.score_by_llm === "string"
        ? JSON.parse(latestScore.score_by_llm)
        : latestScore.score_by_llm
      : {};

    const scoreByLang = latestScore.score_by_lang
      ? typeof latestScore.score_by_lang === "string"
        ? JSON.parse(latestScore.score_by_lang)
        : latestScore.score_by_lang
      : null;

    // Group raw results by query text for the latest run
    const latestRunDate = rawResults[0]?.collected_at;
    const cutoff = latestRunDate
      ? new Date(new Date(latestRunDate).getTime() - 30 * 60 * 1000).toISOString()
      : "";

    const latestResults = rawResults.filter((r: any) => r.collected_at >= cutoff);

    const queryMap = new Map<string, any[]>();
    for (const r of latestResults) {
      const qText = (r as any).llmwatch_queries?.text_fr || "Requete inconnue";
      if (!queryMap.has(qText)) queryMap.set(qText, []);
      queryMap.get(qText)!.push(r);
    }

    const queryResults = Array.from(queryMap.entries()).map(([queryText, results]) => ({
      queryText,
      results: results.map((r: any) => ({
        llm: r.llm,
        cited: r.cited || false,
        isRecommended: r.is_recommended || false,
        sentiment: r.sentiment || "neutral",
        snippet: r.snippet || "",
      })),
    }));

    // Fetch competitor scores (latest)
    const competitorScores: { name: string; score: number }[] = [];
    if (competitors.length > 0) {
      const { data: compScores } = await sc
        .from("llmwatch_competitor_scores")
        .select("competitor_id, score")
        .in("competitor_id", competitors.map((c: any) => c.id))
        .order("week_start", { ascending: false });

      const seen = new Set<string>();
      for (const cs of compScores || []) {
        if (!seen.has(cs.competitor_id)) {
          seen.add(cs.competitor_id);
          const comp = competitors.find((c: any) => c.id === cs.competitor_id);
          if (comp) {
            competitorScores.push({ name: comp.name, score: Number(cs.score) });
          }
        }
      }
    }

    // Build PDF data
    const pdfData: LlmWatchPdfData = {
      client: {
        name: client.name,
        sector: client.sector || "",
        location: client.location || "",
        domain: client.domain || "",
      },
      score: {
        scoreGeo: Number(latestScore.score),
        scorePresence: Number(latestScore.score_presence || 0),
        scoreExactitude: Number(latestScore.score_exactitude || 0),
        scoreSentiment: Number(latestScore.score_sentiment || 0),
        scoreRecommendation: Number(latestScore.score_recommendation || 0),
        citationRate: Number(latestScore.citation_rate || 0),
        totalResponses: Number(latestScore.total_responses || 0),
        weekStart: latestScore.week_start,
      },
      scoreByLlm,
      scoreByLang,
      history: scores.reverse().map((s: any) => ({
        weekStart: s.week_start,
        score: Number(s.score),
      })),
      queryResults,
      competitors: competitorScores,
      generatedAt: new Date().toISOString(),
    };

    // Render HTML
    const html = renderLlmWatchPdf(pdfData);

    // Return HTML (printable) or PDF
    if (format === "html") {
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Generate PDF
    try {
      const pdfBuffer = await htmlToPdf(html);
      const filename = `ScoreGEO_${client.name.replace(/[^a-zA-Z0-9]/g, "_")}_${latestScore.week_start}.pdf`;

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (pdfErr) {
      // Fallback: return printable HTML
      console.error("[llmwatch/pdf] Puppeteer failed, returning HTML:", pdfErr);
      const fallbackHtml = html.replace(
        "</body>",
        `<script>window.onload = function() { window.print(); }</script></body>`
      );
      return new NextResponse(fallbackHtml, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch (error) {
    console.error("[llmwatch/pdf] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
}
