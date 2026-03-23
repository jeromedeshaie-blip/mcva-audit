"use client";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#22c55e"; // green
  if (score >= 50) return "#f59e0b"; // amber
  if (score >= 25) return "#f97316"; // orange
  return "#ef4444"; // red
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Bon";
  if (score >= 50) return "Moyen";
  if (score >= 25) return "Faible";
  return "Critique";
}

export function ScoreGauge({ score, label, size = "md" }: ScoreGaugeProps) {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score || 0)));
  const sizes = {
    sm: { width: 100, stroke: 8, fontSize: 20, labelSize: 10 },
    md: { width: 140, stroke: 10, fontSize: 28, labelSize: 12 },
    lg: { width: 180, stroke: 12, fontSize: 36, labelSize: 14 },
  };

  const { width, stroke, fontSize, labelSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;
  const color = getScoreColor(clampedScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={width}
        height={width}
        className="-rotate-90"
        role="img"
        aria-label={`${label}: ${clampedScore} sur 100 — ${getScoreLabel(clampedScore)}`}
      >
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted"
        />
        {/* Score arc */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        {/* Score text */}
        <text
          x={width / 2}
          y={width / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 origin-center fill-foreground font-bold"
          style={{ fontSize }}
        >
          {clampedScore}
        </text>
      </svg>
      <div className="text-center">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs" style={{ color }}>
          {getScoreLabel(score)}
        </p>
      </div>
    </div>
  );
}
