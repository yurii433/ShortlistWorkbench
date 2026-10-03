import express from "express";
import type { Pool } from "pg";
import { errorHandler } from "./http/error-handler.js";
import { createApplicationHandlers } from "./modules/applications/application.handler.js";
import { createApplicationRepository } from "./modules/applications/application.repository.js";
import { createApplicationRouter } from "./modules/applications/application.routes.js";
import { createApplicationService } from "./modules/applications/application.service.js";
import { createJobHandlers } from "./modules/jobs/job.handler.js";
import { createJobRepository } from "./modules/jobs/job.repository.js";
import { createJobRouter } from "./modules/jobs/job.routes.js";
import { createJobService } from "./modules/jobs/job.service.js";

/**
 * The one place the layers are wired together, bottom up: pool → repositories →
 * services → handlers → routers.
 */
export function createApp(pool: Pool) {
  const app = express();
  app.use(express.json());

  const jobRepository = createJobRepository(pool);
  const jobService = createJobService(jobRepository);
  const jobHandlers = createJobHandlers(jobService);

  const applicationRepository = createApplicationRepository(pool);
  const applicationService = createApplicationService(applicationRepository);
  const applicationHandlers = createApplicationHandlers(applicationService);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/jobs", createJobRouter(jobHandlers));
  app.use("/applications", createApplicationRouter(applicationHandlers));

  app.use(errorHandler);

  return app;
}
