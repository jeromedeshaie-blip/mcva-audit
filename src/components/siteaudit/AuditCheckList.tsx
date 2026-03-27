"use client";

import type { SeoCheck } from "@/lib/siteaudit/types";

const STATUS_ICON: Record<string, string> = {
  pass: "✓",
  warn: "⚠",
  fail: "✗",
};

const STATUS_COLOR: Record<string, string> = {
  pass: "text-green-600",
  warn: "text-yellow-600",
  fail: "text-red-600",
};

const STATUS_BG: Record<string, string> = {
  pass: "bg-green-50",
  warn: "bg-yellow-50",
  fail: "bg-red-50",
};

export function AuditCheckList({ checks }: { checks: SeoCheck[] }) {
  const grouped = {
    fail: checks.filter((c) => c.status === "fail"),
    warn: checks.filter((c) => c.status === "warn"),
    pass: checks.filter((c) => c.status === "pass"),
  };

  const allChecks = [...grouped.fail, ...grouped.warn, ...grouped.pass];

  return (
    <div className="space-y-1.5">
      {allChecks.map((check) => (
        <div
          key={check.id}
          className={`flex items-start gap-2 p-2 rounded text-sm ${STATUS_BG[check.status]}`}
        >
          <span className={`font-bold ${STATUS_COLOR[check.status]} shrink-0`}>
            {STATUS_ICON[check.status]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{check.label}</span>
              {check.impact === "geo" && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">
                  GEO
                </span>
              )}
              {check.impact === "both" && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">
                  SEO+GEO
                </span>
              )}
            </div>
            {check.value && (
              <p className="text-xs text-muted-foreground truncate">
                {check.value}
              </p>
            )}
            {check.status !== "pass" && check.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {check.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
