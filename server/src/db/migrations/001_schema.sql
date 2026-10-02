DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;

CREATE TABLE jobs (
  job_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  job_family TEXT NOT NULL,
  seniority TEXT NOT NULL CHECK (seniority IN ('junior', 'mid', 'senior')),
  country TEXT NOT NULL CHECK (country IN ('DE', 'AT')),
  city TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE candidates (
  candidate_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL CHECK (country IN ('DE', 'AT')),
  city TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  preferred_job_family TEXT NOT NULL
);

CREATE TABLE applications (
  application_id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs (job_id),
  candidate_id TEXT NOT NULL REFERENCES candidates (candidate_id),
  created_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  match_score NUMERIC(4, 3) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  match_band TEXT NOT NULL CHECK (match_band IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('new', 'in_review', 'shortlisted', 'rejected', 'hired')),
  status_updated_at TIMESTAMPTZ,
  recruiter_note TEXT,
  llm_score INTEGER CHECK (llm_score IS NULL OR (llm_score >= 0 AND llm_score <= 100)),
  llm_reason TEXT,
  llm_scored_at TIMESTAMPTZ,
  llm_model TEXT
);

CREATE INDEX idx_jobs_country ON jobs (country);
CREATE INDEX idx_jobs_job_family ON jobs (job_family);
CREATE INDEX idx_applications_status ON applications (status);
CREATE INDEX idx_applications_source ON applications (source);
CREATE INDEX idx_applications_match_band ON applications (match_band);
CREATE INDEX idx_applications_match_score ON applications (match_score DESC);
CREATE INDEX idx_applications_created_at ON applications (created_at DESC);
CREATE INDEX idx_applications_status_score ON applications (status, match_score DESC);
CREATE INDEX idx_applications_job_id ON applications (job_id);
CREATE INDEX idx_applications_candidate_id ON applications (candidate_id);
CREATE INDEX idx_candidates_country ON candidates (country);
CREATE INDEX idx_candidates_city ON candidates (city);
CREATE INDEX idx_candidates_years_experience ON candidates (years_experience);
CREATE INDEX idx_candidates_preferred_job_family ON candidates (preferred_job_family);
