-- scripts/setup-db.sql
-- Run this in Supabase SQL Editor

-- Skills cache table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo TEXT NOT NULL,
  skill_path TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_content_hash TEXT,
  view_count INT DEFAULT 0,
  collect_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo, skill_path)
);

-- Summary cache table
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, language)
);

-- Users table (for auth integration later)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  license_key TEXT,
  daily_usage INT DEFAULT 0,
  usage_reset_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_repo ON public.skills(repo);
CREATE INDEX IF NOT EXISTS idx_summaries_skill_lang ON public.summaries(skill_id, language);
CREATE INDEX IF NOT EXISTS idx_summaries_created ON public.summaries(created_at);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(skill_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.skills SET view_count = view_count + 1, updated_at = NOW()
  WHERE id = skill_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment collect count
CREATE OR REPLACE FUNCTION increment_collect_count(skill_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.skills SET collect_count = collect_count + 1, updated_at = NOW()
  WHERE id = skill_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (but allow all for now, will restrict later)
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies (permissive for Phase 1)
CREATE POLICY "Allow all on skills" ON public.skills FOR ALL USING (true);
CREATE POLICY "Allow all on summaries" ON public.summaries FOR ALL USING (true);
CREATE POLICY "Allow all on users" ON public.users FOR ALL USING (true);
