import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({ connectionString: config.databaseUrl });

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const dataDir = path.join(root, "csv_data");

function readCsv(file: string): Record<string, string>[] {
  const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

function emptyToNull(value: string): string | null {
  return value === "" ? null : value;
}

export async function seedFromCsv(client: pg.PoolClient): Promise<void> {
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
        row.created_at,
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

const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../db/schema.sql",
);

export async function reset(): Promise<void> {
  const schema = fs.readFileSync(schemaPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(schema);
    await seedFromCsv(client);
    await client.query("COMMIT");
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM jobs) AS jobs,
        (SELECT COUNT(*)::int FROM candidates) AS candidates,
        (SELECT COUNT(*)::int FROM applications) AS applications
    `);
    console.log("Database reset complete:", counts.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  reset().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}