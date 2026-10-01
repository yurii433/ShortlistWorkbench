import type { Pool } from "pg";
import type { JobListQuery } from "../types.js";

const JOB_SORT_SQL: Record<JobListQuery["sort"], string> = {
  created_at: "j.created_at",
  title: "j.title",
  application_count: "COUNT(a.application_id)",
};

export class JobsService {
  constructor(private readonly pool: Pool) {}

  async list(query: JobListQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];

    if (query.country) {
      values.push(query.country);
      filters.push(`j.country = $${values.length}`);
    }
    if (query.jobFamily) {
      values.push(query.jobFamily);
      filters.push(`j.job_family = $${values.length}`);
    }
    if (query.search) {
      values.push(`%${query.search}%`);
      filters.push(`(j.title ILIKE $${values.length} OR j.city ILIKE $${values.length})`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const sortExpr = JOB_SORT_SQL[query.sort];
    const direction = query.order === "asc" ? "ASC" : "DESC";
    const offset = (query.page - 1) * query.pageSize;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM jobs j
      ${where}
    `;
    const listSql = `
      SELECT
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
        COUNT(a.application_id) FILTER (WHERE a.status = 'hired')::int AS hired_count
      FROM jobs j
      LEFT JOIN applications a ON a.job_id = j.job_id
      ${where}
      GROUP BY j.job_id
      ORDER BY ${sortExpr} ${direction}, j.job_id ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const [countResult, listResult] = await Promise.all([
      this.pool.query(countSql, values),
      this.pool.query(listSql, [...values, query.pageSize, offset]),
    ]);

    return {
      items: listResult.rows.map((row) => ({
        job_id: String(row.job_id),
        title: String(row.title),
        job_family: String(row.job_family),
        seniority: String(row.seniority),
        country: String(row.country),
        city: String(row.city),
        created_at: new Date(row.created_at).toISOString(),
        application_count: Number(row.application_count),
        new_count: Number(row.new_count),
        in_review_count: Number(row.in_review_count),
        shortlisted_count: Number(row.shortlisted_count),
        hired_count: Number(row.hired_count),
      })),
      page: query.page,
      pageSize: query.pageSize,
      total: countResult.rows[0].total as number,
    };
  }

  async getById(id: string) {
    const result = await this.pool.query(
      `
      SELECT
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
        COUNT(a.application_id) FILTER (WHERE a.status = 'hired')::int AS hired_count
      FROM jobs j
      LEFT JOIN applications a ON a.job_id = j.job_id
      WHERE j.job_id = $1
      GROUP BY j.job_id
      `,
      [id],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapJob(result.rows[0]);
  }

  private mapJob(row: Record<string, unknown>) {
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
      hired_count: Number(row.hired_count),
    };
  }
}