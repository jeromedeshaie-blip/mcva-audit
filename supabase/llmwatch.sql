-- ============================================================
-- LLM Watch — Migration v1.0
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Table clients LLM Watch
CREATE TABLE IF NOT EXISTS llmwatch_clients (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  sector        TEXT,
  location      TEXT,
  plan          TEXT DEFAULT 'business',
  contact_email TEXT NOT NULL,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Requêtes métier configurées par client
CREATE TABLE IF NOT EXISTS llmwatch_queries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES llmwatch_clients(id) ON DELETE CASCADE,
  text_fr     TEXT NOT NULL,
  text_de     TEXT,
  text_en     TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Concurrents à suivre par client
CREATE TABLE IF NOT EXISTS llmwatch_competitors (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES llmwatch_clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  keywords    TEXT[],
  active      BOOLEAN DEFAULT TRUE
);

-- Résultats bruts de collecte LLM
CREATE TABLE IF NOT EXISTS llmwatch_raw_results (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID REFERENCES llmwatch_clients(id) ON DELETE CASCADE,
  query_id      UUID REFERENCES llmwatch_queries(id),
  llm           TEXT NOT NULL,
  lang          TEXT NOT NULL,
  response_raw  TEXT,
  cited         BOOLEAN DEFAULT FALSE,
  rank          INTEGER,
  snippet       TEXT,
  collected_at  TIMESTAMPTZ DEFAULT now()
);

-- Scores calculés hebdomadairement
CREATE TABLE IF NOT EXISTS llmwatch_scores (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID REFERENCES llmwatch_clients(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  score           NUMERIC(5,2) NOT NULL,
  score_by_llm    JSONB,
  score_by_lang   JSONB,
  citation_rate   NUMERIC(5,2),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, week_start)
);

-- Scores concurrents
CREATE TABLE IF NOT EXISTS llmwatch_competitor_scores (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id   UUID REFERENCES llmwatch_competitors(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES llmwatch_clients(id),
  week_start      DATE NOT NULL,
  score           NUMERIC(5,2),
  score_by_llm    JSONB,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(competitor_id, week_start)
);

-- Rapports PDF générés
CREATE TABLE IF NOT EXISTS llmwatch_reports (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   UUID REFERENCES llmwatch_clients(id) ON DELETE CASCADE,
  period      TEXT NOT NULL,
  pdf_url     TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, period)
);

-- Alertes émises
CREATE TABLE IF NOT EXISTS llmwatch_alerts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       UUID REFERENCES llmwatch_clients(id),
  competitor_id   UUID REFERENCES llmwatch_competitors(id),
  alert_type      TEXT,
  delta           NUMERIC(5,2),
  llm             TEXT,
  message         TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index performances
CREATE INDEX IF NOT EXISTS idx_llmwatch_scores_client ON llmwatch_scores(client_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_llmwatch_raw_results_client ON llmwatch_raw_results(client_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_llmwatch_raw_results_week ON llmwatch_raw_results(client_id, llm, lang);
CREATE INDEX IF NOT EXISTS idx_llmwatch_competitor_scores_client ON llmwatch_competitor_scores(client_id, week_start DESC);

-- RLS
ALTER TABLE llmwatch_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE llmwatch_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE llmwatch_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE llmwatch_raw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE llmwatch_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE llmwatch_competitor_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE llmwatch_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE llmwatch_alerts ENABLE ROW LEVEL SECURITY;

-- Service role : accès complet (pour les jobs et l'admin)
CREATE POLICY "Service role full llmwatch_clients" ON llmwatch_clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full llmwatch_queries" ON llmwatch_queries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full llmwatch_competitors" ON llmwatch_competitors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full llmwatch_raw_results" ON llmwatch_raw_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full llmwatch_scores" ON llmwatch_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full llmwatch_competitor_scores" ON llmwatch_competitor_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full llmwatch_reports" ON llmwatch_reports FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full llmwatch_alerts" ON llmwatch_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users : lecture seule (pour le dashboard client)
CREATE POLICY "Auth read llmwatch_scores" ON llmwatch_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read llmwatch_raw_results" ON llmwatch_raw_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read llmwatch_competitor_scores" ON llmwatch_competitor_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read llmwatch_reports" ON llmwatch_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read llmwatch_alerts" ON llmwatch_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read llmwatch_clients" ON llmwatch_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read llmwatch_competitors" ON llmwatch_competitors FOR SELECT TO authenticated USING (true);
