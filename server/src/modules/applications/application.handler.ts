import type { Request, Response } from "express";
import {
  parseApplicationListQuery,
  parseUpdateApplicationBody,
} from "./application.schema.js";
import type { ApplicationService } from "./application.service.js";

export type ApplicationHandlers = {
  list(req: Request, res: Response): Promise<void>;
  getById(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  scoreWithLlm(req: Request, res: Response): Promise<void>;
};

/** HTTP in, HTTP out: read the request, call the service, write the response. */
export function createApplicationHandlers(
  service: ApplicationService,
): ApplicationHandlers {
  return {
    async list(req, res) {
      res.json(await service.list(parseApplicationListQuery(req.query)));
    },

    async getById(req, res) {
      res.json(await service.getById(req.params.id));
    },

    async update(req, res) {
      const input = parseUpdateApplicationBody(req.body);
      res.json(await service.update(req.params.id, input));
    },

    async scoreWithLlm(req, res) {
      res.json(await service.scoreWithLlm(req.params.id));
    },
  };
}