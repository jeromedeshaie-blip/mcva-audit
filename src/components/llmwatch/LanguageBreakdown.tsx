"use client";

import { Progress } from "@/components/ui/progress";

const LANG_LABELS: Record<string, string> = {
  fr: "Français",
  de: "Deutsch",
  en: "English",
};

const LANG_FLAGS: Record<string, string> = {
  fr: "FR",
  de: "DE",
  en: "EN",
};

export function LanguageBreakdown({
  scoreByLang,
}: {
  scoreByLang: Record<string, number>;
}) {
  const langs = ["fr", "de", "en"];

  return (
    <div className="space-y-3">
      {langs.map((lang) => {
        const score = scoreByLang[lang] ?? 0;
        return (
          <div key={lang} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {LANG_FLAGS[lang]}
                </span>
                <span>{LANG_LABELS[lang]}</span>
              </span>
              <span className="font-medium">{score}/100</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        );
      })}
    </div>
  );
}
