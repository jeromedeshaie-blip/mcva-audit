# LLM Watch v2 — Refactoring Spec for Claude Code

**Project**: `mcva-audit` (Next.js + Supabase + TypeScript)
**Target**: Refactor existing LLM Watch v1 implementation to address 14 critical weaknesses
**Owner**: Jérôme Deshaie, MCVA Consulting SA
**Date**: 2026-04-08
**Estimated effort**: ~5 Claude Code sessions if done sequentially, can be parallelized

---

## How to use this file with Claude Code

This file is structured as a **task list** for Claude Code. Each task is self-contained:
- Has a **clear scope** (which files to modify)
- Has a **rationale** (why this change matters)
- Has **explicit code** (exact snippets to apply)
- Has **validation steps** (how to verify it works)

**Recommended Claude Code prompt to start:**
```
Read MCVA-LLMWATCH-v2-refactor.md from project root.
Execute tasks in priority order: P0 first, then P1, then P2.
For each task: read the existing files mentioned, apply the changes,
run the validation steps, then move to the next task.
Stop and report after each P0 task for my review.
```

---

## Context — Current state of LLM Watch v1

**Repository structure (relevant files)**:
```
src/
├── lib/
│   ├── llmwatch/
│   │   └── types.ts                       # TypeScript types
│   ├── scoring-engine.ts                  # ⚠️ Naive scoring — to refactor heavily
│   ├── llm-providers.ts                   # ⚠️ Model versions to pin
│   └── monitor.ts                         # ⚠️ Multilingue + competitors not wired
├── app/
│   └── api/
│       ├── llmwatch/
│       │   ├── clients/route.ts
│       │   ├── queries/route.ts
│       │   ├── scores/route.ts
│       │   ├── results/route.ts
│       │   ├── citations/route.ts
│       │   ├── benchmark/route.ts
│       │   ├── recommendations/route.ts
│       │   ├── pdf/route.ts
│       │   ├── reports/generate/route.ts
│       │   └── webhooks/scheduler/route.ts
│       └── monitoring/
│           ├── queries/route.ts
│           ├── run-single/route.ts
│           └── finalize-score/route.ts
supabase/
└── llmwatch.sql                           # ⚠️ Need new tables
```

**Tables Supabase actuelles** :
- `llmwatch_clients`
- `llmwatch_queries`
- `llmwatch_competitors`
- `llmwatch_raw_results`
- `llmwatch_scores`
- `llmwatch_competitor_scores`
- `llmwatch_reports`
- `llmwatch_alerts`

**Tables à ajouter (cf. tasks below)** :
- `llmwatch_facts` (knowledge base for factual accuracy)
- `llmwatch_judge_results` (LLM-as-judge results storage)
- `llmwatch_query_history` (audit log)
- `llmwatch_run_levels` (Light/Standard/Gold config per client)

---

## TASK 1 [P0] — Pin LLM model snapshots

**Why**: `gpt-4o`, `gemini-2.0-flash`, `sonar-pro` are moving aliases. Two runs separated by a few weeks can give different scores without anything changing on the audited site. This breaks the "reproducible Score GEO™" promise. Anthropic is already pinned correctly (`claude-sonnet-4-20250514`).

**File to modify**: `src/lib/llm-providers.ts`

**Change**:

```typescript
// REPLACE the PROVIDERS constant with this:
const PROVIDERS: ProviderConfig[] = [
  {
    name: "openai",
    // BEFORE: model: "gpt-4o",
    // AFTER: pinned snapshot — update manually every 6 months after testing
    model: "gpt-4o-2024-11-20",
    apiKey: process.env.OPENAI_API_KEY!,
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
  {
    name: "anthropic",
    model: "claude-sonnet-4-5-20250929", // Already pinned — verify latest stable
    apiKey: process.env.ANTHROPIC_API_KEY!,
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  {
    name: "perplexity",
    // BEFORE: model: "sonar-pro",
    // AFTER: Perplexity does not offer dated snapshots — document this limitation
    model: "sonar-pro",
    apiKey: process.env.PERPLEXITY_API_KEY!,
    endpoint: "https://api.perplexity.ai/chat/completions",
  },
  {
    name: "gemini",
    // BEFORE: model: "gemini-2.0-flash",
    // AFTER: Use latest stable Gemini Pro snapshot
    model: "gemini-2.5-pro-preview-03-25",
    apiKey: process.env.GEMINI_API_KEY!,
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  },
];

// ALSO ADD this constant at the top of the file:
export const MODEL_SNAPSHOT_VERSION = "2026-04-08";
// Bump this date string every time you update model snapshots above.
// It will be stored alongside each score for reproducibility audit trails.
```

**Validation**:
1. Run `npm run typecheck` — must pass
2. Manually trigger one monitoring run via the admin UI
3. Check that `llmwatch_raw_results` rows have responses from the new model snapshots
4. Verify no API errors in logs

**Stop here and report to Jérôme before continuing.**

---

## TASK 2 [P0] — Add `model_snapshot` column for traceability

**Why**: Each score must be traceable to the exact model snapshots used. Without this, scores from different time periods can't be compared.

