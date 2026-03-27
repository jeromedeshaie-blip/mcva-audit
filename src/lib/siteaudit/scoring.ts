const DIMENSION_WEIGHTS = {
  seo: 0.35,
  performance: 0.3,
  accessibility: 0.2,
  readability: 0.15,
};

export function computeGlobalScore(scores: {
  seo: number;
  performance: number;
  accessibility: number;
  readability: number;
}): number {
  return Math.round(
    scores.seo * DIMENSION_WEIGHTS.seo +
      scores.performance * DIMENSION_WEIGHTS.performance +
      scores.accessibility * DIMENSION_WEIGHTS.accessibility +
      scores.readability * DIMENSION_WEIGHTS.readability
  );
}

export function accessibilityViolationsToScore(
  violations: {
    impact: "critical" | "serious" | "moderate" | "minor";
    nodes_count: number;
  }[]
): number {
  if (!violations.length) return 100;

  const penalty = violations.reduce((sum, v) => {
    const weights = { critical: 20, serious: 10, moderate: 5, minor: 2 };
    return sum + weights[v.impact] * Math.min(v.nodes_count, 3);
  }, 0);

  return Math.max(0, 100 - penalty);
}

export function readabilityToScore(
  flesch: number,
  wordCount: number
): number {
  if (wordCount < 50) return 20;
  if (wordCount < 200) return 40;
  const base = Math.min(flesch, 100);
  const volumeBonus = Math.min(10, Math.floor(wordCount / 100));
  return Math.min(100, Math.round(base + volumeBonus));
}
