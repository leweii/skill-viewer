-- Skill Viewer DB Schema (PostgreSQL / RDS)

CREATE TABLE IF NOT EXISTS skills (
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

CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, language)
);

CREATE INDEX IF NOT EXISTS idx_skills_repo ON skills(repo);
CREATE INDEX IF NOT EXISTS idx_summaries_skill_lang ON summaries(skill_id, language);
CREATE INDEX IF NOT EXISTS idx_summaries_created ON summaries(created_at);
