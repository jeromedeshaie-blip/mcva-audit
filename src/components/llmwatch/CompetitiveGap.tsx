"use client";

interface GapEntry {
  name: string;
  score: number;
  isClient?: boolean;
}

export function CompetitiveGap({
  entries,
  clientName,
}: {
  entries: GapEntry[];
  clientName: string;
}) {
  if (entries.length < 2) return null;

  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const clientEntry = sorted.find((e) => e.isClient);
  const clientScore = clientEntry?.score ?? 0;
  const leader = sorted[0];
  const clientRank = sorted.findIndex((e) => e.isClient) + 1;

  const gapToLeader = clientEntry && !clientEntry.isClient
    ? leader.score - clientScore
    : sorted.length > 1
    ? sorted[1].score - clientScore
    : 0;

  const aheadOf = sorted.filter((e) => !e.isClient && e.score < clientScore);
  const behindOf = sorted.filter((e) => !e.isClient && e.score > clientScore);

  return (
    <div className="space-y-4">
      {/* Position summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold">
            {clientRank}/{sorted.length}
          </div>
          <div className="text-xs text-muted-foreground">Position</div>
        </div>
        <div className="flex-1 space-y-1">
          {clientRank === 1 ? (
            <p className="text-sm text-green-700 font-medium">
              Vous êtes en tête du classement
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {leader.score - clientScore} pts
              </span>{" "}
              de retard sur {leader.name} (leader)
            </p>
          )}
          {aheadOf.length > 0 && (
            <p className="text-xs text-green-600">
              Devant {aheadOf.map((e) => e.name).join(", ")}
            </p>
          )}
          {behindOf.length > 0 && (
            <p className="text-xs text-red-500">
              Derrière {behindOf.map((e) => e.name).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Visual bar chart */}
      <div className="space-y-2">
        {sorted.map((entry) => {
          const maxScore = Math.max(...sorted.map((e) => e.score), 1);
          const width = Math.max((entry.score / maxScore) * 100, 2);
          const isClient = entry.isClient;

          return (
            <div key={entry.name} className="flex items-center gap-2">
              <span
                className={`text-xs w-24 truncate ${
                  isClient ? "font-bold" : ""
                }`}
                title={entry.name}
              >
                {entry.name}
              </span>
              <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                <div
                  className={`h-full rounded-sm transition-all ${
                    isClient ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span
                className={`text-xs w-8 text-right ${
                  isClient ? "font-bold" : "text-muted-foreground"
                }`}
              >
                {entry.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
