import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { applySchema, pool, resetFixtures } from "./fixtures.js";

const app = createApp(pool);

beforeAll(applySchema);
beforeEach(resetFixtures);
afterAll(() => pool.end());

describe("jobs API", () => {
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