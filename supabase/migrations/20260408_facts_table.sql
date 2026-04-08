-- 20260408_facts_table.sql
-- Task 6: Knowledge base for factual accuracy scoring

CREATE TABLE IF NOT EXISTS llmwatch_facts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES llmwatch_clients(id) ON DELETE CASCADE,
  fact_key    TEXT NOT NULL,
  fact_value  TEXT NOT NULL,
  category    TEXT,
  source_url  TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, fact_key)
);

CREATE INDEX IF NOT EXISTS idx_llmwatch_facts_client ON llmwatch_facts(client_id) WHERE active = TRUE;

ALTER TABLE llmwatch_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full llmwatch_facts" ON llmwatch_facts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Auth read llmwatch_facts" ON llmwatch_facts FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE llmwatch_facts IS 'Verifiable facts about each client used for factual accuracy scoring';
COMMENT ON COLUMN llmwatch_facts.fact_key IS 'Short identifier (ex: fondation, collaborateurs, siege)';
COMMENT ON COLUMN llmwatch_facts.fact_value IS 'Expected value (ex: 1977, 20, Haute-Nendaz)';
COMMENT ON COLUMN llmwatch_facts.category IS 'Optional grouping (ex: history, team, location)';
