-- ============================================================
-- Leads (prospects via audit gratuit) + audit public support
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Permettre les audits sans utilisateur (publics)
ALTER TABLE audits ALTER COLUMN created_by DROP NOT NULL;

-- Table leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  company text,
  domain text NOT NULL,
  url text NOT NULL,
  sector text,
  audit_id uuid REFERENCES audits(id) ON DELETE SET NULL,
  converted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_audit ON leads(audit_id);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Service role full access (Inngest + API)
CREATE POLICY "Service role full leads" ON leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read leads (admin dashboard)
CREATE POLICY "Authenticated read leads" ON leads
  FOR SELECT TO authenticated USING (true);
