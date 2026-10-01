import { Router } from "express";
import { ApplicationsService } from "../services/applications.js";
import { isSortField, isStatus, type ListQuery } from "../types.js";

export function applicationsRouter(service: ApplicationsService): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const status = optionalString(req.query.status);
      const country = optionalString(req.query.country);
      const jobFamily = optionalString(req.query.jobFamily);
      const sortRaw = optionalString(req.query.sort) ?? "match_score";
      const orderRaw = optionalString(req.query.order) ?? "desc";
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const hasLlmScore = optionalString(req.query.hasLlmScore) === "true";

      if (status && !isStatus(status)) {
        res.status(400).json({ error: "invalid_status" });
        return;
      }
      if (!isSortField(sortRaw)) {
        res.status(400).json({ error: "invalid_sort" });
        return;
      }
      if (orderRaw !== "asc" && orderRaw !== "desc") {
        res.status(400).json({ error: "invalid_order" });
        return;
      }
      if (!Number.isInteger(page) || page < 1) {
        res.status(400).json({ error: "invalid_page" });
        return;
      }
      if (!Number.isInteger(pageSize) || pageSize < 1) {
        res.status(400).json({ error: "invalid_page_size" });
        return;
      }

      const query: ListQuery = {
        status,
        country,
        jobFamily,
        sort: sortRaw,
        order: orderRaw,
        page,
        pageSize: Math.min(pageSize, 100),
        hasLlmScore,
      };
      res.json(await service.list(query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const application = await service.getById(req.params.id);
      if (!application) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(application);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const status = req.body?.status;
      const note = req.body?.note;
      if (typeof status !== "string" || !isStatus(status)) {
        res.status(400).json({ error: "invalid_status" });
        return;
      }
      if (note !== undefined && typeof note !== "string") {
        res.status(400).json({ error: "invalid_note" });
        return;
      }
      const application = await service.updateStatus(
        req.params.id,
        status,
        typeof note === "string" ? note : undefined,
      );
      if (!application) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(application);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/llm-score", async (req, res, next) => {
    try {
      const result = await service.scoreWithLlm(req.params.id);
      if (result.kind === "not_found") {
        res.status(404).json({ error: "not_found" });
        return;
      }
      if (result.kind === "llm_unavailable") {
        res.status(502).json({ error: "llm_unavailable" });
        return;
      }
      res.json(result.application);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  return value;
}
