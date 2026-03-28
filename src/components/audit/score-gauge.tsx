"use client";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  // MCVA spectrum: from deep Swiss Red (low) → Coral (mid) → success green (high)
  if (score >= 75) return "#2A9D5C"; // vert succes
  if (score >= 50) return "#D4553A"; // coral MCVA
  if (score >= 25) return "#A83D33"; // rouge cuivre
  return "#8B2C2C"; // Swiss Red profond
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

  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;
  const color = getScoreColor(clampedScore);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          width={width}
          height={width}
          className="-rotate-90"
          role="img"
          aria-label={`${label}: ${clampedScore} sur 100 — ${getScoreLabel(clampedScore)}`}
        >
          <defs>
            <linearGradient id={`gauge-grad-${label.replace(/\s/g, "")}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/60"
          />
          {/* Score arc */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={`url(#gauge-grad-${label.replace(/\s/g, "")})`}
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
            className="rotate-90 origin-center fill-foreground"
            style={{ fontSize, fontFamily: "var(--font-heading)", fontWeight: 700 }}
          >
            {clampedScore}
          </text>
        </svg>
      </div>
      <div className="text-center">
        <p className="font-heading font-semibold text-sm">{label}</p>
        <p className="text-xs font-medium" style={{ color }}>
          {getScoreLabel(score)}
        </p>
      </div>
    </div>
  );
}
