"use client";

import type { AuditRecommendation } from "@/lib/siteaudit/types";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-l-red-500 bg-red-50",
  high: "border-l-orange-500 bg-orange-50",
  medium: "border-l-yellow-500 bg-yellow-50",
  low: "border-l-blue-500 bg-blue-50",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critique",
  high: "Haute",
  medium: "Moyenne",
  low: "Basse",
};

const DIMENSION_LABELS: Record<string, string> = {
  seo: "SEO",
  performance: "Performance",
  accessibility: "Accessibilité",
  readability: "Lisibilité",
  geo: "GEO / LLM",
};

export function AuditRecommendationCard({
  recommendation,
}: {
  recommendation: AuditRecommendation;
}) {
  const { priority, dimension, title, description, action, impact_points, effort } =
    recommendation;

  return (
    <div
      className={`border-l-4 rounded-r-lg p-4 space-y-2 ${PRIORITY_COLORS[priority]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-sm">{title}</h4>
        <div className="flex gap-1 shrink-0">
          <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded">
            {PRIORITY_LABELS[priority]}
          </span>
          <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded">
            {DIMENSION_LABELS[dimension]}
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="bg-white/60 rounded p-2">
        <p className="text-xs font-medium">Action :</p>
        <p className="text-xs text-muted-foreground">{action}</p>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>+{impact_points} pts estimés</span>
        <span>
          Effort :{" "}
          {effort === "low" ? "faible" : effort === "medium" ? "moyen" : "élevé"}
        </span>
      </div>
    </div>
  );
}
