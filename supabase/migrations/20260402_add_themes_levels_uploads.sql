-- Migration: 3 niveaux × 7 thématiques + uploads Semrush/Qwairy
-- Applied: 2026-04-02

CREATE TYPE audit_theme AS ENUM ('seo', 'geo', 'perf', 'a11y', 'rgesn', 'tech', 'contenu');

ALTER TYPE audit_type ADD VALUE IF NOT EXISTS 'pre_audit';
ALTER TYPE audit_type ADD VALUE IF NOT EXISTS 'ultra';

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS theme audit_theme,
  ADD COLUMN IF NOT EXISTS themes audit_theme[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS scraped_html text;

ALTER TABLE audit_scores
  ADD COLUMN IF NOT EXISTS score_perf integer CHECK (score_perf IS NULL OR score_perf BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_a11y integer CHECK (score_a11y IS NULL OR score_a11y BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_rgesn integer CHECK (score_rgesn IS NULL OR score_rgesn BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_tech integer CHECK (score_tech IS NULL OR score_tech BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_contenu integer CHECK (score_contenu IS NULL OR score_contenu BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS score_global integer CHECK (score_global IS NULL OR score_global BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS perf_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS a11y_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rgesn_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tech_data jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contenu_data jsonb DEFAULT '{}';

ALTER TYPE framework_type ADD VALUE IF NOT EXISTS 'perf';
ALTER TYPE framework_type ADD VALUE IF NOT EXISTS 'a11y';
ALTER TYPE framework_type ADD VALUE IF NOT EXISTS 'rgesn';
ALTER TYPE framework_type ADD VALUE IF NOT EXISTS 'tech';
ALTER TYPE framework_type ADD VALUE IF NOT EXISTS 'contenu';

CREATE TABLE IF NOT EXISTS audit_uploads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('semrush', 'qwairy', 'pagespeed')),
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  parsed_data jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsing', 'parsed', 'error')),
  error_message text,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_uploads_audit ON audit_uploads(audit_id);

ALTER TABLE audit_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read uploads" ON audit_uploads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert uploads" ON audit_uploads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Service role full access uploads" ON audit_uploads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Auto-generate audit reference
CREATE OR REPLACE FUNCTION generate_audit_reference()
RETURNS trigger AS $$
DECLARE
  year_str text;
  seq_num integer;
  prefix text;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM '\d+$') AS integer)), 0) + 1
  INTO seq_num FROM audits WHERE reference LIKE 'AUDIT-' || year_str || '-%';
  IF NEW.audit_type = 'pre_audit' THEN prefix := 'PRE';
  ELSE prefix := 'AUDIT';
  END IF;
  NEW.reference := prefix || '-' || year_str || '-' || LPAD(seq_num::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_reference ON audits;
CREATE TRIGGER trg_audit_reference
  BEFORE INSERT ON audits FOR EACH ROW
  WHEN (NEW.reference IS NULL)
  EXECUTE FUNCTION generate_audit_reference();
