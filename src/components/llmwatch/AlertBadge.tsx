"use client";

import { Badge } from "@/components/ui/badge";

const ALERT_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  competitor_gain: { label: "Concurrent en hausse", variant: "destructive" },
  competitor_loss: { label: "Concurrent en baisse", variant: "secondary" },
  client_drop: { label: "Baisse detectee", variant: "destructive" },
};

interface AlertBadgeProps {
  alertType: string;
  message: string;
  delta: number;
  createdAt: string;
}

export function AlertBadge({ alertType, message, delta, createdAt }: AlertBadgeProps) {
  const config = ALERT_CONFIG[alertType] || { label: alertType, variant: "default" as const };
  const date = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
      <Badge variant={config.variant} className="shrink-0 mt-0.5">
        {config.label}
      </Badge>
      <div className="flex-1">
        <p className="text-sm">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{date}</p>
      </div>
      <span className={`text-sm font-bold ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
        {delta > 0 ? "+" : ""}{delta}
      </span>
    </div>
  );
}
