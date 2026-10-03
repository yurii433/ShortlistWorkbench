DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY,
  title TEXT,
  job_family TEXT,
  seniority TEXT CHECK (seniority IN ('junior', 'mid', 'senior')),
  country TEXT CHECK (country IN ('DE', 'AT')),
  city TEXT,
  created_at TIMESTAMPTZ
);

CREATE TABLE candidates (
  candidate_id TEXT PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  country TEXT CHECK (country IN ('DE', 'AT')),
  city TEXT,
  years_experience INTEGER,
  preferred_job_family TEXT
);

CREATE TABLE applications (
  application_id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs (job_id),
  candidate_id TEXT REFERENCES candidates (candidate_id),
  created_at TIMESTAMPTZ,
  source TEXT,
  match_score NUMERIC(4, 3) CHECK (match_score >= 0 AND match_score <= 1),
  match_band TEXT CHECK (match_band IN ('low', 'medium', 'high')),
  status TEXT CHECK (status IN ('new', 'in_review', 'shortlisted', 'rejected', 'hired')),
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  recruiter_note TEXT,
  llm_score INTEGER CHECK (llm_score IS NULL OR (llm_score >= 0 AND llm_score <= 100)),
  llm_reason TEXT,
  llm_scored_at TIMESTAMPTZ,
  llm_model TEXT
);

CREATE INDEX idx_applications_job_id ON applications (job_id);
CREATE INDEX idx_applications_candidate_id ON applications (candidate_id);
CREATE INDEX idx_candidates_email ON candidates (email);
