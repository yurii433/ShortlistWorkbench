import { Router } from "express";
import { asyncHandler, badRequest, notFound } from "../http/asyncHandler.js";
import { parseListQuery } from "../http/listQuery.js";
import { ApplicationsService } from "../services/applications.js";
import { APPLICATION_SORT_FIELDS, isStatus, type Status } from "../types.js";

export function applicationsRouter(service: ApplicationsService): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = parseListQuery(
        req.query,
        APPLICATION_SORT_FIELDS,
        "match_score",
      );
      if (!parsed.ok) {
        return badRequest(res, parsed.error);
      }
      if (parsed.value.status && !isStatus(parsed.value.status)) {
        return badRequest(res, "invalid_status");
      }
      res.json(await service.list(parsed.value));
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const application = await service.getById(req.params.id);
      if (!application) {
        return notFound(res);
      }
      res.json(application);
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const { status, note } = req.body ?? {};
      if (typeof status !== "string" || !isStatus(status)) {
        return badRequest(res, "invalid_status");
      }
      if (note !== undefined && typeof note !== "string") {
        return badRequest(res, "invalid_note");
      }
      const application = await service.updateStatus(
        req.params.id,
        status as Status,
        note,
      );
      if (!application) {
        return notFound(res);
      }
      res.json(application);
    }),
  );

  router.post(
    "/:id/llm-score",
    asyncHandler(async (req, res) => {
      const result = await service.scoreWithLlm(req.params.id);
      if (result.kind === "not_found") {
        return notFound(res);
      }
      if (result.kind === "llm_unavailable") {
        // The caller keeps working; it just gets no LLM score.
        return res.status(502).json({ error: "llm_unavailable" });
      }
      res.json(result.application);
    }),
  );

  return router;
}