**Files to modify**:
1. `supabase/migrations/2026-04-08_add_model_snapshot.sql` (new migration file)
2. `src/lib/monitor.ts`
3. `src/lib/llmwatch/types.ts`

**SQL migration**:

```sql
-- supabase/migrations/2026-04-08_add_model_snapshot.sql
ALTER TABLE llmwatch_scores
ADD COLUMN IF NOT EXISTS model_snapshot_version TEXT,
ADD COLUMN IF NOT EXISTS models_used JSONB;

ALTER TABLE llmwatch_raw_results
ADD COLUMN IF NOT EXISTS model_version TEXT;

CREATE INDEX IF NOT EXISTS idx_llmwatch_scores_snapshot
  ON llmwatch_scores(model_snapshot_version);

COMMENT ON COLUMN llmwatch_scores.model_snapshot_version
  IS 'Date string from MODEL_SNAPSHOT_VERSION constant when score was computed';
COMMENT ON COLUMN llmwatch_scores.models_used
  IS 'JSONB: { openai: "gpt-4o-2024-11-20", anthropic: "...", ... }';
```

**TypeScript update** in `src/lib/llmwatch/types.ts`:

```typescript
// MODIFY the LlmWatchScore interface — add these fields:
export interface LlmWatchScore {
  // ... existing fields ...
  model_snapshot_version: string | null;  // ADD
  models_used: Record<LlmProvider, string> | null;  // ADD
}
```

**Wiring in `src/lib/monitor.ts`**:

```typescript
// At the top of the file, add:
import { MODEL_SNAPSHOT_VERSION } from "./llm-providers";

// In runMonitoring(), MODIFY the score insert to include snapshot:
// FIND the existing insert and ADD these two fields to the .update() call
// near the end of the try block:

await supabase.from("llmwatch_scores").update({
  // ... existing fields ...
  model_snapshot_version: MODEL_SNAPSHOT_VERSION,
  models_used: {
    openai: "gpt-4o-2024-11-20",
    anthropic: "claude-sonnet-4-5-20250929",
    perplexity: "sonar-pro",
    gemini: "gemini-2.5-pro-preview-03-25",
  },
}).eq("id", scoreId);
```

**Validation**:
1. Apply migration: `npx supabase db push` or via Supabase SQL Editor
2. Run a monitoring job
3. Query `select model_snapshot_version, models_used from llmwatch_scores order by created_at desc limit 1;`
4. Confirm the snapshot version and models JSON are present

---

## TASK 3 [P0] — Replace naive sentiment with LLM-as-judge

**Why**: Current sentiment analysis uses dictionary lookup of ~80 hardcoded words. It cannot detect negation, sarcasm, context, or German. For a "proprietary Score GEO™" sold as reproducible and documented, this is the weakest link.

**Approach**: Replace `analyzeSentiment()`, `detectRecommendation()`, and `checkFactualAccuracy()` with a single call to Claude Sonnet 4.6 acting as a structured judge. One call per response analyzed, returning a JSON object with all judgments.

**Files to modify**:
1. `src/lib/judge.ts` (new file)
2. `src/lib/scoring-engine.ts` (heavy refactor)
3. `src/lib/monitor.ts` (call judge before scoring)

**New file `src/lib/judge.ts`**:

```typescript
// src/lib/judge.ts
// LLM-as-judge for Score GEO™ v2
// Single Claude Sonnet 4.6 call per response, returns structured JSON

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const JUDGE_MODEL = "claude-sonnet-4-5-20250929";

export interface JudgeVerdict {
  isBrandMentioned: boolean;
  brandMentionConfidence: number; // 0-1
  isRecommended: boolean;
  recommendationStrength: "explicit" | "implicit" | "none";
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number; // -1 to +1
  competitorMentions: string[]; // canonical names from the provided list
  factualClaims: Array<{
    claim: string;
    verdict: "correct" | "incorrect" | "unverifiable";
    expectedValue?: string;
  }>;
  citationUrls: string[];
  reasoningNotes: string; // brief justification for audit trail
}

interface JudgeInput {
  response: string;
  brandName: string;
  brandAliases: string[]; // ex: ["MCVA", "MCVA Consulting", "MCVA SA"]
  competitors: string[];
  knownFacts?: Record<string, string>; // ex: { "fondation": "1977", "collaborateurs": "20" }
  language: "fr" | "de" | "en";
}

const JUDGE_SYSTEM_PROMPT = `You are a structured analyst evaluating how an AI assistant talks about a specific brand. You output ONLY valid JSON matching the provided schema. No prose, no markdown, no code fences.

Your analysis must be strict and reproducible:
- "isBrandMentioned" is TRUE only if the brand is explicitly named (case-insensitive). Substring matches inside other words DO NOT count.
- "isRecommended" is TRUE only if the response clearly suggests the brand as a good choice. Generic mentions are NOT recommendations.
- "sentiment" reflects ONLY the tone toward the brand, not the overall response tone.
- "factualClaims" lists every verifiable claim about the brand, comparing against known facts when provided.
- Be conservative: when uncertain, choose neutral / unverifiable / false.`;

function buildJudgePrompt(input: JudgeInput): string {
  const factsSection = input.knownFacts && Object.keys(input.knownFacts).length > 0
    ? `\n\nKNOWN FACTS about ${input.brandName} (use to verify factual claims):\n${
        Object.entries(input.knownFacts).map(([k, v]) => `- ${k}: ${v}`).join("\n")
      }`
    : "";

  return `Brand to analyze: ${input.brandName}
