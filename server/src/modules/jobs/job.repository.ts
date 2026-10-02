import { pageOffset, sqlDirection } from "../../http/list-query.js";
import { FilterBuilder } from "../../db/filter-builder.js";
import type { Queryable } from "../../db/queryable.js";
import { toIsoDate } from "../../db/row-utils.js";
import type { JobWithCounts } from "../../types.js";
import type { JobListQuery, JobSortField } from "./job.types.js";

/** The only place a user-supplied sort key turns into a SQL expression. */
const JOB_SORT_SQL: Record<JobSortField, string> = {
  created_at: "j.created_at",
  title: "j.title",
  application_count: "COUNT(a.application_id)",
};

const JOB_COLUMNS = `
  j.job_id,
  j.title,
  j.job_family,
  j.seniority,
  j.country,
  j.city,
  j.created_at,
  COUNT(a.application_id)::int AS application_count,
  COUNT(a.application_id) FILTER (WHERE a.status = 'new')::int AS new_count,
  COUNT(a.application_id) FILTER (WHERE a.status = 'in_review')::int AS in_review_count,
  COUNT(a.application_id) FILTER (WHERE a.status = 'shortlisted')::int AS shortlisted_count,
  COUNT(a.application_id) FILTER (WHERE a.status = 'rejected')::int AS rejected_count,
  COUNT(a.application_id) FILTER (WHERE a.status = 'hired')::int AS hired_count
`;

const FROM_JOBS = `
  FROM jobs j
  LEFT JOIN applications a ON a.job_id = j.job_id
`;

function mapJob(row: Record<string, unknown>): JobWithCounts {
  return {
    job_id: String(row.job_id),
    title: String(row.title),
    job_family: String(row.job_family),
    seniority: String(row.seniority),
    country: String(row.country),
    city: String(row.city),
    created_at: toIsoDate(row.created_at),
    application_count: Number(row.application_count),
    new_count: Number(row.new_count),
    in_review_count: Number(row.in_review_count),
    shortlisted_count: Number(row.shortlisted_count),
    rejected_count: Number(row.rejected_count),
    hired_count: Number(row.hired_count),
  };
}

export type JobListResult = {
  items: JobWithCounts[];
  total: number;
};

export type JobRepository = {
  list(query: JobListQuery): Promise<JobListResult>;
  findById(id: string): Promise<JobWithCounts | null>;
};

export function createJobRepository(db: Queryable): JobRepository {
  return {
    async list(query) {
      const filters = new FilterBuilder();
      filters
        .eq("j.country", query.country)
        .eq("j.job_family", query.jobFamily)
        .containsAny(["j.title", "j.city"], query.search ? `%${query.search}%` : "");

      const where = filters.where();
      const values = filters.params();
      const direction = sqlDirection(query.order);

      const countSql = `SELECT COUNT(DISTINCT j.job_id)::int AS total ${FROM_JOBS} ${where}`;
      const listSql = `
        SELECT ${JOB_COLUMNS}
        ${FROM_JOBS}
        ${where}
        GROUP BY j.job_id
        ORDER BY ${JOB_SORT_SQL[query.sort]} ${direction}, j.job_id ASC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;

      const [countResult, listResult] = await Promise.all([
        db.query(countSql, values),
        db.query(listSql, [
          ...values,
          query.pageSize,
          pageOffset(query),
        ]),
      ]);

      return {
        items: listResult.rows.map(mapJob),
        total: countResult.rows[0].total as number,
      };
    },

    async findById(id) {
      const result = await db.query(
        `SELECT ${JOB_COLUMNS} ${FROM_JOBS} WHERE j.job_id = $1 GROUP BY j.job_id`,
        [id],
      );
      if (result.rowCount === 0) return null;
      return mapJob(result.rows[0]);
    },
  };
}