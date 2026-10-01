import { Router } from "express";
import { JobsService } from "../services/jobs.js";
import { isJobSortField, type JobListQuery } from "../types.js";

export function jobsRouter(service: JobsService): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const country = optionalString(req.query.country);
      const jobFamily = optionalString(req.query.jobFamily);
      const search = optionalString(req.query.search);
      const sortRaw = optionalString(req.query.sort) ?? "created_at";
      const orderRaw = optionalString(req.query.order) ?? "desc";
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);

      if (!isJobSortField(sortRaw)) {
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

      const query: JobListQuery = {
        country,
        jobFamily,
        search,
        sort: sortRaw,
        order: orderRaw,
        page,
        pageSize: Math.min(pageSize, 100),
      };
      res.json(await service.list(query));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const job = await service.getById(req.params.id);
      if (!job) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(job);
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