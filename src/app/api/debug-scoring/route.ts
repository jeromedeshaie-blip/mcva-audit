import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { QUALITY_CONFIG } from "@/lib/constants";

export const maxDuration = 60;

/**
 * GET /api/debug-scoring — Test a single Claude scoring call
 * Visit in browser: /api/debug-scoring?url=fdmfidu.ch
 *
 * Tests the EXACT same flow as the scoring pipeline to find the error.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url") || "fdmfidu.ch";
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  const log: string[] = [];
  const start = Date.now();
  const elapsed = () => `${Date.now() - start}ms`;

  // Step 1: Check env
  log.push(`[${elapsed()}] ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? `set (${process.env.ANTHROPIC_API_KEY.slice(0, 12)}...)` : "MISSING"}`);
  log.push(`[${elapsed()}] NODE_ENV: ${process.env.NODE_ENV}`);
  log.push(`[${elapsed()}] Scoring model: ${QUALITY_CONFIG.standard.scoringModel}`);

  // Step 2: Scrape HTML (minimal)
  let html = "";
  try {
    const res = await fetch(fullUrl, {
      headers: { "User-Agent": "MCVAAuditBot/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
    log.push(`[${elapsed()}] HTML scraped: ${html.length} chars (status ${res.status})`);
  } catch (e: any) {
    log.push(`[${elapsed()}] Scrape FAILED: ${e.message}`);
    return NextResponse.json({ ok: false, log });
  }

  // Step 3: Truncate HTML like scorer does
  const truncatedHtml = html.slice(0, QUALITY_CONFIG.standard.htmlMaxChars);
  log.push(`[${elapsed()}] Truncated HTML: ${truncatedHtml.length} chars`);

  // Step 4: Build the EXACT same prompt as scoreDimension
  const prompt = `Tu es un auditeur SEO/GEO expert. Analyse cette page web et évalue chaque critère ci-dessous.

URL: ${fullUrl}

HTML de la page (tronqué si nécessaire):
\`\`\`html
${truncatedHtml}
\`\`\`

Critères à évaluer (dimension C):
- C01: Titre de page clair et descriptif — Le title tag reflète précisément le contenu et l'intention de la page.
- C02: Structure de contenu IA-compatible — Le contenu est structuré de manière à être facilement extrait et cité par les moteurs IA.

Pour CHAQUE critère, réponds en JSON avec un tableau d'objets:
[
  {
    "code": "C01",
    "status": "pass" | "partial" | "fail",
    "score": 0-100,
    "notes": "Explication concise en français (1-2 phrases)"
  }
]

Règles de scoring:
- "pass" = 75-100 : le critère est pleinement satisfait
- "partial" = 25-74 : le critère est partiellement satisfait
- "fail" = 0-24 : le critère n'est pas satisfait
- Sois factuel et précis. Base ton évaluation uniquement sur ce qui est observable dans le HTML.

Réponds UNIQUEMENT avec le tableau JSON, sans texte avant ni après.`;

  log.push(`[${elapsed()}] Prompt built: ${prompt.length} chars (~${Math.round(prompt.length / 4)} tokens)`);

  // Step 5: Call Claude API — THE CRITICAL TEST
  try {
    log.push(`[${elapsed()}] Creating Anthropic client...`);
    const anthropic = new Anthropic();

    log.push(`[${elapsed()}] Calling claude API (model: ${QUALITY_CONFIG.standard.scoringModel})...`);
    const message = await anthropic.messages.create({
      model: QUALITY_CONFIG.standard.scoringModel,
      max_tokens: 2000,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content[0];
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";

    log.push(`[${elapsed()}] Claude responded: ${text.length} chars`);
    log.push(`[${elapsed()}] Response preview: ${text.slice(0, 500)}`);
    log.push(`[${elapsed()}] Usage: input=${message.usage?.input_tokens}, output=${message.usage?.output_tokens}`);
    log.push(`[${elapsed()}] Stop reason: ${message.stop_reason}`);

    // Try parsing
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        log.push(`[${elapsed()}] Parsed ${parsed.length} items successfully`);
        return NextResponse.json({
          ok: true,
          items: parsed,
          log,
          response_length: text.length,
          usage: message.usage,
        });
      } else {
        log.push(`[${elapsed()}] No JSON array found in response`);
      }
    } catch (parseErr: any) {
      log.push(`[${elapsed()}] JSON parse failed: ${parseErr.message}`);
    }

    return NextResponse.json({
      ok: true,
      raw_response: text.slice(0, 1000),
      log,
    });
  } catch (e: any) {
    log.push(`[${elapsed()}] CLAUDE API FAILED: ${e.message}`);
    log.push(`[${elapsed()}] Error type: ${e.constructor?.name}`);
    log.push(`[${elapsed()}] Error status: ${e.status || "N/A"}`);
    log.push(`[${elapsed()}] Error headers: ${JSON.stringify(e.headers || {})}`);

    // Check for specific error types
    if (e.message?.includes("rate")) {
      log.push(`[${elapsed()}] >>> RATE LIMIT detected`);
    }
    if (e.message?.includes("timeout")) {
      log.push(`[${elapsed()}] >>> TIMEOUT detected`);
    }
    if (e.message?.includes("key")) {
      log.push(`[${elapsed()}] >>> API KEY issue detected`);
    }
    if (e.message?.includes("model")) {
      log.push(`[${elapsed()}] >>> MODEL issue detected`);
    }

    return NextResponse.json({
      ok: false,
      error: e.message,
      error_type: e.constructor?.name,
      log,
    });
  }
}
