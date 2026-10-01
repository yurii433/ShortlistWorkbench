import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { Candidate, Job, LlmScore, MatchScorer } from "../src/types.js";

const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/schema.sql",
);

/** The Compose Postgres from docker-compose.yml, test database. */
export const testUrl =
  process.env.TEST_DATABASE_URL ??
  "postgres://shortlist:shortlist@localhost:5433/shortlist_test";

export const pool = new pg.Pool({ connectionString: testUrl });

/** Creates a fresh schema once per test file. */
export async function applySchema(): Promise<void> {
  await pool.query(fs.readFileSync(schemaPath, "utf8"));
}

export async function resetFixtures(): Promise<void> {
  await pool.query("TRUNCATE applications, candidates, jobs CASCADE");
  await insertFixtures();
}

async function insertFixtures(): Promise<void> {
  await pool.query(`
    INSERT INTO jobs (job_id, title, job_family, seniority, country, city, created_at) VALUES
      ('J-DE-LOG', 'Warehouse Associate', 'Logistics', 'junior', 'DE', 'Hamburg', '2025-01-01 09:00'),
      ('J-AT-IT', 'IT Support', 'IT', 'mid', 'AT', 'Vienna', '2025-02-01 09:00'),
      ('J-DE-HC', 'Care Assistant', 'Healthcare', 'senior', 'DE', 'Cologne', '2025-03-01 09:00');

    INSERT INTO candidates (candidate_id, full_name, email, country, city, years_experience, preferred_job_family) VALUES
      ('C1', 'Anna Schmidt', 'anna@example.com', 'DE', 'Hamburg', 4, 'Logistics'),
      ('C2', 'Max Huber', 'max@example.com', 'AT', 'Vienna', 8, 'IT'),
      ('C3', 'Lea Klein', 'lea@example.com', 'DE', 'Berlin', 2, 'Healthcare');

    INSERT INTO applications (
      application_id, job_id, candidate_id, created_at, source, match_score, match_band, status, status_updated_at
    ) VALUES
      ('A1', 'J-DE-LOG', 'C1', '2026-01-01 10:00', 'referral', 0.910, 'high', 'new', NULL),
      ('A2', 'J-DE-LOG', 'C2', '2026-01-02 10:00', 'job_board', 0.720, 'medium', 'in_review', '2026-01-03 10:00'),
      ('A3', 'J-AT-IT', 'C2', '2026-01-03 10:00', 'referral', 0.550, 'medium', 'new', NULL),
      ('A4', 'J-DE-HC', 'C3', '2026-01-04 10:00', 'agency', 0.330, 'low', 'shortlisted', '2026-01-05 10:00'),
      ('A5', 'J-AT-IT', 'C1', '2026-01-05 10:00', 'referral', 0.120, 'low', 'new', NULL),
      ('A6', 'J-DE-LOG', 'C3', '2026-01-06 10:00', 'job_board', 0.880, 'high', 'hired', '2026-01-07 10:00');
  `);
}

/** Counts how often the model was asked, to prove the cache works. */
export class CountingScorer implements MatchScorer {
  readonly model = "mock-test";
  calls = 0;

  async score(input: { job: Job; candidate: Candidate }): Promise<LlmScore> {
    this.calls += 1;
    return {
      score: 42,
      reason: `Counted score for ${input.candidate.full_name} / ${input.job.title}`,
    };
  }
}

/** Answers outside the accepted 0–100 range, to prove the API rejects it. */
export class InvalidScorer implements MatchScorer {
  readonly model = "bad";
  calls = 0;

  async score(): Promise<LlmScore> {
    this.calls += 1;
    return { score: 999, reason: "too high" };
  }
}
