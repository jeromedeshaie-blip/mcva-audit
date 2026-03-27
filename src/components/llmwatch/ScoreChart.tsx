"use client";

interface ScoreChartProps {
  data: Array<{ week: string; score: number }>;
  height?: number;
}

/**
 * Simple SVG line chart for score evolution.
 * No external dependency — lightweight inline chart.
 */
export function ScoreChart({ data, height = 200 }: ScoreChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        Pas encore de donnees
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxScore = Math.max(...data.map((d) => d.score), 100);
  const minScore = 0;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + (1 - (d.score - minScore) / (maxScore - minScore)) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Area fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((val) => {
        const y = padding.top + (1 - val / maxScore) * chartH;
        return (
          <g key={val}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E5E7EB" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9CA3AF">
              {val}
            </text>
          </g>
        );
      })}

      {/* Area */}
      <path d={areaD} fill="rgba(139, 44, 44, 0.08)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke="#8B2C2C" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#8B2C2C" stroke="white" strokeWidth={2} />
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => {
        // Show every other label if too many
        if (data.length > 8 && i % 2 !== 0) return null;
        const label = new Date(p.week).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        return (
          <text key={i} x={p.x} y={height - 5} textAnchor="middle" fontSize={9} fill="#9CA3AF">
            {label}
          </text>
        );
      })}
    </svg>
  );
}
