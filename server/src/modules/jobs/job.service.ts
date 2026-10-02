import { NotFoundError } from "../../errors.js";
import type { JobWithCounts, ListResult } from "../../types.js";
import type { JobRepository } from "./job.repository.js";
import type { JobListQuery } from "./job.types.js";

export type JobService = {
  list(query: JobListQuery): Promise<ListResult<JobWithCounts>>;
  getById(id: string): Promise<JobWithCounts>;
};

export function createJobService(repository: JobRepository): JobService {
  return {
    async list(query) {
      const { items, total } = await repository.list(query);
      return { items, total, page: query.page, pageSize: query.pageSize };
    },

    async getById(id) {
      const job = await repository.findById(id);
      if (!job) throw new NotFoundError();
      return job;
    },
  };
}