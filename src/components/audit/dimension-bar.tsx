"use client";

interface DimensionBarProps {
  dimensions: Record<string, number>;
  type: "core_eeat" | "cite";
}

const CORE_EEAT_LABELS: Record<string, string> = {
  C: "Clarte contextuelle",
  O: "Optimisation",
  R: "Reputation",
  E: "Engagement",
  Exp: "Experience",
  Ept: "Expertise",
  A: "Autorite",
  T: "Confiance",
};

const CITE_LABELS: Record<string, string> = {
  C: "Credibilite",
  I: "Influence",
  T: "Confiance",
  E: "Engagement",
};

function getBarGradient(score: number): string {
  if (score >= 75) return "from-[#2A9D5C] to-[#34D399]";
  if (score >= 50) return "from-[#8B2C2C] to-[#A53535]";
  if (score >= 25) return "from-[#7A2525] to-[#8B2C2C]";
  return "from-[#6B2020] to-[#8B2C2C]";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-[#2A9D5C]";
  if (score >= 50) return "text-[#A53535]";
  if (score >= 25) return "text-[#A83D33]";
  return "text-[#8B2C2C]";
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
          <div key={key} className="space-y-1.5">
            <div className="flex justify-between text-sm items-baseline">
              <span className="text-muted-foreground">
                <span className="font-mono font-bold text-foreground mr-2 inline-flex items-center justify-center w-8 h-5 rounded bg-muted text-xs">
                  {key}
                </span>
                <span className="ml-1">{labels[key]}</span>
              </span>
              <span className={`font-bold tabular-nums ${getScoreColor(score)}`}>{score}</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(score)} transition-all duration-1000 ease-out`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
