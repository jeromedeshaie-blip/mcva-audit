import type { ReadabilityData } from "./types";

function detectLanguage(text: string): "fr" | "de" | "en" {
  const frWords = [
    "les", "des", "une", "pour", "dans", "avec", "vous", "nous", "votre", "notre",
  ];
  const deWords = [
    "die", "der", "das", "und", "für", "mit", "sie", "ihr", "ihre", "wir",
  ];
  const words = text.toLowerCase().split(/\s+/);

  const frScore = words.filter((w) => frWords.includes(w)).length;
  const deScore = words.filter((w) => deWords.includes(w)).length;

  if (deScore > frScore && deScore > 5) return "de";
  if (frScore > 5) return "fr";
  return "en";
}

function countSyllables(word: string, lang: "fr" | "de" | "en"): number {
  const vowels =
    lang === "de"
      ? /[aeiouäöüy]/gi
      : /[aeiouéèêëàâùûîïôy]/gi;
  const matches = word.match(vowels);
  return Math.max(1, matches?.length ?? 1);
}

export function analyzeReadability(
  text: string,
  keywords: string[] = []
): ReadabilityData {
  const lang = detectLanguage(text);

  const cleanText = text.replace(/\s+/g, " ").trim();
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  const sentences = cleanText
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 10);

  if (words.length < 50) {
    return {
      flesch_score: 0,
      flesch_level: "Contenu insuffisant pour analyse",
      lang_detected: lang,
      avg_sentence_length: 0,
      avg_word_length: 0,
      keyword_density: {},
      word_count: words.length,
    };
  }

  const avgSentenceLength = words.length / Math.max(sentences.length, 1);
  const avgSyllables =
    words.reduce((sum, w) => sum + countSyllables(w, lang), 0) / words.length;
  const avgWordLength =
    words.reduce((sum, w) => sum + w.length, 0) / words.length;

  // Formule Flesch adaptée FR (Kandel & Moles 1958)
  const fleschScore =
    lang === "fr"
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              207 - 1.015 * avgSentenceLength - 73.6 * avgSyllables
            )
          )
        )
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllables
            )
          )
        );

  const fleschLevel =
    fleschScore >= 70
      ? "Très facile à lire"
      : fleschScore >= 60
      ? "Facile"
      : fleschScore >= 50
      ? "Assez facile"
      : fleschScore >= 40
      ? "Standard"
      : fleschScore >= 30
      ? "Assez difficile"
      : "Difficile — à simplifier";

  const keyword_density: Record<string, number> = {};
  const textLower = cleanText.toLowerCase();
  for (const kw of keywords) {
    const regex = new RegExp(kw.toLowerCase(), "g");
    const matches = textLower.match(regex);
    if (matches) {
      keyword_density[kw] =
        Math.round((matches.length / words.length) * 100 * 10) / 10;
    }
  }

  return {
    flesch_score: fleschScore,
    flesch_level: fleschLevel,
    lang_detected: lang,
    avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
    avg_word_length: Math.round(avgWordLength * 10) / 10,
    keyword_density,
    word_count: words.length,
  };
}
