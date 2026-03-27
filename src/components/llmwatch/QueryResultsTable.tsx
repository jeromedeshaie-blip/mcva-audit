"use client";

interface QueryResult {
  id: string;
  query_id: string;
  llm: string;
  lang: string;
  cited: boolean;
  rank: number | null;
  snippet: string | null;
  collected_at: string;
}

interface QueryInfo {
  id: string;
  text_fr: string;
  text_de: string | null;
  text_en: string | null;
}

const LLM_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  gemini: "Gemini",
};

const LANG_LABELS: Record<string, string> = {
  fr: "FR",
  de: "DE",
  en: "EN",
};

export function QueryResultsTable({
  results,
  queries,
}: {
  results: QueryResult[];
  queries: QueryInfo[];
}) {
  const queryMap = new Map(queries.map((q) => [q.id, q]));

  // Group results by query
  const grouped = new Map<string, QueryResult[]>();
  for (const r of results) {
    const key = r.query_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  if (grouped.size === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun résultat détaillé disponible.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([queryId, qResults]) => {
        const query = queryMap.get(queryId);
        const queryLabel = query?.text_fr || queryId.slice(0, 8);

        // Build matrix: LLM x Lang
        const llms = ["openai", "anthropic", "perplexity", "gemini"];
        const langs = ["fr", "de", "en"];

        return (
          <div key={queryId} className="space-y-2">
            <h4 className="text-sm font-medium truncate" title={queryLabel}>
              {queryLabel}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-1.5 border-b font-medium text-muted-foreground">
                      LLM
                    </th>
                    {langs.map((lang) => (
                      <th
                        key={lang}
                        className="text-center p-1.5 border-b font-medium text-muted-foreground"
                      >
                        {LANG_LABELS[lang]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {llms.map((llm) => (
                    <tr key={llm} className="border-b last:border-0">
                      <td className="p-1.5 font-medium">
                        {LLM_LABELS[llm] || llm}
                      </td>
                      {langs.map((lang) => {
                        const result = qResults.find(
                          (r) => r.llm === llm && r.lang === lang
                        );
                        if (!result) {
                          return (
                            <td
                              key={lang}
                              className="text-center p-1.5 text-muted-foreground"
                            >
                              —
                            </td>
                          );
                        }
                        return (
                          <td key={lang} className="text-center p-1.5">
                            {result.cited ? (
                              <span
                                className="inline-flex items-center gap-1 text-green-700"
                                title={result.snippet || ""}
                              >
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                {result.rank ? `#${result.rank}` : "Cité"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-500">
                                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                                Non
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
