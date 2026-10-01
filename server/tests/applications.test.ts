import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { Candidate, Job, LlmScore, MatchScorer } from "../src/types.js";

const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/schema.sql",
);

const testUrl =
  process.env.TEST_DATABASE_URL ??
  "postgres://shortlist:shortlist@localhost:5433/shortlist_test";

class CountingScorer implements MatchScorer {
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

class InvalidScorer implements MatchScorer {
  readonly model = "bad";
  calls = 0;
  async score(): Promise<LlmScore> {
    this.calls += 1;
    return { score: 999, reason: "too high" };
  }
}

async function insertFixtures(pool: pg.Pool) {
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

describe("applications API", () => {
  const pool = new pg.Pool({ connectionString: testUrl });
  const scorer = new CountingScorer();
  const app = createApp(pool, scorer);

  beforeAll(async () => {
    const schema = fs.readFileSync(schemaPath, "utf8");
    await pool.query(schema);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE applications, candidates, jobs CASCADE");
    await insertFixtures(pool);
    scorer.calls = 0;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("filters by status, country and job family in the database", async () => {
    const response = await request(app).get("/applications").query({
      status: "new",
      country: "DE",
      jobFamily: "Logistics",
    });
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].application_id).toBe("A1");
  });

  it("sorts by match_score descending", async () => {
    const response = await request(app).get("/applications").query({
      sort: "match_score",
      order: "desc",
    });
    expect(response.status).toBe(200);
    const scores = response.body.items.map((item: { match_score: number }) => item.match_score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
    expect(response.body.items[0].application_id).toBe("A1");
  });

  it("paginates with a stable total", async () => {
    const page1 = await request(app).get("/applications").query({
      page: 1,
      pageSize: 2,
      sort: "match_score",
      order: "desc",
    });
    const page2 = await request(app).get("/applications").query({
      page: 2,
      pageSize: 2,
      sort: "match_score",
      order: "desc",
    });
    expect(page1.body.total).toBe(6);
    expect(page2.body.total).toBe(6);
    expect(page1.body.items).toHaveLength(2);
    expect(page2.body.items).toHaveLength(2);
    const ids1 = page1.body.items.map((item: { application_id: string }) => item.application_id);
    const ids2 = page2.body.items.map((item: { application_id: string }) => item.application_id);
    expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
  });

  it("updates status and status_updated_at", async () => {
    const patched = await request(app)
      .patch("/applications/A1")
      .send({ status: "shortlisted", note: "Strong logistics fit" });
    expect(patched.status).toBe(200);
    expect(patched.body.status).toBe("shortlisted");
    expect(patched.body.status_updated_at).toBeTruthy();
    expect(patched.body.recruiter_note).toBe("Strong logistics fit");

    const fetched = await request(app).get("/applications/A1");
    expect(fetched.body.status).toBe("shortlisted");
  });

  it("rejects an invalid status", async () => {
    const response = await request(app).patch("/applications/A1").send({ status: "nope" });
    expect(response.status).toBe(400);
    const fetched = await request(app).get("/applications/A1");
    expect(fetched.body.status).toBe("new");
  });

  it("caches the LLM score and does not call the model twice", async () => {
    const first = await request(app).post("/applications/A1/llm-score");
    expect(first.status).toBe(200);
    expect(first.body.llm_score).toBe(42);
    expect(scorer.calls).toBe(1);

    const second = await request(app).post("/applications/A1/llm-score");
    expect(second.status).toBe(200);
    expect(second.body.llm_score).toBe(42);
    expect(scorer.calls).toBe(1);
  });

  it("returns 502 and stores nothing when the LLM payload is invalid", async () => {
    const badApp = createApp(pool, new InvalidScorer());
    const response = await request(badApp).post("/applications/A3/llm-score");
    expect(response.status).toBe(502);
    const fetched = await request(app).get("/applications/A3");
    expect(fetched.body.llm_score).toBeNull();
  });

  it("scopes the application list to a single job", async () => {
    const response = await request(app).get("/applications").query({ jobId: "J-AT-IT" });
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    const jobIds = response.body.items.map(
      (item: { job: { job_id: string } }) => item.job.job_id,
    );
    expect(jobIds.every((id: string) => id === "J-AT-IT")).toBe(true);
  });

  it("combines the jobId filter with status", async () => {
    const response = await request(app)
      .get("/applications")
      .query({ jobId: "J-DE-LOG", status: "new" });
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].application_id).toBe("A1");
  });
});

describe("jobs API", () => {
  const pool = new pg.Pool({ connectionString: testUrl });
  const app = createApp(pool, new CountingScorer());

  beforeAll(async () => {
    const schema = fs.readFileSync(schemaPath, "utf8");
    await pool.query(schema);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE applications, candidates, jobs CASCADE");
    await insertFixtures(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("lists all jobs with application counts by status", async () => {
    const response = await request(app).get("/jobs");
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    const byId = Object.fromEntries(
      response.body.items.map((job: { job_id: string }) => [job.job_id, job]),
    ) as Record<string, Record<string, number>>;
    expect(byId["J-DE-LOG"].application_count).toBe(3);
    expect(byId["J-DE-LOG"].hired_count).toBe(1);
    expect(byId["J-DE-LOG"].in_review_count).toBe(1);
    expect(byId["J-AT-IT"].application_count).toBe(2);
    expect(byId["J-DE-HC"].shortlisted_count).toBe(1);
  });

  it("sorts jobs by applicant count", async () => {
    const response = await request(app)
      .get("/jobs")
      .query({ sort: "application_count", order: "desc" });
    expect(response.status).toBe(200);
    expect(response.body.items[0].job_id).toBe("J-DE-LOG");
    const counts = response.body.items.map((job: { application_count: number }) => job.application_count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("filters jobs by country, family and search", async () => {
    const byCountry = await request(app).get("/jobs").query({ country: "AT" });
    expect(byCountry.body.total).toBe(1);
    expect(byCountry.body.items[0].job_id).toBe("J-AT-IT");

    const byFamily = await request(app).get("/jobs").query({ jobFamily: "Healthcare" });
    expect(byFamily.body.total).toBe(1);
    expect(byFamily.body.items[0].job_id).toBe("J-DE-HC");

    const bySearch = await request(app).get("/jobs").query({ search: "Vienna" });
    expect(bySearch.body.total).toBe(1);
    expect(bySearch.body.items[0].job_id).toBe("J-AT-IT");
  });

  it("rejects an invalid job sort", async () => {
    const response = await request(app).get("/jobs").query({ sort: "nope" });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("invalid_sort");
  });

  it("returns a single job and 404 for a missing one", async () => {
    const found = await request(app).get("/jobs/J-AT-IT");
    expect(found.status).toBe(200);
    expect(found.body.title).toBe("IT Support");
    expect(found.body.application_count).toBe(2);

    const missing = await request(app).get("/jobs/J-NOPE");
    expect(missing.status).toBe(404);
  });
});
