"use client";

function getColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function getBg(score: number): string {
  if (score >= 80) return "bg-green-50 border-green-200";
  if (score >= 60) return "bg-yellow-50 border-yellow-200";
  if (score >= 40) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

export function AuditScoreCard({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon?: string;
}) {
  return (
    <div className={`border rounded-lg p-4 ${getBg(score)}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </span>
      </div>
      <div className={`text-3xl font-bold mt-1 ${getColor(score)}`}>
        {score}
        <span className="text-sm font-normal text-muted-foreground">/100</span>
      </div>
    </div>
  );
}
