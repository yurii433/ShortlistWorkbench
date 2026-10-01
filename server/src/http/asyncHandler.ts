import type { NextFunction, Request, RequestHandler, Response } from "express";

type Handler = (req: Request, res: Response) => Promise<unknown>;

/**
 * Express 4 does not catch rejected promises from handlers, so every async
 * route needs this to reach the error middleware instead of hanging.
 */
export function asyncHandler(handler: Handler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

/** 400 responses all look the same: an error code the UI can branch on. */
export function badRequest(res: Response, error: string): void {
  res.status(400).json({ error });
}

export function notFound(res: Response): void {
  res.status(404).json({ error: "not_found" });
}