Brand aliases (any of these counts as a mention): ${JSON.stringify(input.brandAliases)}
Known competitors (canonical names): ${JSON.stringify(input.competitors)}
Response language: ${input.language}${factsSection}

AI ASSISTANT RESPONSE TO ANALYZE:
"""
${input.response}
"""

Output a JSON object matching this exact schema:
{
  "isBrandMentioned": boolean,
  "brandMentionConfidence": number,
  "isRecommended": boolean,
  "recommendationStrength": "explicit" | "implicit" | "none",
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": number,
  "competitorMentions": string[],
  "factualClaims": [{ "claim": string, "verdict": "correct" | "incorrect" | "unverifiable", "expectedValue": string }],
  "citationUrls": string[],
  "reasoningNotes": string
}`;
}

export async function judgeResponse(input: JudgeInput): Promise<JudgeVerdict> {
  const message = await anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 2000,
    temperature: 0, // deterministic
    system: JUDGE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildJudgePrompt(input) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Judge returned no text content");
  }

  // Parse JSON, handling potential ```json wrappers defensively
  let raw = textBlock.text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const verdict = JSON.parse(raw) as JudgeVerdict;
    return verdict;
  } catch (err) {
    throw new Error(`Judge returned invalid JSON: ${raw.slice(0, 200)}`);
  }
}

export const JUDGE_MODEL_VERSION = JUDGE_MODEL;
```

**Refactor `src/lib/scoring-engine.ts`** — replace the dictionary-based functions:

```typescript
// src/lib/scoring-engine.ts
// V2 — Uses LLM-as-judge from src/lib/judge.ts instead of dictionary lookup

import type { LLMResponse } from "./llm-providers";
import { judgeResponse, type JudgeVerdict } from "./judge";

export interface ResponseScore {
  provider: string;
  model: string;
  query: string;
  response: string;
  isBrandMentioned: boolean;
  brandMentionConfidence: number;
  isRecommended: boolean;
  recommendationStrength: "explicit" | "implicit" | "none";
  isFactuallyAccurate: boolean | null;
  factualClaims: JudgeVerdict["factualClaims"];
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  citationSources: string[];
  competitorMentions: string[];
  judgeReasoning: string;
  tokensUsed: number;
  latencyMs: number;
  costUsd: number;
}

export interface RunScore {
  scoreGeo: number;
  scorePresence: number;
  scoreExactitude: number;
  scoreSentiment: number;
  scoreRecommendation: number;
  totalResponses: number;
  llmsAvailable: number;
  llmsMonitored: number;
  responseScores: ResponseScore[];
}

export async function scoreResponse(
  llmResponse: LLMResponse,
  brandName: string,
  brandAliases: string[],
  competitors: string[],
  knownFacts: Record<string, string> | undefined,
  language: "fr" | "de" | "en"
): Promise<ResponseScore> {
  const verdict = await judgeResponse({
    response: llmResponse.response,
    brandName,
    brandAliases,
    competitors,
    knownFacts,
    language,
  });

  // Compute factual accuracy from claims
  const verifiableClaims = verdict.factualClaims.filter(c => c.verdict !== "unverifiable");
  let isFactuallyAccurate: boolean | null = null;
  if (verifiableClaims.length > 0) {
    const correctRatio = verifiableClaims.filter(c => c.verdict === "correct").length / verifiableClaims.length;
    isFactuallyAccurate = correctRatio >= 0.75;
  }

  return {
    provider: llmResponse.provider,
    model: llmResponse.model,
    query: llmResponse.query,
    response: llmResponse.response,
    isBrandMentioned: verdict.isBrandMentioned,
    brandMentionConfidence: verdict.brandMentionConfidence,
    isRecommended: verdict.isRecommended,
    recommendationStrength: verdict.recommendationStrength,
    isFactuallyAccurate,
    factualClaims: verdict.factualClaims,
    sentiment: verdict.sentiment,
    sentimentScore: verdict.sentimentScore,
    citationSources: verdict.citationUrls,
    competitorMentions: verdict.competitorMentions,
    judgeReasoning: verdict.reasoningNotes,
    tokensUsed: llmResponse.tokensUsed,
    latencyMs: llmResponse.latencyMs,
    costUsd: llmResponse.costUsd,
  };
}

