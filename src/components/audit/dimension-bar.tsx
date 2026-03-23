"use client";

interface DimensionBarProps {
  dimensions: Record<string, number>;
  type: "core_eeat" | "cite";
}

const CORE_EEAT_LABELS: Record<string, string> = {
  C: "Clarté contextuelle",
  O: "Optimisation",
  R: "Réputation",
  E: "Engagement",
  Exp: "Expérience",
  Ept: "Expertise",
  A: "Autorité",
  T: "Confiance",
};

const CITE_LABELS: Record<string, string> = {
  C: "Crédibilité",
  I: "Influence",
  T: "Confiance",
  E: "Engagement",
};

function getBarColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  if (score >= 25) return "bg-orange-500";
  return "bg-red-500";
}

export function DimensionBar({ dimensions, type }: DimensionBarProps) {
  const labels = type === "core_eeat" ? CORE_EEAT_LABELS : CITE_LABELS;
  const orderedKeys =
    type === "core_eeat"
      ? ["C", "O", "R", "E", "Exp", "Ept", "A", "T"]
      : ["C", "I", "T", "E"];

  return (
    <div className="space-y-3">
      {orderedKeys.map((key) => {
        const score = dimensions[key] ?? 0;
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                <span className="font-mono font-bold text-foreground mr-2">
                  {key}
                </span>
                {labels[key]}
              </span>
              <span className="font-bold">{score}/100</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${getBarColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
