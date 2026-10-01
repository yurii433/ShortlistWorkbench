import express from "express";
import { applicationsRouter } from "./routes/applications.js";
import { jobsRouter } from "./routes/jobs.js";
import { ApplicationsService } from "./services/applications.js";
import { JobsService } from "./services/jobs.js";
import type { MatchScorer } from "./types.js";
import type { Pool } from "pg";

export function createApp(pool: Pool, scorer: MatchScorer) {
  const app = express();
  app.use(express.json());
  const service = new ApplicationsService(pool, scorer);
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/jobs", jobsRouter(new JobsService(pool)));
  app.use("/applications", applicationsRouter(service));
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      res.status(500).json({ error: "internal_error" });
    },
  );
  return app;
}
