"use client";

import { Badge } from "@/components/ui/badge";

const LLM_NAMES: Record<string, string> = {
  openai: "ChatGPT",
  perplexity: "Perplexity",
  anthropic: "Claude",
  gemini: "Gemini",
};

const LANG_LABELS: Record<string, string> = {
  fr: "FR",
  de: "DE",
  en: "EN",
};

interface CitationBlockProps {
  llm: string;
  lang: string;
  snippet: string | null;
  rank: number | null;
  cited: boolean;
  collectedAt: string;
}

export function CitationBlock({ llm, lang, snippet, rank, cited, collectedAt }: CitationBlockProps) {
  const date = new Date(collectedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className={`rounded-lg border p-4 ${cited ? "border-green-200 bg-green-50/50" : "border-muted"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={cited ? "default" : "secondary"}>
            {LLM_NAMES[llm] || llm}
          </Badge>
          <Badge variant="outline">{LANG_LABELS[lang] || lang}</Badge>
          {rank && (
            <span className="text-xs font-bold text-primary">
              #{rank}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
      {snippet ? (
        <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
          &ldquo;{snippet}&rdquo;
        </blockquote>
      ) : (
        <p className="text-sm text-muted-foreground">Non cite</p>
      )}
    </div>
  );
}
