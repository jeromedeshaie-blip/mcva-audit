-- ============================================================
-- MCVA Audit Platform — Database Schema
-- ============================================================
-- Run this in the Supabase SQL editor to set up the database.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --- Custom types ---

CREATE TYPE audit_type AS ENUM ('express', 'full');
CREATE TYPE audit_status AS ENUM ('pending', 'processing', 'completed', 'error');
CREATE TYPE item_status AS ENUM ('pass', 'partial', 'fail');
CREATE TYPE framework_type AS ENUM ('core_eeat', 'cite');
CREATE TYPE priority_type AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE user_role AS ENUM ('analyst', 'bizdev', 'admin');

-- --- Users ---

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'analyst',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- --- Audits ---

CREATE TABLE audits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  url text NOT NULL,
  domain text NOT NULL,
  sector text,
  audit_type audit_type NOT NULL,
  status audit_status NOT NULL DEFAULT 'pending',
  parent_audit_id uuid REFERENCES audits(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_audits_domain ON audits(domain);
CREATE INDEX idx_audits_sector ON audits(sector);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_created_by ON audits(created_by);
CREATE INDEX idx_audits_created_at ON audits(created_at DESC);

-- --- Audit Scores ---

CREATE TABLE audit_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE UNIQUE,
  score_seo integer NOT NULL CHECK (score_seo BETWEEN 0 AND 100),
  score_geo integer NOT NULL CHECK (score_geo BETWEEN 0 AND 100),
  score_core_eeat jsonb NOT NULL DEFAULT '{}',
  score_cite jsonb NOT NULL DEFAULT '{}',
  seo_provider text NOT NULL DEFAULT 'free',
  seo_data jsonb NOT NULL DEFAULT '{}',
  geo_provider text NOT NULL DEFAULT 'direct_ai',
  geo_data jsonb NOT NULL DEFAULT '{}',
  competitors jsonb
);

-- --- Audit Items (CORE-EEAT / CITE) ---

CREATE TABLE audit_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  framework framework_type NOT NULL,
  dimension varchar(3) NOT NULL,
  item_code text NOT NULL,
  item_label text NOT NULL,
  status item_status NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  notes text,
  is_geo_first boolean NOT NULL DEFAULT false,
  is_express_item boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_audit_items_audit ON audit_items(audit_id);
CREATE INDEX idx_audit_items_framework_dimension ON audit_items(audit_id, framework, dimension);

-- --- Audit Actions (Plan d'action) ---

CREATE TABLE audit_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  priority priority_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  impact_points numeric NOT NULL DEFAULT 0,
  effort text NOT NULL,
  category text NOT NULL
);

CREATE INDEX idx_audit_actions_audit ON audit_actions(audit_id);

-- --- Sector Rankings ---

CREATE TABLE sector_rankings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sector text NOT NULL,
  domain text NOT NULL,
  score_seo integer NOT NULL CHECK (score_seo BETWEEN 0 AND 100),
  score_geo integer NOT NULL CHECK (score_geo BETWEEN 0 AND 100),
  rank_seo integer NOT NULL,
  rank_geo integer NOT NULL,
  week_of date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sector, domain, week_of)
);

CREATE INDEX idx_sector_rankings_lookup ON sector_rankings(sector, week_of);

-- --- Row Level Security ---

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_rankings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read everything (internal platform)
CREATE POLICY "Authenticated users can read all" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read audits" ON audits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert audits" ON audits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update own audits" ON audits
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read scores" ON audit_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read items" ON audit_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read actions" ON audit_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read rankings" ON sector_rankings
  FOR SELECT TO authenticated USING (true);

-- Service role can do everything (for Inngest / server-side operations)
CREATE POLICY "Service role full access audits" ON audits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access scores" ON audit_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access items" ON audit_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access actions" ON audit_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access rankings" ON sector_rankings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);
