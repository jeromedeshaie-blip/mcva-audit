"use client";

import { Badge } from "@/components/ui/badge";

interface BenchmarkEntry {
  name: string;
  score: number;
  delta?: number;
  isClient?: boolean;
}

interface BenchmarkTableProps {
  entries: BenchmarkEntry[];
  clientName: string;
}

export function BenchmarkTable({ entries, clientName }: BenchmarkTableProps) {
  const sorted = [...entries].sort((a, b) => b.score - a.score);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-semibold w-12">#</th>
            <th className="text-left p-3 font-semibold">Entreprise</th>
            <th className="text-center p-3 font-semibold w-24">Score</th>
            <th className="text-center p-3 font-semibold w-24">Variation</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, idx) => {
            const isClient = entry.name === clientName || entry.isClient;
            return (
              <tr
                key={entry.name}
                className={`border-b ${isClient ? "bg-primary/5 font-semibold" : ""}`}
              >
                <td className="p-3 text-muted-foreground font-bold">{idx + 1}</td>
                <td className="p-3">
                  {entry.name}
                  {isClient && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Vous
                    </Badge>
                  )}
                </td>
                <td className="text-center p-3">
                  <span className={`font-bold ${entry.score >= 50 ? "text-green-600" : entry.score >= 25 ? "text-amber-600" : "text-red-600"}`}>
                    {entry.score}
                  </span>
                </td>
                <td className="text-center p-3">
                  {entry.delta !== undefined && (
                    <span className={`text-xs font-semibold ${entry.delta > 0 ? "text-green-600" : entry.delta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                      {entry.delta > 0 ? "+" : ""}{entry.delta}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
