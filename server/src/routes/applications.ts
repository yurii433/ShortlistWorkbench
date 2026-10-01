import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import type { MatchScorer } from "../types.js";
import {
  listApplications,
  getApplicationById,
  updateApplicationStatus,
  scoreApplicationWithLlm,
} from "../services/applications.js";

export function applicationsRouter(pool: Pool, scorer: MatchScorer) {
  const router = Router();

  router.get("/", async (req: Request, res: Response) => {
    try {
      const result = await listApplications(pool, req.query);
      res.json(result);
    } catch (e) {
      if (e instanceof Error && ["invalid_sort", "invalid_order", "invalid_page", "invalid_page_size", "invalid_status"].includes(e.message)) {
        res.status(400).json({ error: e.message });
        return;
      }
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  });

  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const application = await getApplicationById(pool, req.params.id);
      if (!application) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(application);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  });

  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const { status, note } = req.body ?? {};
      if (typeof status !== "string") {
        res.status(400).json({ error: "invalid_status" });
        return;
      }
      const application = await updateApplicationStatus(pool, req.params.id, status, note);
      if (!application) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(application);
    } catch (e) {
      if (e instanceof Error && ["invalid_status", "invalid_note"].includes(e.message)) {
        res.status(400).json({ error: e.message });
        return;
      }
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  });

  router.post("/:id/llm-score", async (req: Request, res: Response) => {
    try {
      const application = await scoreApplicationWithLlm(pool, scorer, req.params.id);
      res.json(application);
    } catch (e) {
      if (e instanceof Error && e.message === "not_found") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (e instanceof Error && e.message === "llm_unavailable") {
        res.status(502).json({ error: "llm_unavailable" });
        return;
      }
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  });

  return router;
}