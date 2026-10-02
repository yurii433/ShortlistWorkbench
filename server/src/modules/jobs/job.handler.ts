import type { Request, Response } from "express";
import { parseJobListQuery } from "./job.schema.js";
import type { JobService } from "./job.service.js";

export type JobHandlers = {
  list(req: Request, res: Response): Promise<void>;
  getById(req: Request, res: Response): Promise<void>;
};

/** HTTP in, HTTP out: read the request, call the service, write the response. */
export function createJobHandlers(service: JobService): JobHandlers {
  return {
    async list(req, res) {
      res.json(await service.list(parseJobListQuery(req.query)));
    },

    async getById(req, res) {
      res.json(await service.getById(req.params.id));
    },
  };
}