export function computeRunScore(responseScores: ResponseScore[]): RunScore {
  const allLlms = new Set(responseScores.map(r => r.provider));
  const MONITORED_LLMS = 4;
  const total = responseScores.length;

  if (total === 0) {
    return {
      scoreGeo: 0, scorePresence: 0, scoreExactitude: 0, scoreSentiment: 0, scoreRecommendation: 0,
      totalResponses: 0, llmsAvailable: 0, llmsMonitored: MONITORED_LLMS, responseScores: [],
    };
  }

  // Présence: Mention Rate × 25
  const mentionRate = responseScores.filter(r => r.isBrandMentioned).length / total;
  const scorePresence = Math.round(mentionRate * 25 * 100) / 100;

  // Exactitude: based on verifiable claims, default to neutral if no facts available
  const mentioned = responseScores.filter(r => r.isBrandMentioned);
  const checked = mentioned.filter(r => r.isFactuallyAccurate !== null);
  let scoreExactitude: number;
  if (checked.length === 0) {
    // Fallback: use brandMentionConfidence as proxy for "talked confidently about brand"
    const avgConfidence = mentioned.length > 0
      ? mentioned.reduce((s, r) => s + r.brandMentionConfidence, 0) / mentioned.length
      : 0;
    scoreExactitude = Math.round(avgConfidence * 25 * 100) / 100;
  } else {
    const accuracyRate = checked.filter(r => r.isFactuallyAccurate).length / checked.length;
    scoreExactitude = Math.round(accuracyRate * 25 * 100) / 100;
  }

  // Sentiment: average -1..+1 mapped to 0..25
  const avgSentiment = responseScores.reduce((s, r) => s + r.sentimentScore, 0) / total;
  const scoreSentiment = Math.round(((avgSentiment + 1) / 2) * 25 * 100) / 100;

  // Recommandation: explicit counts more than implicit
  const recoScore = responseScores.reduce((s, r) => {
    if (r.recommendationStrength === "explicit") return s + 1;
    if (r.recommendationStrength === "implicit") return s + 0.5;
    return s;
  }, 0) / total;
  const scoreRecommendation = Math.round(recoScore * 25 * 100) / 100;

  const scoreGeo = Math.round((scorePresence + scoreExactitude + scoreSentiment + scoreRecommendation) * 100) / 100;

  return {
    scoreGeo, scorePresence, scoreExactitude, scoreSentiment, scoreRecommendation,
    totalResponses: total,
    llmsAvailable: allLlms.size,
    llmsMonitored: MONITORED_LLMS,
    responseScores,
  };
}

export type GeoTier = "invisible" | "emergent" | "visible" | "leader";

export function getGeoTier(score: number): GeoTier {
  if (score <= 25) return "invisible";
  if (score <= 50) return "emergent";
  if (score <= 75) return "visible";
  return "leader";
}

export function getGeoTierLabel(tier: GeoTier): string {
  const labels: Record<GeoTier, string> = {
    invisible: "Invisible (0-25)",
    emergent: "Émergent (26-50)",
    visible: "Visible (51-75)",
    leader: "Leader (76-100)",
  };
  return labels[tier];
}
```

**Update `src/lib/monitor.ts`** — pass the new parameters and await the now-async scoreResponse:

```typescript
// In runMonitoring(), REPLACE the scoring loop:

// BEFORE:
// for (const llmResponse of llmResponses) {
//   const scored = scoreResponse(llmResponse, client.brand_keywords || [client.name, client.domain], competitors);

// AFTER:
const brandAliases = client.brand_keywords || [client.name, client.domain];
const competitors = (await supabase
  .from("llmwatch_competitors")
  .select("name")
  .eq("client_id", clientId)
  .eq("active", true)
).data?.map(c => c.name) || [];

// Fetch known facts (will be implemented in TASK 6)
const knownFacts = await getClientFacts(clientId, supabase);

for (const llmResponse of llmResponses) {
  const scored = await scoreResponse(
    llmResponse,
    client.name,
    brandAliases,
    competitors,
    knownFacts,
    "fr" // TODO: pass actual language from query
  );
  // ... rest of the insert logic ...
}

// Add this helper at the bottom of the file:
async function getClientFacts(
  clientId: string,
  supabase: SupabaseClient
): Promise<Record<string, string> | undefined> {
  const { data } = await supabase
    .from("llmwatch_facts")
    .select("fact_key, fact_value")
    .eq("client_id", clientId)
    .eq("active", true);
  if (!data || data.length === 0) return undefined;
  return Object.fromEntries(data.map(f => [f.fact_key, f.fact_value]));
}
```

**Cost impact**: Each judge call ≈ 1500-2500 input tokens + 500-800 output tokens on Claude Sonnet 4.6 ≈ **$0.012 per response judged**. For a Standard run (30 prompts × 4 LLMs × 3 runs = 360 responses) ≈ **$4.30**. Acceptable.

**Validation**:
1. Run a test monitoring with 1 client and 2 queries
2. Inspect the resulting `responseScores[]` — verify each has `judgeReasoning` filled
3. Manually verify 2-3 verdicts make sense (e.g., a response that doesn't mention the brand should have `isBrandMentioned: false`)
4. Check Anthropic usage dashboard for cost confirmation

**Stop here and report to Jérôme.**

---

## TASK 4 [P0] — Add Light/Standard/Gold run levels

**Why**: A single mode "execute all queries × 4 LLMs × 1 run" doesn't fit different commercial uses (test/demo vs sold audit vs strategic retainer). The framework v2 promises 3 configurable levels.

**Files to modify**:
1. `supabase/migrations/2026-04-08_run_levels.sql` (new)
2. `src/lib/llmwatch/types.ts`
3. `src/lib/monitor.ts`
4. `src/app/(dashboard)/llmwatch/admin/page.tsx` (UI selector)

**SQL migration**:

```sql
-- supabase/migrations/2026-04-08_run_levels.sql
CREATE TYPE run_level AS ENUM ('light', 'standard', 'gold');

