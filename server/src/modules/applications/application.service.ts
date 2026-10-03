import {
  BadGatewayError,
  BadRequestError,
  NotFoundError,
} from "../../errors.js";
import { parseLlmScore } from "../../llm.js";
import type {
  Application,
  ListResult,
  LlmScore,
  MatchScorer,
} from "../../types.js";
import { isStatus } from "../../types.js";
import type { ApplicationRepository } from "./application.repository.js";
import type {
  ApplicationListQuery,
  UpdateApplicationInput,
} from "./application.types.js";

export type ApplicationService = {
  list(query: ApplicationListQuery): Promise<ListResult<Application>>;
  getById(id: string): Promise<Application>;
  update(id: string, input: UpdateApplicationInput): Promise<Application>;
  scoreWithLlm(id: string): Promise<Application>;
};

/**
 * Every use case in here could run from a CLI or a background job: no `req`, no
 * `res`, no SQL. Failures are raised as typed errors and the HTTP layer decides
 * what status they become.
 */
export function createApplicationService(
  repository: ApplicationRepository,
  scorer: MatchScorer,
): ApplicationService {
  return {
    async list(query) {
      const { items, total } = await repository.list(query);
      return { items, total, page: query.page, pageSize: query.pageSize };
    },

    async getById(id) {
      const application = await repository.findById(id);
      if (!application) throw new NotFoundError();
      return application;
    },

    async update(id, input) {
      const { status, note } = input;
      if (!isStatus(status)) {
        throw new BadRequestError("invalid_status");
      }
      if (note !== undefined && typeof note !== "string") {
        throw new BadRequestError("invalid_note");
      }

      const application = await repository.updateStatus(id, status, note);
      if (!application) throw new NotFoundError();
      return application;
    },

    async scoreWithLlm(id) {
      const application = await repository.findById(id);
      if (!application) throw new NotFoundError();

      // The score is cached on the application, so a second call never re-asks.
      if (application.llm_score !== null) return application;

      let scored: LlmScore;
      try {
        scored = parseLlmScore(
          await scorer.score({
            job: application.job,
            candidate: application.candidate,
          }),
        );
      } catch {
        throw new BadGatewayError("llm_unavailable");
      }

      await repository.saveLlmScore(
        id,
        scored.score,
        scored.reason,
        scorer.model,
      );

      return (await repository.findById(id)) ?? application;
    },
  };
}
