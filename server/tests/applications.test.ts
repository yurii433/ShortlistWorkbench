import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseLlmScore } from "../src/modules/llm/llm.service.js";
import { scoreCandidate } from "../src/modules/llm/llm.scorer.js";
import { applySchema, pool, resetFixtures } from "./fixtures.js";

vi.mock("../src/modules/llm/llm.scorer.js", () => ({
  scoreCandidate: vi.fn(),
}));

const mockScoreCandidate = vi.mocked(scoreCandidate);

const app = createApp(pool);

beforeAll(applySchema);
beforeEach(resetFixtures);
afterAll(() => pool.end());

describe("GET /applications", () => {
  it("returns paginated list", async () => {
    const res = await request(app).get("/applications").query({ page: 1, pageSize: 2, sort: "match_score", order: "desc" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(6);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].application_id).toBe("A1");
  });

  it("filters by status", async () => {
    const res = await request(app).get("/applications").query({ status: "new" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.every((i: any) => i.status === "new")).toBe(true);
  });

  it("filters by job country", async () => {
    const res = await request(app).get("/applications").query({ country: "DE" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.items.every((i: any) => i.job.country === "DE")).toBe(true);
  });

  it("filters by job family", async () => {
    const res = await request(app).get("/applications").query({ jobFamily: "Logistics" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.every((i: any) => i.job.job_family === "Logistics")).toBe(true);
  });

  it("combines multiple filters", async () => {
    const res = await request(app).get("/applications").query({ status: "new", country: "DE", jobFamily: "Logistics" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].application_id).toBe("A1");
  });

  it("sorts by match_score descending", async () => {
    const res = await request(app).get("/applications").query({ sort: "match_score", order: "desc" });
    const scores = res.body.items.map((i: any) => i.match_score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("rejects invalid sort parameter", async () => {
    const res = await request(app).get("/applications").query({ sort: "invalid" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_sort");
  });

  it("rejects invalid status filter", async () => {
    const res = await request(app).get("/applications").query({ status: "invalid_status" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_status");
  });

  it("rejects invalid page", async () => {
    const res = await request(app).get("/applications").query({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_page");
  });

  it("returns job and candidate details", async () => {
    const res = await request(app).get("/applications").query({ jobId: "J-AT-IT" });
    expect(res.status).toBe(200);
    expect(res.body.items[0].job.city).toBe("Vienna");
    expect(res.body.items[0].candidate.email).toBe("max@example.com");
  });
});

describe("GET /applications/:id", () => {
  it("returns single application with details", async () => {
    const res = await request(app).get("/applications/A1");
    expect(res.status).toBe(200);
    expect(res.body.application_id).toBe("A1");
    expect(res.body.candidate.full_name).toBe("Anna Schmidt");
    expect(res.body.job.title).toBe("Warehouse Associate");
  });

  it("returns 404 for unknown application", async () => {
    const res = await request(app).get("/applications/A-NOTFOUND");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /applications/:id", () => {
  it("updates status and stores note", async () => {
    const res = await request(app).patch("/applications/A1").send({ status: "shortlisted", note: "Strong fit" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("shortlisted");
    expect(res.body.recruiter_note).toBe("Strong fit");
  });

  it("keeps existing note when note is omitted", async () => {
    await request(app).patch("/applications/A1").send({ status: "in_review", note: "First review" });
    const res = await request(app).patch("/applications/A1").send({ status: "rejected" });
    expect(res.body.recruiter_note).toBe("First review");
  });

  it("rejects invalid status", async () => {
    const res = await request(app).patch("/applications/A1").send({ status: "invalid" });
    expect(res.status).toBe(400);
    const fetched = await request(app).get("/applications/A1");
    expect(fetched.body.status).toBe("new");
  });

  it("returns 404 for unknown application", async () => {
    const res = await request(app).patch("/applications/A-NOTFOUND").send({ status: "new" });
    expect(res.status).toBe(404);
  });
});

describe("POST /applications/:id/llm-score", () => {
  beforeEach(() => {
    mockScoreCandidate.mockReset();
  });

  it("calculates LLM score and caches it", async () => {
    mockScoreCandidate.mockResolvedValue({
      score: 75,
      reason: "Good match for the position",
      model: "test-model",
    });

    const res1 = await request(app).post("/applications/A1/llm-score");
    expect(res1.status).toBe(200);
    expect(res1.body.llm_score).toBe(75);

    const res2 = await request(app).post("/applications/A1/llm-score");
    expect(res2.status).toBe(200);
    expect(res2.body.llm_score).toBe(75);
    expect(mockScoreCandidate).toHaveBeenCalledTimes(1);
  });

  it("returns 502 on model error", async () => {
    mockScoreCandidate.mockRejectedValue(new Error("model unavailable"));
    const res = await request(app).post("/applications/A1/llm-score");
    expect(res.status).toBe(502);
    expect(res.body.llm_score).toBeUndefined();
  });

  it("returns 404 for unknown application", async () => {
    const res = await request(app).post("/applications/A-NOTFOUND/llm-score");
    expect(res.status).toBe(404);
  });
});

describe("parseLlmScore", () => {
  it("validates score is 0-100", () => {
    expect(() => parseLlmScore({ score: -1, reason: "test" })).toThrow();
    expect(() => parseLlmScore({ score: 101, reason: "test" })).toThrow();
    expect(parseLlmScore({ score: 0, reason: "test" })).toEqual({ score: 0, reason: "test" });
    expect(parseLlmScore({ score: 100, reason: "test" })).toEqual({ score: 100, reason: "test" });
  });

  it("validates reason is a string", () => {
    expect(() => parseLlmScore({ score: 50, reason: 123 as any })).toThrow();
    expect(parseLlmScore({ score: 50, reason: "Valid reason" })).toEqual({ score: 50, reason: "Valid reason" });
  });
});