ALTER TABLE llmwatch_clients
ADD COLUMN IF NOT EXISTS default_run_level run_level DEFAULT 'standard';

ALTER TABLE llmwatch_scores
ADD COLUMN IF NOT EXISTS run_level run_level,
ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS score_stddev NUMERIC(5,2);

COMMENT ON COLUMN llmwatch_scores.run_count IS 'Number of repetitions for this score (1 for light, 3 for standard/gold)';
COMMENT ON COLUMN llmwatch_scores.score_stddev IS 'Standard deviation across repetitions, null if run_count=1';
```

**Types update**:

```typescript
// src/lib/llmwatch/types.ts — ADD:
export type RunLevel = "light" | "standard" | "gold";

export interface RunLevelConfig {
  level: RunLevel;
  maxQueries: number;       // cap on queries to use
  llmCount: number;         // always 4 for now
  repetitions: number;      // 1, 3, or 3
  estimatedCostUsd: number; // for UI display
}

export const RUN_LEVELS: Record<RunLevel, RunLevelConfig> = {
  light: {
    level: "light",
    maxQueries: 15,
    llmCount: 4,
    repetitions: 1,
    estimatedCostUsd: 0.8,
  },
  standard: {
    level: "standard",
    maxQueries: 30,
    llmCount: 4,
    repetitions: 3,
    estimatedCostUsd: 4.5,
  },
  gold: {
    level: "gold",
    maxQueries: 50,
    llmCount: 4,
    repetitions: 3,
    estimatedCostUsd: 10,
  },
};

// MODIFY LlmWatchScore to add:
export interface LlmWatchScore {
  // ... existing ...
  run_level: RunLevel | null;
  run_count: number;
  score_stddev: number | null;
}
```

**Monitor refactor** — `src/lib/monitor.ts`:

```typescript
// MODIFY runMonitoring signature:
export async function runMonitoring(
  clientId: string,
  level: RunLevel = "standard"
): Promise<MonitoringResult> {
  const supabase = getSupabase();
  const config = RUN_LEVELS[level];
  const startTime = Date.now();

  // ... fetch client (unchanged) ...

  // Apply max queries cap from level config
  const { data: queries } = await supabase
    .from("llmwatch_queries")
    .select("id, client_id, text_fr, text_de, text_en, category")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("sort_order")
    .limit(config.maxQueries);

  // ... existing setup ...

  // Run REPETITIONS times
  const allRunScores: RunScore[] = [];
  for (let rep = 0; rep < config.repetitions; rep++) {
    const repResponseScores: ResponseScore[] = [];

    for (const query of queries) {
      const llmResponses = await queryAllLLMs(query.text_fr);
      for (const llmResponse of llmResponses) {
        const scored = await scoreResponse(
          llmResponse, client.name, brandAliases, competitors, knownFacts, "fr"
        );
        repResponseScores.push(scored);
        totalCost += llmResponse.costUsd + 0.012; // judge cost
        // ... insert raw_results (unchanged) ...
      }
      await new Promise(r => setTimeout(r, 500));
    }

    allRunScores.push(computeRunScore(repResponseScores));
  }

  // Average across repetitions
  const meanScore = allRunScores.reduce((s, r) => s + r.scoreGeo, 0) / allRunScores.length;
  const variance = allRunScores.reduce((s, r) => s + Math.pow(r.scoreGeo - meanScore, 2), 0) / allRunScores.length;
  const stddev = Math.sqrt(variance);

  // Use the LAST run as the canonical responseScores for storage
  const finalRunScore = allRunScores[allRunScores.length - 1];
  finalRunScore.scoreGeo = Math.round(meanScore * 100) / 100;

  await supabase.from("llmwatch_scores").update({
    // ... existing fields ...
    run_level: level,
    run_count: config.repetitions,
    score_stddev: Math.round(stddev * 100) / 100,
  }).eq("id", scoreId);

  // ... rest unchanged ...
}
```

**UI selector** in `src/app/(dashboard)/llmwatch/admin/page.tsx`:

Add a dropdown selector before the "Lancer maintenant" button:
```tsx
<select
  value={selectedLevel}
  onChange={(e) => setSelectedLevel(e.target.value as RunLevel)}
  className="border rounded px-3 py-2"
>
  <option value="light">Light — 15 queries × 1 run (~$0.80)</option>
  <option value="standard">Standard — 30 queries × 3 runs (~$4.50)</option>
  <option value="gold">Gold — 50 queries × 3 runs (~$10)</option>
</select>
<button onClick={() => handleRunMonitoring(client.id, selectedLevel)}>
  Lancer maintenant
