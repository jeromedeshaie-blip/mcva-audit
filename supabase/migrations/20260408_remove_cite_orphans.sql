-- 20260408_remove_cite_orphans.sql
-- Task 9: Remove orphan CITE columns from raw_results
-- These were never used in Score GEO™ calculation and are now replaced by judge verdicts

ALTER TABLE llmwatch_raw_results
  DROP COLUMN IF EXISTS cite_credibility,
  DROP COLUMN IF EXISTS cite_information,
  DROP COLUMN IF EXISTS cite_transparency,
  DROP COLUMN IF EXISTS cite_expertise;
