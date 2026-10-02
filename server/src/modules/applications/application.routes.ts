import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import type { ApplicationHandlers } from "./application.handler.js";

/** URL and HTTP method only — no logic, no SQL. */
export function createApplicationRouter(handlers: ApplicationHandlers) {
  const router = Router();

  router.get("/", asyncHandler(handlers.list));
  router.get("/:id", asyncHandler(handlers.getById));
  router.patch("/:id", asyncHandler(handlers.update));
  router.post("/:id/llm-score", asyncHandler(handlers.scoreWithLlm));

  return router;
}