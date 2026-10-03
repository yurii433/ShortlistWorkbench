import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { applySchema, pool, resetFixtures } from "./fixtures.js";

const app = createApp(pool);

beforeAll(applySchema);
beforeEach(resetFixtures);
afterAll(() => pool.end());

describe("GET /jobs", () => {
  it("lists all jobs", async () => {
    const res = await request(app).get("/jobs");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(3);
  });

  it("filters by country", async () => {
    const res = await request(app).get("/jobs").query({ country: "AT" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].country).toBe("AT");
  });

  it("filters by job family", async () => {
    const res = await request(app).get("/jobs").query({ jobFamily: "Logistics" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].job_family).toBe("Logistics");
  });

  it("searches by city", async () => {
    const res = await request(app).get("/jobs").query({ search: "Vienna" });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].city).toBe("Vienna");
  });

  it("sorts by application count", async () => {
    const res = await request(app).get("/jobs").query({ sort: "application_count", order: "desc" });
    expect(res.status).toBe(200);
    const counts = res.body.items.map((j: any) => j.application_count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("rejects invalid sort", async () => {
    const res = await request(app).get("/jobs").query({ sort: "invalid" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_sort");
  });
});

describe("GET /jobs/:id", () => {
  it("returns job with application counts", async () => {
    const res = await request(app).get("/jobs/J-DE-LOG");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Warehouse Associate");
    expect(res.body.application_count).toBe(3);
    expect(res.body.hired_count).toBe(1);
  });

  it("returns 404 for unknown job", async () => {
    const res = await request(app).get("/jobs/J-NOTFOUND");
    expect(res.status).toBe(404);
  });
});
