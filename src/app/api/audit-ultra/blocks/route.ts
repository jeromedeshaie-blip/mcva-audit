/**
 * API — audit-ultra/blocks
 * GET  : list blocks for an audit + canRunUltra status
 * POST : upload/update a block (A-F)
 * DELETE : remove a block
 *
 * POLE-PERFORMANCE v2.1 § 6.4.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canRunUltra, type ExternalBlockLetter, EXTERNAL_BLOCKS } from "@/lib/scoring/constants";
import { parseBlocAawt } from "@/lib/audit/parsers/parse-bloc-a-awt";
import { parseBlocBgsc } from "@/lib/audit/parsers/parse-bloc-b-gsc";
import { parseBlocCga4 } from "@/lib/audit/parsers/parse-bloc-c-ga4";
import { parseBlocDcompetitors } from "@/lib/audit/parsers/parse-bloc-d-competitors";
import { parseBlocEkeywords } from "@/lib/audit/parsers/parse-bloc-e-keywords";
import { buildBlocFFromLlmWatch } from "@/lib/audit/parsers/fetch-bloc-f-llmwatch";

export const maxDuration = 30;

// --------------------------------------------------------------------
// GET — list blocks for an audit
// --------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const auditId = request.nextUrl.searchParams.get("auditId");
  if (!auditId) return NextResponse.json({ error: "auditId requis" }, { status: 400 });

  const service = createServiceClient();
  const { data: blocks, error } = await service
    .from("audit_external_blocks")
    .select("*")
    .eq("audit_id", auditId)
    .order("bloc_letter");

  if (error) {
    return NextResponse.json({ error: "DB error", detail: error.message }, { status: 500 });
  }

  const availableLetters = (blocks || []).map((b: any) => b.bloc_letter as ExternalBlockLetter);
  const readiness = canRunUltra(availableLetters);

  return NextResponse.json({
    blocks: blocks || [],
    readiness,
    available_blocks: availableLetters,
  });
}

// --------------------------------------------------------------------
// POST — upload/update a block
// --------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { auditId, blocLetter, rawInput, sourceLabel, structuredData, llmwatchClientId } = body;

  if (!auditId || !blocLetter) {
    return NextResponse.json({ error: "auditId et blocLetter requis" }, { status: 400 });
  }
  if (!["A", "B", "C", "D", "E", "F"].includes(blocLetter)) {
    return NextResponse.json({ error: "blocLetter invalide (A-F)" }, { status: 400 });
  }

  const letter = blocLetter as ExternalBlockLetter;
  const blocInfo = EXTERNAL_BLOCKS[letter];
  const service = createServiceClient();

  // Parse according to bloc type
  let parsed: any = null;
  let errors: string[] = [];
  let warnings: string[] = [];

  try {
    switch (letter) {
      case "A": {
        const r = parseBlocAawt(rawInput || "");
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "B": {
        const r = parseBlocBgsc(rawInput || "");
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "C": {
        const r = parseBlocCga4(rawInput || "");
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "D": {
        // Accepte structuredData direct (JSON du form) OU rawInput (paste)
        const input = structuredData || rawInput || "";
        const r = parseBlocDcompetitors(input);
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "E": {
        const r = parseBlocEkeywords(rawInput || "");
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
      case "F": {
        // Fetch latest LLM Watch score for the specified client
        if (!llmwatchClientId) {
          return NextResponse.json({ error: "llmwatchClientId requis pour Bloc F" }, { status: 400 });
        }
        const { data: scoreRow, error: scoreErr } = await service
          .from("llmwatch_scores")
          .select("*")
          .eq("client_id", llmwatchClientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scoreErr || !scoreRow) {
          return NextResponse.json(
            { error: "Aucun score LLM Watch trouvé", detail: scoreErr?.message },
            { status: 404 }
          );
        }

        const { data: sampleRaw } = await service
          .from("llmwatch_raw_results")
          .select("query_id, llm, response_raw, cited")
          .eq("client_id", llmwatchClientId)
          .order("collected_at", { ascending: false })
          .limit(10);

        const sampleQueries = (sampleRaw || []).map((r: any) => ({
          query: r.query_id,
          llm: r.llm,
          cited: r.cited || false,
          snippet: r.response_raw ? String(r.response_raw).slice(0, 200) : undefined,
        }));

        const dashboardUrl = `https://mcva-audit.vercel.app/llmwatch/dashboard/${llmwatchClientId}`;
        const r = buildBlocFFromLlmWatch(scoreRow, sampleQueries, [], dashboardUrl);
        parsed = r.data; errors = r.errors; warnings = r.warnings;
        break;
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Parse failed", detail: e.message }, { status: 500 });
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; "), warnings }, { status: 400 });
  }

  // Upsert bloc (delete existing then insert)
  await service
    .from("audit_external_blocks")
    .delete()
    .eq("audit_id", auditId)
    .eq("bloc_letter", letter);

  const { data: inserted, error: insertErr } = await service
    .from("audit_external_blocks")
    .insert({
      audit_id: auditId,
      bloc_letter: letter,
      bloc_name: blocInfo.name,
      data_json: parsed,
      source_label: sourceLabel || `${blocInfo.short} import ${new Date().toISOString().split("T")[0]}`,
      raw_input: letter === "F" ? null : (rawInput || null),
      parse_errors: warnings,
      imported_by: user.id,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "DB insert failed", detail: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, block: inserted, warnings });
}

// --------------------------------------------------------------------
// DELETE — remove a block
// --------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const auditId = request.nextUrl.searchParams.get("auditId");
  const blocLetter = request.nextUrl.searchParams.get("blocLetter");
  if (!auditId || !blocLetter) {
    return NextResponse.json({ error: "auditId et blocLetter requis" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("audit_external_blocks")
    .delete()
    .eq("audit_id", auditId)
    .eq("bloc_letter", blocLetter);

  if (error) {
    return NextResponse.json({ error: "DB delete failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
