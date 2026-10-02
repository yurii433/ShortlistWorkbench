import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors.js";

/**
 * The single place that turns a thrown error into an HTTP response, so routes
 * and handlers never repeat the same status mapping.
 */
export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.code });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "internal_error" });
};