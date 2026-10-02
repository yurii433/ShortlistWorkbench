import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import type { JobHandlers } from "./job.handler.js";

/** URL and HTTP method only — no logic, no SQL. */
export function createJobRouter(handlers: JobHandlers) {
  const router = Router();

  router.get("/", asyncHandler(handlers.list));
  router.get("/:id", asyncHandler(handlers.getById));

  return router;
}