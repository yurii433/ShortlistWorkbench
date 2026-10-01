import type { Pool } from "pg";
import type { JobListQuery, JobWithCounts } from "../types.js";

const LIST_SORT_SQL: Record<JobListQuery["sort"], string> = {
  created_at: "j.created_at",
  title: "j.title",
  application_count: "COUNT(a.application_id)",
};

/** Job columns plus one applicant count per status, shared by list and detail. */
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

export class JobsService {
  constructor(private readonly pool: Pool) {}

  async list(query: JobListQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];

    const filterBy = (column: string, value: string | undefined) => {
      if (!value) {
        return;
      }
      values.push(value);
      filters.push(`${column} = $${values.length}`);
    };

    filterBy("j.country", query.country);
    filterBy("j.job_family", query.jobFamily);

    if (query.search) {
      values.push(`%${query.search}%`);
      filters.push(`(j.title ILIKE $${values.length} OR j.city ILIKE $${values.length})`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const direction = query.order === "asc" ? "ASC" : "DESC";
    const offset = (query.page - 1) * query.pageSize;

    // DISTINCT because the count shares the applicant's LEFT JOIN with the list.
    const countSql = `SELECT COUNT(DISTINCT j.job_id)::int AS total ${FROM_JOBS} ${where}`;
    const listSql = `
      SELECT ${JOB_COLUMNS}
      ${FROM_JOBS}
      ${where}
      GROUP BY j.job_id
      ORDER BY ${LIST_SORT_SQL[query.sort]} ${direction}, j.job_id ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const [countResult, listResult] = await Promise.all([
      this.pool.query(countSql, values),
      this.pool.query(listSql, [...values, query.pageSize, offset]),
    ]);

    return {
      items: listResult.rows.map(mapJob),
      page: query.page,
      pageSize: query.pageSize,
      total: countResult.rows[0].total as number,
    };
  }

  async getById(id: string): Promise<JobWithCounts | null> {
    const result = await this.pool.query(
      `SELECT ${JOB_COLUMNS} ${FROM_JOBS} WHERE j.job_id = $1 GROUP BY j.job_id`,
      [id],
    );
    return result.rowCount === 0 ? null : mapJob(result.rows[0]);
  }
}

function mapJob(row: Record<string, unknown>): JobWithCounts {
  return {
    job_id: String(row.job_id),
    title: String(row.title),
    job_family: String(row.job_family),
    seniority: String(row.seniority),
    country: String(row.country),
    city: String(row.city),
    created_at: new Date(String(row.created_at)).toISOString(),
    application_count: Number(row.application_count),
    new_count: Number(row.new_count),
    in_review_count: Number(row.in_review_count),
    shortlisted_count: Number(row.shortlisted_count),
    rejected_count: Number(row.rejected_count),
    hired_count: Number(row.hired_count),
  };
}
