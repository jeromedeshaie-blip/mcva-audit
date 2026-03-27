import type { LlmProvider, Lang } from "./types";

export interface RawResult {
  llm: LlmProvider;
  lang: Lang;
  cited: boolean;
  rank: number | null;
}

/** Pondération par LLM (volumétrie marché 2026) */
const LLM_WEIGHTS: Record<LlmProvider, number> = {
  openai: 0.35,
  perplexity: 0.3,
  anthropic: 0.2,
  gemini: 0.15,
};

/** Score de rang : 1er = 1.0, 2e = 0.75, 3e = 0.5, 4e+ = 0.25 */
function rankScore(rank: number | null): number {
  if (!rank) return 0;
  const weights: Record<number, number> = { 1: 1.0, 2: 0.75, 3: 0.5 };
  return weights[rank] ?? 0.25;
}

export function computeScore(results: RawResult[]): {
  score: number;
  scoreByLlm: Record<string, number>;
  scoreByLang: Record<string, number>;
  citationRate: number;
} {
  if (!results.length)
    return { score: 0, scoreByLlm: {}, scoreByLang: {}, citationRate: 0 };

  // Taux de citation global
  const cited = results.filter((r) => r.cited);
  const citationRate = (cited.length / results.length) * 100;

  // Score pondéré par LLM
  const weightedScore = results.reduce((sum, r) => {
    const w = LLM_WEIGHTS[r.llm] ?? 0.1;
    return sum + w * rankScore(r.rank);
  }, 0);

  // Score par LLM (pour le dashboard)
  const scoreByLlm: Record<string, number> = {};
  for (const llm of Object.keys(LLM_WEIGHTS)) {
    const llmResults = results.filter((r) => r.llm === llm);
    if (!llmResults.length) {
      scoreByLlm[llm] = 0;
      continue;
    }
    const llmCited = llmResults.filter((r) => r.cited);
    const llmRate = llmCited.length / llmResults.length;
    const llmRank =
      llmCited.reduce((s, r) => s + rankScore(r.rank), 0) /
      (llmCited.length || 1);
    scoreByLlm[llm] = Math.round((llmRate * 0.6 + llmRank * 0.4) * 100);
  }

  // Score par langue
  const scoreByLang: Record<string, number> = {};
  for (const lang of ["fr", "de", "en"] as const) {
    const langResults = results.filter((r) => r.lang === lang);
    if (!langResults.length) {
      scoreByLang[lang] = 0;
      continue;
    }
    const langCited = langResults.filter((r) => r.cited);
    scoreByLang[lang] = Math.round(
      (langCited.length / langResults.length) * 100
    );
  }

  // Score composite final 0–100
  const avgRank = cited.length
    ? cited.reduce((s, r) => s + rankScore(r.rank), 0) / cited.length
    : 0;
  const score = Math.min(
    Math.round(
      (citationRate / 100) * 0.5 * 100 +
        avgRank * 0.3 * 100 +
        weightedScore * 0.2 * 100
    ),
    100
  );

  return {
    score,
    scoreByLlm,
    scoreByLang,
    citationRate: Math.round(citationRate),
  };
}
