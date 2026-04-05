// src/lib/llm-providers.ts
// Interface unifiée pour interroger les 4 LLMs du Score GEO™

export interface LLMResponse {
  provider: string;
  model: string;
  query: string;
  response: string;
  tokensUsed: number;
  latencyMs: number;
  costUsd: number;
}

interface ProviderConfig {
  name: string;
  model: string;
  apiKey: string;
  endpoint: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: "openai",
    model: "gpt-4o",
    apiKey: process.env.OPENAI_API_KEY!,
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
  {
    name: "anthropic",
    model: "claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY!,
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  {
    name: "perplexity",
    model: "sonar-pro",
    apiKey: process.env.PERPLEXITY_API_KEY!,
    endpoint: "https://api.perplexity.ai/chat/completions",
  },
  {
    name: "gemini",
    model: "gemini-2.0-flash",
    apiKey: process.env.GEMINI_API_KEY!,
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  },
];

// ----- Appels par provider -----

async function callOpenAI(
  config: ProviderConfig,
  query: string
): Promise<LLMResponse> {
  const start = Date.now();
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: query }],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI error: ${JSON.stringify(data)}`);

  const usage = data.usage || {};
  return {
    provider: config.name,
    model: config.model,
    query,
    response: data.choices?.[0]?.message?.content || "",
    tokensUsed: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    latencyMs: Date.now() - start,
    costUsd: estimateCost("openai", usage.prompt_tokens, usage.completion_tokens),
  };
}

async function callAnthropic(
  config: ProviderConfig,
  query: string
): Promise<LLMResponse> {
  const start = Date.now();
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1500,
      messages: [{ role: "user", content: query }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic error: ${JSON.stringify(data)}`);

  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  return {
    provider: config.name,
    model: config.model,
    query,
    response: data.content?.[0]?.text || "",
    tokensUsed: inputTokens + outputTokens,
    latencyMs: Date.now() - start,
    costUsd: estimateCost("anthropic", inputTokens, outputTokens),
  };
}

async function callPerplexity(
  config: ProviderConfig,
  query: string
): Promise<LLMResponse> {
  const start = Date.now();
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: query }],
      max_tokens: 1500,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Perplexity error: ${JSON.stringify(data)}`);

  const usage = data.usage || {};
  return {
    provider: config.name,
    model: config.model,
    query,
    response: data.choices?.[0]?.message?.content || "",
    tokensUsed: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    latencyMs: Date.now() - start,
    costUsd: estimateCost("perplexity", usage.prompt_tokens, usage.completion_tokens),
  };
}

async function callGemini(
  config: ProviderConfig,
  query: string
): Promise<LLMResponse> {
  const start = Date.now();
  const url = `${config.endpoint}/${config.model}:generateContent?key=${config.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: query }] }],
      generationConfig: { maxOutputTokens: 1500, temperature: 0.3 },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error: ${JSON.stringify(data)}`);

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = data.usageMetadata || {};
  return {
    provider: config.name,
    model: config.model,
    query,
    response: text,
    tokensUsed:
      (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
    latencyMs: Date.now() - start,
    costUsd: estimateCost(
      "gemini",
      usage.promptTokenCount,
      usage.candidatesTokenCount
    ),
  };
}

// ----- Estimation des coûts (prix approx. avril 2026) -----

function estimateCost(
  provider: string,
  inputTokens: number = 0,
  outputTokens: number = 0
): number {
  const rates: Record<string, { input: number; output: number }> = {
    openai: { input: 2.5 / 1e6, output: 10 / 1e6 },      // GPT-4o
    anthropic: { input: 3 / 1e6, output: 15 / 1e6 },      // Sonnet
    perplexity: { input: 3 / 1e6, output: 15 / 1e6 },     // Sonar Pro
    gemini: { input: 0.075 / 1e6, output: 0.3 / 1e6 },    // Flash
  };
  const rate = rates[provider] || { input: 0, output: 0 };
  return inputTokens * rate.input + outputTokens * rate.output;
}

// ----- Interface publique -----

const CALLERS: Record<
  string,
  (config: ProviderConfig, query: string) => Promise<LLMResponse>
> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  perplexity: callPerplexity,
  gemini: callGemini,
};

/**
 * Interroge un seul LLM avec une requête donnée.
 */
export async function queryLLM(
  providerName: string,
  query: string
): Promise<LLMResponse> {
  const config = PROVIDERS.find((p) => p.name === providerName);
  if (!config) throw new Error(`Provider inconnu: ${providerName}`);

  const caller = CALLERS[providerName];
  if (!caller) throw new Error(`Pas de caller pour: ${providerName}`);

  return caller(config, query);
}

/**
 * Interroge les 4 LLMs en parallèle pour une même requête.
 * Retourne les résultats disponibles (les erreurs sont loguées, pas bloquantes).
 */
export async function queryAllLLMs(query: string): Promise<LLMResponse[]> {
  const results = await Promise.allSettled(
    PROVIDERS.map((p) => queryLLM(p.name, query))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<LLMResponse> => r.status === "fulfilled"
    )
    .map((r) => r.value);
}

export { PROVIDERS };