</button>
```

And modify `handleRunMonitoring` to pass the level to the API.

**Validation**:
1. Apply migration
2. Test each level on a small client (Light first to avoid cost)
3. Verify `score_stddev` is 0 for Light, > 0 for Standard
4. Verify `run_count` matches the level config

---

## TASK 5 [P0] — Tokenize brand mention detection

**Why**: Current detection uses `string.includes()`, causing false positives like "MCVA" matching "mcvasculaire". The new judge in TASK 3 already handles this correctly via Claude. This task ensures the **fallback path** (when judge fails) is also safe.

**File to modify**: `src/lib/judge.ts` (add fallback function)

**Code**:

```typescript
// src/lib/judge.ts — ADD this fallback at the bottom:

/**
 * Fallback brand detection using word-boundary tokenization.
 * Used only when judgeResponse() throws (API failure, timeout, etc.).
 * Strict: requires word boundaries, not substring matches.
 */
export function fallbackBrandDetection(
  response: string,
  brandAliases: string[]
): boolean {
  const tokens = response.toLowerCase().split(/[\s\p{P}]+/u).filter(Boolean);
  return brandAliases.some(alias => {
    const aliasTokens = alias.toLowerCase().split(/\s+/);
    if (aliasTokens.length === 1) {
      return tokens.includes(aliasTokens[0]);
    }
    // Multi-word alias: search for consecutive token sequence
    for (let i = 0; i <= tokens.length - aliasTokens.length; i++) {
      if (aliasTokens.every((t, j) => tokens[i + j] === t)) return true;
    }
    return false;
  });
}

// MODIFY judgeResponse() to wrap in try/catch with fallback:
export async function judgeResponse(input: JudgeInput): Promise<JudgeVerdict> {
  try {
    // ... existing implementation ...
  } catch (err) {
    console.error("[judge] Failed, using fallback:", err);
    return {
      isBrandMentioned: fallbackBrandDetection(input.response, input.brandAliases),
      brandMentionConfidence: 0.5,
      isRecommended: false,
      recommendationStrength: "none",
      sentiment: "neutral",
      sentimentScore: 0,
      competitorMentions: [],
      factualClaims: [],
      citationUrls: (input.response.match(/https?:\/\/[^\s)]+/g) || []),
      reasoningNotes: `Judge failed: ${err instanceof Error ? err.message : "unknown"}. Using fallback detection.`,
    };
  }
}
```

**Validation**:
1. Unit test: `fallbackBrandDetection("le service mcvasculaire est cool", ["MCVA"])` must return `false`
2. Unit test: `fallbackBrandDetection("MCVA Consulting est leader", ["MCVA Consulting"])` must return `true`
3. Test that the catch path works by temporarily breaking the API key

---

## TASK 6 [P1] — Knowledge base table for factual accuracy

**Why**: TASK 3 introduced LLM-as-judge with `knownFacts` parameter, but there's no storage for these facts. Without facts, factual accuracy can never be measured properly.

**Files to modify**:
1. `supabase/migrations/2026-04-08_facts_table.sql` (new)
2. `src/app/api/llmwatch/facts/route.ts` (new API)
3. `src/app/(dashboard)/llmwatch/admin/page.tsx` (UI for managing facts)

**SQL**:

```sql
-- supabase/migrations/2026-04-08_facts_table.sql
CREATE TABLE IF NOT EXISTS llmwatch_facts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES llmwatch_clients(id) ON DELETE CASCADE,
  fact_key    TEXT NOT NULL,
  fact_value  TEXT NOT NULL,
  category    TEXT,
  source_url  TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, fact_key)
);

CREATE INDEX IF NOT EXISTS idx_llmwatch_facts_client ON llmwatch_facts(client_id) WHERE active = TRUE;

