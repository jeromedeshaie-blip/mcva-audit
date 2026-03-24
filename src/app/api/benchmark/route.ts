import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

const MAX_DOMAINS = 50;

/**
 * POST /api/benchmark — Create a benchmark and launch batch eco audits
 *
 * Body: { name, sub_category, geographic_scope, domains: string[] }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { name, sub_category, geographic_scope = "suisse", domains } = body as {
    name: string;
    sub_category: string;
    geographic_scope?: string;
    domains: string[];
  };

  // Validation
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nom du benchmark requis" }, { status: 400 });
  }

  if (!sub_category || typeof sub_category !== "string") {
    return NextResponse.json({ error: "Sous-catégorie requise" }, { status: 400 });
  }

  if (!Array.isArray(domains) || domains.length < 2) {
    return NextResponse.json({ error: "Au moins 2 domaines requis" }, { status: 400 });
  }

  if (domains.length > MAX_DOMAINS) {
    return NextResponse.json({ error: `Maximum ${MAX_DOMAINS} domaines` }, { status: 400 });
  }

  // Normalize domains
  const normalizedDomains = domains
    .map((d) => {
      if (typeof d !== "string") return null;
      const trimmed = d.trim();
      if (!trimmed) return null;

      // Extract domain from URL or raw domain
      try {
        const urlStr = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
        const parsed = new URL(urlStr);
        return {
          domain: parsed.hostname.replace(/^www\./, ""),
          url: `https://${parsed.hostname.replace(/^www\./, "")}`,
        };
      } catch {
        return null;
      }
    })
    .filter((d): d is { domain: string; url: string } => d !== null);

  // Deduplicate
  const seen = new Set<string>();
  const uniqueDomains = normalizedDomains.filter((d) => {
    if (seen.has(d.domain)) return false;
    seen.add(d.domain);
    return true;
  });

  if (uniqueDomains.length < 2) {
    return NextResponse.json({ error: "Au moins 2 domaines valides requis" }, { status: 400 });
  }

  // Create benchmark
  const { data: benchmark, error: benchmarkError } = await supabase
    .from("benchmarks")
    .insert({
      name: name.trim(),
      sub_category: sub_category.trim().toLowerCase(),
      geographic_scope,
      status: "draft",
      domains_count: uniqueDomains.length,
      completed_count: 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (benchmarkError) {
    return NextResponse.json(
      { error: "Erreur lors de la création du benchmark", detail: benchmarkError.message },
      { status: 500 }
    );
  }

  // Insert domains
  const { error: domainsError } = await supabase.from("benchmark_domains").insert(
    uniqueDomains.map((d) => ({
      benchmark_id: benchmark.id,
      domain: d.domain,
      url: d.url,
    }))
  );

  if (domainsError) {
    return NextResponse.json(
      { error: "Erreur lors de l'ajout des domaines", detail: domainsError.message },
      { status: 500 }
    );
  }

  // Trigger Inngest batch
  try {
    await inngest.send({
      name: "benchmark/batch.requested",
      data: { benchmarkId: benchmark.id },
    });
  } catch (inngestError) {
    console.error(`[benchmark:${benchmark.id}] Inngest send failed:`, inngestError);
    await supabase
      .from("benchmarks")
      .update({ status: "error" })
      .eq("id", benchmark.id);

    return NextResponse.json(
      { error: "Erreur lors du lancement du benchmark", detail: "Service d'orchestration indisponible" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    benchmark_id: benchmark.id,
    domains_count: uniqueDomains.length,
    status: "draft",
    estimated_cost: `~$${(uniqueDomains.length * 0.03).toFixed(2)}`,
    message: `Benchmark lancé : ${uniqueDomains.length} domaines en audit éco.`,
  });
}

/**
 * GET /api/benchmark — List benchmarks or get one by id
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const benchmarkId = request.nextUrl.searchParams.get("id");

  if (!benchmarkId) {
    // List all benchmarks
    const { data: benchmarks, error } = await supabase
      .from("benchmarks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 });
    }

    return NextResponse.json({ benchmarks: benchmarks || [] });
  }

  // Get specific benchmark with domains
  const [benchmarkRes, domainsRes] = await Promise.all([
    supabase.from("benchmarks").select("*").eq("id", benchmarkId).single(),
    supabase
      .from("benchmark_domains")
      .select("*")
      .eq("benchmark_id", benchmarkId)
      .order("rank_seo", { ascending: true, nullsFirst: false }),
  ]);

  if (!benchmarkRes.data) {
    return NextResponse.json({ error: "Benchmark non trouvé" }, { status: 404 });
  }

  return NextResponse.json({
    benchmark: benchmarkRes.data,
    domains: domainsRes.data || [],
  });
}
