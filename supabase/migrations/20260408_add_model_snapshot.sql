-- 20260408_add_model_snapshot.sql
-- Task 2: Traceability — store model snapshot version alongside each score and raw result

ALTER TABLE llmwatch_scores
ADD COLUMN IF NOT EXISTS model_snapshot_version TEXT,
ADD COLUMN IF NOT EXISTS models_used JSONB;

ALTER TABLE llmwatch_raw_results
ADD COLUMN IF NOT EXISTS model_version TEXT;

CREATE INDEX IF NOT EXISTS idx_llmwatch_scores_snapshot
  ON llmwatch_scores(model_snapshot_version);

COMMENT ON COLUMN llmwatch_scores.model_snapshot_version
  IS 'Date string from MODEL_SNAPSHOT_VERSION constant when score was computed';
COMMENT ON COLUMN llmwatch_scores.models_used
  IS 'JSONB: { openai: "gpt-4o-2024-11-20", anthropic: "...", ... }';
COMMENT ON COLUMN llmwatch_raw_results.model_version
  IS 'Exact model string used for this individual LLM call';
