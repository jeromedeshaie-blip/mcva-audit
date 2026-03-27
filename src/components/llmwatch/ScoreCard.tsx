"use client";

interface ScoreCardProps {
  label: string;
  value: number | string;
  delta?: number;
  unit?: string;
  size?: "sm" | "lg";
}

export function ScoreCard({ label, value, delta, unit, size = "sm" }: ScoreCardProps) {
  const deltaColor =
    delta === undefined
      ? ""
      : delta > 0
        ? "text-green-700"
        : delta < 0
          ? "text-red-700"
          : "text-muted-foreground";
  const deltaSign = delta !== undefined && delta > 0 ? "+" : "";

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className={`font-black ${size === "lg" ? "text-5xl" : "text-3xl"}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {delta !== undefined && (
        <p className={`text-xs font-semibold mt-1 ${deltaColor}`}>
          {deltaSign}{delta} pts
        </p>
      )}
    </div>
  );
}
