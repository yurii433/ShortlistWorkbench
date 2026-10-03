import type { NextFunction, Request, RequestHandler, Response } from "express";

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
) => Promise<void>;

/**
 * Forwards rejected promises to Express error middleware.
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}
