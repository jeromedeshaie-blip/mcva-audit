import Anthropic from "@anthropic-ai/sdk";
import type { GeoProvider } from "./geo-provider";
import type { GeoData, AIModelResult } from "@/types/audit";

/**
 * DirectAIGeoProvider — Palier 1 (Construction)
 *
 * Mesure la visibilité IA en interrogeant directement 4 modèles :
 * - Claude (Anthropic API)
 * - GPT-4o (OpenAI API)
 * - Perplexity (Perplexity API)
 * - Gemini (Google AI API)
 *
 * Pour chaque modèle, on pose 5 questions sectorielles et on détecte
 * si la marque/domaine est cité dans les réponses.
 *
 * Coût estimé : ~$0.02-0.05 par audit.
 */
export class DirectAIGeoProvider implements GeoProvider {
  readonly name = "direct_ai" as const;

  async getAIVisibility(
    brand: string,
    sector: string,
    domain: string
  ): Promise<GeoData> {
    const questions = generateSectorQuestions(brand, sector);

    // Query available models in parallel
    const modelResults = await Promise.allSettled([
      this.queryClaude(brand, domain, questions),
      this.queryOpenAI(brand, domain, questions),
      // Perplexity and Gemini can be added when API keys are available
    ]);

    const results: AIModelResult[] = modelResults
      .filter(
        (r): r is PromiseFulfilledResult<AIModelResult> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    const mentionedCount = results.filter((r) => r.mentioned).length;
    const totalModels = results.length;

    // Calculate AI visibility score (0-100)
    const visibilityScore =
      totalModels > 0 ? Math.round((mentionedCount / totalModels) * 100) : 0;

    // Determine overall sentiment
    const sentiments = results.map((r) => r.sentiment);
    const overallSentiment = determineSentiment(sentiments);

    return {
      ai_visibility_score: visibilityScore,
      models_tested: results,
      brand_mentioned: mentionedCount > 0,
      brand_sentiment: overallSentiment,
      citation_count: mentionedCount,
      models_coverage: totalModels,
    };
  }

  async getBrandPerception(
    brand: string,
    sector: string
  ): Promise<{
    sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
    summary: string;
  }> {
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `En tant qu'expert en réputation digitale, analyse la perception de la marque "${brand}" dans le secteur "${sector}".

Réponds en JSON avec:
- sentiment: "positive", "neutral", "negative" ou "not_mentioned"
- summary: une phrase résumant la perception (en français)

Si tu ne connais pas cette marque, utilise "not_mentioned" comme sentiment.`,
        },
      ],
    });

    try {
      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sentiment: parsed.sentiment || "not_mentioned",
          summary: parsed.summary || "Perception non déterminée.",
        };
      }
    } catch {
      // fallback
    }

    return {
      sentiment: "not_mentioned",
      summary: "Impossible d'analyser la perception de la marque.",
    };
  }

  private async queryClaude(
    brand: string,
    domain: string,
    questions: string[]
  ): Promise<AIModelResult> {
    const anthropic = new Anthropic();

    const prompt = questions
      .map((q, i) => `Question ${i + 1}: ${q}`)
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Réponds à ces questions de manière concise et factuelle:\n\n${prompt}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const mentioned =
      text.toLowerCase().includes(brand.toLowerCase()) ||
      text.toLowerCase().includes(domain.toLowerCase());

    return {
      model: "claude",
      mentioned,
      citation_text: mentioned ? extractCitation(text, brand, domain) : null,
      sentiment: mentioned ? analyzeSentiment(text, brand) : "not_mentioned",
      context: mentioned ? extractContext(text, brand, domain) : null,
    };
  }

  private async queryOpenAI(
    brand: string,
    domain: string,
    questions: string[]
  ): Promise<AIModelResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        model: "gpt-4o",
        mentioned: false,
        citation_text: null,
        sentiment: "not_mentioned",
        context: null,
      };
    }

    const prompt = questions
      .map((q, i) => `Question ${i + 1}: ${q}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: `Réponds à ces questions de manière concise et factuelle:\n\n${prompt}`,
          },
        ],
        max_tokens: 1500,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const mentioned =
      text.toLowerCase().includes(brand.toLowerCase()) ||
      text.toLowerCase().includes(domain.toLowerCase());

    return {
      model: "gpt-4o",
      mentioned,
      citation_text: mentioned ? extractCitation(text, brand, domain) : null,
      sentiment: mentioned ? analyzeSentiment(text, brand) : "not_mentioned",
      context: mentioned ? extractContext(text, brand, domain) : null,
    };
  }
}

// --- Helpers ---

function generateSectorQuestions(brand: string, sector: string): string[] {
  return [
    `Quelles sont les meilleures entreprises dans le secteur ${sector} en France ?`,
    `Qui sont les leaders du ${sector} en Suisse et en France ?`,
    `Recommande-moi une entreprise de ${sector} fiable et reconnue.`,
    `Que penses-tu de ${brand} dans le secteur ${sector} ?`,
    `Quels sont les acteurs innovants du ${sector} ?`,
  ];
}

function extractCitation(
  text: string,
  brand: string,
  domain: string
): string | null {
  const lines = text.split(/[.\n]/);
  const relevant = lines.find(
    (line) =>
      line.toLowerCase().includes(brand.toLowerCase()) ||
      line.toLowerCase().includes(domain.toLowerCase())
  );
  return relevant?.trim() || null;
}

function analyzeSentiment(
  text: string,
  brand: string
): "positive" | "neutral" | "negative" {
  // Simple heuristic — in production, use LLM for better analysis
  const brandContext = text
    .toLowerCase()
    .split(/[.\n]/)
    .filter((s) => s.includes(brand.toLowerCase()))
    .join(" ");

  const positiveWords = [
    "leader",
    "excellent",
    "reconnu",
    "fiable",
    "innovant",
    "recommandé",
    "qualité",
    "expert",
    "référence",
    "performant",
  ];
  const negativeWords = [
    "problème",
    "critique",
    "faible",
    "insuffisant",
    "médiocre",
    "décevant",
    "controversé",
  ];

  const posCount = positiveWords.filter((w) =>
    brandContext.includes(w)
  ).length;
  const negCount = negativeWords.filter((w) =>
    brandContext.includes(w)
  ).length;

  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

function extractContext(
  text: string,
  brand: string,
  domain: string
): string | null {
  const sentences = text.split(/[.\n]/).filter((s) => s.trim().length > 10);
  const relevant = sentences.find(
    (s) =>
      s.toLowerCase().includes(brand.toLowerCase()) ||
      s.toLowerCase().includes(domain.toLowerCase())
  );
  return relevant?.trim().slice(0, 200) || null;
}

function determineSentiment(
  sentiments: Array<
    "positive" | "neutral" | "negative" | "not_mentioned"
  >
): "positive" | "neutral" | "negative" | "not_mentioned" {
  const counted = sentiments.filter((s) => s !== "not_mentioned");
  if (counted.length === 0) return "not_mentioned";

  const pos = counted.filter((s) => s === "positive").length;
  const neg = counted.filter((s) => s === "negative").length;

  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}
