import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  applySchema,
  CountingScorer,
  InvalidScorer,
  pool,
  resetFixtures,
} from "./fixtures.js";

const scorer = new CountingScorer();
const app = createApp(pool, scorer);

beforeAll(applySchema);
beforeEach(resetFixtures);
afterAll(() => pool.end());

describe("applications API", () => {
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
    const response = await request(app)
      .get("/applications")
      .query({ sort: "match_score", order: "desc" });
    expect(response.status).toBe(200);
    const scores = response.body.items.map((item: { match_score: number }) => item.match_score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(response.body.items[0].application_id).toBe("A1");
  });

  it("paginates with a stable total", async () => {
    const page1 = await request(app)
      .get("/applications")
      .query({ page: 1, pageSize: 2, sort: "match_score", order: "desc" });
    const page2 = await request(app)
      .get("/applications")
      .query({ page: 2, pageSize: 2, sort: "match_score", order: "desc" });

    expect(page1.body.total).toBe(6);
    expect(page2.body.total).toBe(6);
    expect(page1.body.items).toHaveLength(2);
    expect(page2.body.items).toHaveLength(2);

    const ids1 = page1.body.items.map((item: { application_id: string }) => item.application_id);
    const ids2 = page2.body.items.map((item: { application_id: string }) => item.application_id);
    expect(ids1.some((id: string) => ids2.includes(id))).toBe(false);
  });

  it("rejects invalid paging and sort parameters", async () => {
    const badSort = await request(app).get("/applications").query({ sort: "nope" });
    expect(badSort.status).toBe(400);
    expect(badSort.body.error).toBe("invalid_sort");

    const badPage = await request(app).get("/applications").query({ page: 0 });
    expect(badPage.status).toBe(400);
    expect(badPage.body.error).toBe("invalid_page");

    const badStatus = await request(app).get("/applications").query({ status: "nope" });
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error).toBe("invalid_status");
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

  it("returns the job and candidate with each list row", async () => {
    const response = await request(app).get("/applications").query({ jobId: "J-AT-IT" });
    const item = response.body.items[0];
    expect(item.job.city).toBe("Vienna");
    expect(item.candidate.email).toBe("max@example.com");
  });
});

describe("status updates", () => {
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

  it("keeps the existing note when a later patch omits one", async () => {
    await request(app)
      .patch("/applications/A1")
      .send({ status: "in_review", note: "Called them" });
    await request(app).patch("/applications/A1").send({ status: "rejected" });

    const fetched = await request(app).get("/applications/A1");
    expect(fetched.body.recruiter_note).toBe("Called them");
    expect(fetched.body.status).toBe("rejected");
  });

  it("rejects an invalid status", async () => {
    const response = await request(app).patch("/applications/A1").send({ status: "nope" });
    expect(response.status).toBe(400);
    const fetched = await request(app).get("/applications/A1");
    expect(fetched.body.status).toBe("new");
  });

  it("404s for an unknown application", async () => {
    expect((await request(app).get("/applications/A-NOPE")).status).toBe(404);
    expect((await request(app).patch("/applications/A-NOPE").send({ status: "new" })).status).toBe(404);
  });
});

describe("LLM score", () => {
  beforeEach(() => {
    scorer.calls = 0;
  });

  it("caches the score and does not call the model twice", async () => {
    const first = await request(app).post("/applications/A1/llm-score");
    expect(first.status).toBe(200);
    expect(first.body.llm_score).toBe(42);
    expect(scorer.calls).toBe(1);

    const second = await request(app).post("/applications/A1/llm-score");
    expect(second.status).toBe(200);
    expect(second.body.llm_score).toBe(42);
    expect(scorer.calls).toBe(1);
  });

  it("returns 502 and stores nothing when the payload is invalid", async () => {
    const badApp = createApp(pool, new InvalidScorer());
    const response = await request(badApp).post("/applications/A3/llm-score");
    expect(response.status).toBe(502);
    const fetched = await request(app).get("/applications/A3");
    expect(fetched.body.llm_score).toBeNull();
  });

  it("404s for an unknown application", async () => {
    expect((await request(app).post("/applications/A-NOPE/llm-score")).status).toBe(404);
  });

  it("sorts by score disagreement and skips applications without an LLM score", async () => {
    // Score everything except A5, which stays unscored on purpose.
    await pool.query(`
      UPDATE applications
      SET llm_score = CASE WHEN application_id = 'A1' THEN 10 ELSE 95 END,
          llm_scored_at = NOW(),
          llm_reason = 'fixture'
      WHERE application_id <> 'A5'
    `);
    const response = await request(app)
      .get("/applications")
      .query({ sort: "score_disagreement", order: "desc" });

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(5);
    const ids = response.body.items.map((item: { application_id: string }) => item.application_id);
    // A1: |10-91|=81, A4: |95-33|=62, A3: |95-55|=40, A2: |95-72|=23, A6: |95-88|=7.
    expect(ids).toEqual(["A1", "A4", "A3", "A2", "A6"]);
  });
});