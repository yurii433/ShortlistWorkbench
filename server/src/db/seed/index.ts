import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import type { PoolClient } from "pg";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const dataDir = path.join(root, "./server/csv_data");

function readCsv(file: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

// apply to timestamps fields that can crash DB if they are empty strings, e.g. "2023-01-01 00:00:00" is valid but "" is not.
function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

/** Wipe-and-reload from `csv_data/*.csv`, inside the caller's transaction. */
export async function seedFromCsv(client: PoolClient): Promise<void> {
  const jobs = readCsv("jobs.csv");
  const candidates = readCsv("candidates.csv");
  const applications = readCsv("applications.csv");

  for (const row of jobs) {
    await client.query(
      `INSERT INTO jobs (job_id, title, job_family, seniority, country, city, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        row.job_id,
        row.title,
        row.job_family,
        row.seniority,
        row.country,
        row.city,
        emptyToNull(row.created_at),
      ],
    );
  }

  for (const row of candidates) {
    await client.query(
      `INSERT INTO candidates (
         candidate_id, full_name, email, country, city, years_experience, preferred_job_family
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        row.candidate_id,
        row.full_name,
        row.email,
        row.country,
        row.city,
        Number(row.years_experience),
        row.preferred_job_family,
      ],
    );
  }

  for (const row of applications) {
    await client.query(
      `INSERT INTO applications (
         application_id, job_id, candidate_id, created_at, source, match_score, match_band, status, status_updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        row.application_id,
        row.job_id,
        row.candidate_id,
        row.created_at,
        row.source,
        row.match_score,
        row.match_band,
        row.status,
        emptyToNull(row.status_updated_at),
      ],
    );
  }
}
