-- ============================================================
-- Benchmarks sectoriels — tables et politiques RLS
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Benchmark : groupe nommé de domaines dans un sous-secteur + périmètre géo
CREATE TABLE IF NOT EXISTS benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sub_category text NOT NULL,
  geographic_scope text NOT NULL DEFAULT 'suisse',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'completed', 'error')),
  domains_count integer NOT NULL DEFAULT 0,
  completed_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_created_by ON benchmarks(created_by);
CREATE INDEX IF NOT EXISTS idx_benchmarks_status ON benchmarks(status);

-- Domaines dans un benchmark
CREATE TABLE IF NOT EXISTS benchmark_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_id uuid NOT NULL REFERENCES benchmarks(id) ON DELETE CASCADE,
  domain text NOT NULL,
  url text NOT NULL,
  audit_id uuid REFERENCES audits(id) ON DELETE SET NULL,
  rank_seo integer,
  rank_geo integer,
  score_seo integer,
  score_geo integer,
  UNIQUE(benchmark_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_benchmark_domains_benchmark ON benchmark_domains(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_domains_audit ON benchmark_domains(audit_id);

-- RLS
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_domains ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les utilisateurs authentifiés
CREATE POLICY "Authenticated read benchmarks" ON benchmarks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read benchmark_domains" ON benchmark_domains
  FOR SELECT TO authenticated USING (true);

-- Insertion : propres benchmarks
CREATE POLICY "Users insert own benchmarks" ON benchmarks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Service role : accès complet (pour Inngest)
CREATE POLICY "Service role full benchmarks" ON benchmarks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full benchmark_domains" ON benchmark_domains
  FOR ALL TO service_role USING (true) WITH CHECK (true);
