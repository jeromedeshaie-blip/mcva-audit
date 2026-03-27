"use client";

import type { LlmWatchRecommendation } from "@/lib/llmwatch/types";

const CATEGORY_LABELS: Record<string, string> = {
  content: "Contenu",
  technical: "Technique",
  brand: "Marque",
  competitive: "Concurrence",
  multilingual: "Multilingue",
};

const CATEGORY_COLORS: Record<string, string> = {
  content: "bg-blue-100 text-blue-800",
  technical: "bg-purple-100 text-purple-800",
  brand: "bg-amber-100 text-amber-800",
  competitive: "bg-red-100 text-red-800",
  multilingual: "bg-green-100 text-green-800",
};

const IMPACT_LABELS: Record<string, string> = {
  high: "Impact fort",
  medium: "Impact moyen",
  low: "Impact faible",
};

const EFFORT_LABELS: Record<string, string> = {
  low: "Effort faible",
  medium: "Effort moyen",
  high: "Effort élevé",
};

const PRIORITY_ICONS: Record<number, string> = {
  1: "🔴",
  2: "🟠",
  3: "🟡",
};

export function RecommendationCard({
  recommendation,
}: {
  recommendation: LlmWatchRecommendation;
}) {
  const { priority, category, title, description, impact, effort } = recommendation;

  return (
    <div className="border rounded-lg p-4 space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{PRIORITY_ICONS[priority] || "⚪"}</span>
          <h4 className="font-medium text-sm">{title}</h4>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
            CATEGORY_COLORS[category] || "bg-gray-100 text-gray-800"
          }`}
        >
          {CATEGORY_LABELS[category] || category}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex gap-3 text-xs text-muted-foreground">
        {impact && <span>{IMPACT_LABELS[impact]}</span>}
        {effort && (
          <>
            <span>·</span>
            <span>{EFFORT_LABELS[effort]}</span>
          </>
        )}
      </div>
    </div>
  );
}
