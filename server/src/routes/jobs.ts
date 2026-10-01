import { Router } from "express";
import { asyncHandler, badRequest, notFound } from "../http/asyncHandler.js";
import { parseListQuery } from "../http/listQuery.js";
import { JobsService } from "../services/jobs.js";
import { JOB_SORT_FIELDS } from "../types.js";

export function jobsRouter(service: JobsService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = parseListQuery(req.query, JOB_SORT_FIELDS, "created_at");
      if (!parsed.ok) {
        return badRequest(res, parsed.error);
      }
      res.json(await service.list(parsed.value));
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const job = await service.getById(req.params.id);
      if (!job) {
        return notFound(res);
      }
      res.json(job);
    }),
  );

  return router;
}
