-- 20260408_run_levels.sql
-- Task 4: Add run level tracking to scores + default run level to clients
-- Uses existing quality levels: eco, standard, premium, ultra, dryrun

ALTER TABLE llmwatch_clients
ADD COLUMN IF NOT EXISTS default_run_level TEXT DEFAULT 'standard';

ALTER TABLE llmwatch_scores
ADD COLUMN IF NOT EXISTS run_level TEXT,
ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS score_stddev NUMERIC(5,2);

COMMENT ON COLUMN llmwatch_clients.default_run_level IS 'Default quality level for monitoring: eco|standard|premium|ultra|dryrun';
COMMENT ON COLUMN llmwatch_scores.run_level IS 'Quality level used for this score: eco|standard|premium|ultra|dryrun';
COMMENT ON COLUMN llmwatch_scores.run_count IS 'Number of repetitions for this score (1 for eco/standard, 3 for premium/ultra)';
COMMENT ON COLUMN llmwatch_scores.score_stddev IS 'Standard deviation across repetitions, null if run_count=1';
