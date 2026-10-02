import type { NextFunction, Request, RequestHandler, Response } from "express";

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
) => Promise<void>;

/**
 * Express 4 does not forward rejected promises, so a throwing handler would hang
 * the request instead of reaching the error middleware. Wrap it once, here.
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}