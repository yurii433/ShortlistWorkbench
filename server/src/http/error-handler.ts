import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors.js";

/**
 * Converts application errors into HTTP responses.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.code });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "internal_error" });
};
