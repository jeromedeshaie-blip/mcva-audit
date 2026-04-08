-- 20260408_query_history.sql
-- Task 10: Audit log for query text changes (trigger-based)

CREATE TABLE IF NOT EXISTS llmwatch_query_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_id    UUID REFERENCES llmwatch_queries(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES llmwatch_clients(id),
  text_fr_old TEXT,
  text_fr_new TEXT,
  text_de_old TEXT,
  text_de_new TEXT,
  text_en_old TEXT,
  text_en_new TEXT,
  changed_by  TEXT,
  changed_at  TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION log_query_change() RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.text_fr IS DISTINCT FROM NEW.text_fr) OR
     (OLD.text_de IS DISTINCT FROM NEW.text_de) OR
     (OLD.text_en IS DISTINCT FROM NEW.text_en) THEN
    INSERT INTO llmwatch_query_history(
      query_id, client_id,
      text_fr_old, text_fr_new,
      text_de_old, text_de_new,
      text_en_old, text_en_new
    ) VALUES (
      OLD.id, OLD.client_id,
      OLD.text_fr, NEW.text_fr,
      OLD.text_de, NEW.text_de,
      OLD.text_en, NEW.text_en
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_query_change ON llmwatch_queries;
CREATE TRIGGER trg_log_query_change
  BEFORE UPDATE ON llmwatch_queries
  FOR EACH ROW EXECUTE FUNCTION log_query_change();

ALTER TABLE llmwatch_query_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full llmwatch_query_history" ON llmwatch_query_history FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Auth read llmwatch_query_history" ON llmwatch_query_history FOR SELECT TO authenticated USING (true);