ALTER TABLE llmwatch_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full llmwatch_facts" ON llmwatch_facts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Auth read llmwatch_facts" ON llmwatch_facts FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE llmwatch_facts IS 'Verifiable facts about each client used for factual accuracy scoring';
COMMENT ON COLUMN llmwatch_facts.fact_key IS 'Short identifier (ex: "fondation", "collaborateurs", "siege")';
COMMENT ON COLUMN llmwatch_facts.fact_value IS 'Expected value (ex: "1977", "20", "Haute-Nendaz")';
COMMENT ON COLUMN llmwatch_facts.category IS 'Optional grouping (ex: "history", "team", "location")';
```

**New API route** `src/app/api/llmwatch/facts/route.ts`:

```typescript
// src/app/api/llmwatch/facts/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("llmwatch_facts")
    .select("*")
    .eq("client_id", clientId)
    .eq("active", true)
    .order("category");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ facts: data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, factKey, factValue, category, sourceUrl } = body;
  if (!clientId || !factKey || !factValue) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("llmwatch_facts")
    .upsert({
      client_id: clientId,
      fact_key: factKey,
      fact_value: factValue,
      category,
      source_url: sourceUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: "client_id,fact_key" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fact: data });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("llmwatch_facts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

**Admin UI**: add a "Facts" tab in the client editor that lets you add/edit/delete fact rows. Implementation left to Claude Code based on existing UI patterns in `admin/page.tsx`.

**Validation**:
1. Apply migration
2. POST 3 facts for one client (e.g., MCVA: fondation=2026, siege=Haute-Nendaz, capital=100000)
3. Re-run a monitoring — verify the judge receives these facts in its prompt
4. Verify `factualClaims` in the response score now contains verdicts

---

## TASK 7 [P1] — Wire multilingue (FR/DE/EN) end-to-end

**Why**: Schema and types support FR/DE/EN, but `monitor.ts` only reads `query.text_fr` and hardcodes `lang: "fr"`. Multilingue is currently dead code.

**File to modify**: `src/lib/monitor.ts`

**Code**:

```typescript
// In runMonitoring(), REPLACE the query loop to iterate over languages:

const LANGUAGES: Lang[] = ["fr", "de", "en"];

for (let rep = 0; rep < config.repetitions; rep++) {
  for (const query of queries) {
    for (const lang of LANGUAGES) {
      const queryText = query[`text_${lang}` as const];
      if (!queryText) continue; // skip languages without text

      const llmResponses = await queryAllLLMs(queryText);
      for (const llmResponse of llmResponses) {
        const scored = await scoreResponse(
          llmResponse, client.name, brandAliases, competitors, knownFacts, lang
        );
        // ... insert raw_results with lang: lang (not hardcoded "fr") ...
        await supabase.from("llmwatch_raw_results").insert({
          // ... other fields ...
          lang: lang, // FIXED
          // ...
        });
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
}
```

**Cost impact**: Multilingue triples the cost when DE+EN are filled. For a Standard run with all 3 languages: 30 queries × 3 langs × 4 LLMs × 3 reps = 1080 responses ≈ **$13**. Recommend defaulting to FR-only and letting the user opt into DE/EN per client.

**Add to `RunLevelConfig`**:
```typescript
languagesEnabled: Lang[]; // default: ["fr"]
```

**Validation**:
1. Add a query with all 3 language texts filled for one test client
2. Run monitoring
3. Verify `llmwatch_raw_results` contains rows with `lang = 'de'` and `lang = 'en'`
4. Verify the judge correctly handles each language

---

## TASK 8 [P1] — Wire competitors from database

**Why**: `monitor.ts` line ~52 has `const competitors: string[] = [];` — hardcoded empty. The `llmwatch_competitors` table is populated via the admin UI but never read by the monitor. The benchmark feature is a Potemkin village.

**File to modify**: `src/lib/monitor.ts`

This is already covered by TASK 3's refactor (we fetch competitors from the table). Verify TASK 3 implementation includes:

```typescript
const competitors = (await supabase
  .from("llmwatch_competitors")
  .select("name")
  .eq("client_id", clientId)
  .eq("active", true)
).data?.map(c => c.name) || [];
```

If TASK 3 was applied correctly, this is already done. **Validation**:
1. Add 3 competitors to a test client via admin UI
2. Run monitoring
3. Verify `competitorMentions` in `responseScores[]` is non-empty when competitors are mentioned

---

## TASK 9 [P1] — Decide fate of orphan CITE components

**Why**: `citeCredibility`, `citeInformation`, `citeTransparency`, `citeExpertise` are calculated and stored but never aggregated into `scoreGeo`. They're orphan code.

**Decision required from Jérôme**: keep them for the dashboard display only, OR remove them entirely.

**Recommendation**: **Remove them.** They duplicate signals already captured by the judge (sentiment, recommendation strength, citation URLs). Keeping them creates confusion about what's actually scored.

**File to modify**: `src/lib/scoring-engine.ts` (already removed in TASK 3 refactor — verify the new ResponseScore interface no longer has these fields).

**SQL cleanup** (optional, only if Jérôme confirms removal):

```sql
-- supabase/migrations/2026-04-08_remove_cite_orphans.sql
ALTER TABLE llmwatch_raw_results
  DROP COLUMN IF EXISTS cite_credibility,
  DROP COLUMN IF EXISTS cite_information,
  DROP COLUMN IF EXISTS cite_transparency,
  DROP COLUMN IF EXISTS cite_expertise;
```

**Stop and ask Jérôme** before applying this DROP migration.

---

## TASK 10 [P2] — Audit log of query changes

**Why**: If a query is modified between two runs, the score can change without traceability. For a "documented and reproducible" product, this is a gap.

**File to add**: `supabase/migrations/2026-04-08_query_history.sql`

```sql
CREATE TABLE IF NOT EXISTS llmwatch_query_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id    UUID REFERENCES llmwatch_queries(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES llmwatch_clients(id),
  text_fr_old TEXT,
  text_fr_new TEXT,
  text_de_old TEXT,
  text_de_new TEXT,
  text_en_old TEXT,
  text_en_new TEXT,
  changed_by  TEXT,
  changed_at  TIMESTAMPTZ DEFAULT now()
);

-- Trigger to auto-log changes
CREATE OR REPLACE FUNCTION log_query_change() RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.text_fr IS DISTINCT FROM NEW.text_fr) OR
     (OLD.text_de IS DISTINCT FROM NEW.text_de) OR
     (OLD.text_en IS DISTINCT FROM NEW.text_en) THEN
    INSERT INTO llmwatch_query_history(
      query_id, client_id,
      text_fr_old, text_fr_new,
      text_de_old, text_de_new,
      text_en_old, text_en_new
    ) VALUES (
      OLD.id, OLD.client_id,
      OLD.text_fr, NEW.text_fr,
      OLD.text_de, NEW.text_de,
      OLD.text_en, NEW.text_en
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_query_change
  BEFORE UPDATE ON llmwatch_queries
  FOR EACH ROW EXECUTE FUNCTION log_query_change();

ALTER TABLE llmwatch_query_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full llmwatch_query_history" ON llmwatch_query_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Auth read llmwatch_query_history" ON llmwatch_query_history FOR SELECT TO authenticated USING (true);
```

**Validation**:
1. Apply migration
2. Modify a query via the admin UI
3. Query `select * from llmwatch_query_history order by changed_at desc limit 1;`
4. Verify the old and new values are captured

---

## TASK 11 [P2] — Verify cron Vercel configuration

**Why**: The route `/api/llmwatch/webhooks/scheduler` exists but it's unclear if it's triggered by cron Vercel. Without a cron, the weekly/monthly/quarterly modes are declarative only.

**File to check / create**: `vercel.json` at project root.

**Expected content**:

```json
{
  "crons": [
    {
      "path": "/api/llmwatch/webhooks/scheduler",
      "schedule": "0 6 * * 1"
    }
  ]
}
```

This runs the scheduler every Monday at 06:00 UTC. Adjust for Swiss time zone if needed (Vercel cron is UTC only).

**Important**: Vercel Hobby plan supports **2 cron jobs maximum**, max **once per day frequency** (no sub-daily crons). Pro plan removes these limits. For weekly monitoring, Hobby is sufficient.

**Validation**:
1. Commit `vercel.json` and push
2. In Vercel dashboard → Project → Settings → Crons, verify the cron is listed
3. Wait for next scheduled execution OR trigger manually via Vercel CLI: `vercel cron trigger`
4. Check Supabase: a new `llmwatch_scores` row should appear for active clients with `monitoring_frequency != 'manual'`

**If cron does NOT exist**: create `vercel.json` with the content above.
**If cron exists but on a different path**: align with the actual route used in code.

---

## Summary table

| Task | Priority | Files touched | Effort | Cost impact |
|---|---|---|---|---|
| 1 — Pin model snapshots | P0 | 1 | 15 min | $0 |
| 2 — Add `model_snapshot` columns | P0 | 3 + SQL | 30 min | $0 |
| 3 — LLM-as-judge | P0 | 3 + new file | 2-3 h | +$0.012/response (~$4.30/Standard run) |
| 4 — Light/Standard/Gold levels | P0 | 4 + SQL | 1.5 h | varies by level |
| 5 — Tokenized brand detection | P0 | 1 | 30 min | $0 |
| 6 — Facts knowledge base | P1 | 3 + SQL | 1.5 h | $0 |
| 7 — Wire multilingue | P1 | 1 | 45 min | ×3 cost if DE+EN enabled |
| 8 — Wire competitors | P1 | 1 (covered by T3) | 0 | $0 |
| 9 — Remove orphan CITE | P1 | 1 + SQL | 15 min | $0 |
| 10 — Query audit log | P2 | SQL | 30 min | $0 |
| 11 — Vercel cron | P2 | 1 | 15 min | $0 |
| **Total** | | | **~7-8 hours** | |

---

## After all tasks complete

**Verification checklist**:
- [ ] Run a full Standard monitoring on one test client
- [ ] Verify `model_snapshot_version` is recorded
- [ ] Verify `score_stddev` is computed and reasonable (< 5 for stable sites)
- [ ] Verify the judge produces sensible verdicts on at least 5 sample responses
- [ ] Verify factual claims are checked against the facts table
- [ ] Verify multilingue works if DE/EN queries are filled
- [ ] Verify competitor mentions are detected
- [ ] Verify query history is logged on edits
- [ ] Verify Vercel cron triggers correctly (or note that it's manual-only for now)

**Expected scoring engine behavior after refactor**:
- Sentiment: nuanced 5-7 levels detected (strong positive, mild positive, neutral, mild negative, strong negative)
- Brand detection: zero false positives on edge cases (substring collisions)
- Factual accuracy: actually measured when facts table is populated
- Reproducibility: stddev < 5 between runs for stable sites (vs. current ±10)

---

## Future enhancements (not in this refactor)

These are out of scope for v2 but worth tracking for v3:
- Per-LLM judge calibration (different prompts for OpenAI vs Anthropic responses)
- A/B testing of judge prompts
- Confidence intervals (bootstrap 1000× resampling)
- Automatic prompt rotation to detect overfit
- Multi-judge consensus (Claude + GPT-4o + Gemini as 3 independent judges, majority vote)
- Real-time monitoring (websocket updates instead of polling)
- Custom scoring weights per client (some care more about sentiment, others about presence)

---

*MCVA Consulting SA — LLM Watch v2 Refactor Spec — 2026-04-08*
*Apply in Claude Code via the recommended prompt at the top of this file.*
*After completion, LLM Watch v1 → v2 with reproducibility, multilingue, and proper scoring.*
