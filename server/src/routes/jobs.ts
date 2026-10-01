import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import { listJobs, getJobById } from "../services/jobs.js";

export function jobsRouter(pool: Pool) {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    try {
      const result = await listJobs(pool, req.query);
      res.json(result);
    } catch (e) {
      if (e instanceof Error && ["invalid_sort", "invalid_order", "invalid_page", "invalid_page_size"].includes(e.message)) {
        res.status(400).json({ error: e.message });
        return;
      }
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  });

  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const job = await getJobById(pool, req.params.id);
      if (!job) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(job);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  });

  return router;
}