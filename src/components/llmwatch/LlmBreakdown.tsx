"use client";

import { Progress } from "@/components/ui/progress";

const LLM_LABELS: Record<string, { label: string; color: string }> = {
  openai: { label: "ChatGPT", color: "bg-green-600" },
  perplexity: { label: "Perplexity", color: "bg-blue-600" },
  anthropic: { label: "Claude", color: "bg-orange-600" },
  gemini: { label: "Gemini", color: "bg-purple-600" },
};

interface LlmBreakdownProps {
  scoreByLlm: Record<string, number>;
}

export function LlmBreakdown({ scoreByLlm }: LlmBreakdownProps) {
  const llms = Object.entries(LLM_LABELS);

  return (
    <div className="space-y-3">
      {llms.map(([key, { label }]) => {
        const score = scoreByLlm[key] ?? 0;
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="font-bold">{score}/100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}
