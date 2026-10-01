import type { Pool } from "pg";
import type { JobWithCounts, JobListQuery } from "../types.js";

export const JOB_SORT_SQL: Record<string, string> = {
  created_at: "j.created_at",
  title: "j.title",
  application_count: "COUNT(a.application_id)",
};

export const JOB_COLUMNS = `
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

export const FROM_JOBS = `
  FROM jobs j
  LEFT JOIN applications a ON a.job_id = j.job_id
`;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toIsoDate(value: unknown): string {
  return new Date(String(value)).toISOString();
}

export function mapJob(row: Record<string, unknown>): JobWithCounts {
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

function parseListQuery(query: Record<string, unknown>): { ok: true; value: JobListQuery } | { ok: false; error: string } {
  const sortFields = ["created_at", "title", "application_count"] as const;
  const defaultSort = "created_at" as const;

  const sort = (typeof query.sort === "string" && query.sort.trim() !== "" ? query.sort : defaultSort) as typeof sortFields[number];
  if (!sortFields.includes(sort)) {
    return { ok: false, error: "invalid_sort" };
  }

  const order = typeof query.order === "string" && query.order.trim() !== "" ? query.order : "desc";
  if (order !== "asc" && order !== "desc") {
    return { ok: false, error: "invalid_order" };
  }

  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isInteger(page) || page < 1) {
    return { ok: false, error: "invalid_page" };
  }

  const pageSize = query.pageSize === undefined ? DEFAULT_PAGE_SIZE : Number(query.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return { ok: false, error: "invalid_page_size" };
  }

  return {
    ok: true,
    value: {
      country: typeof query.country === "string" && query.country.trim() !== "" ? query.country : undefined,
      jobFamily: typeof query.jobFamily === "string" && query.jobFamily.trim() !== "" ? query.jobFamily : undefined,
      search: typeof query.search === "string" && query.search.trim() !== "" ? query.search : undefined,
      sort,
      order,
      page,
      pageSize: Math.min(pageSize, MAX_PAGE_SIZE),
    },
  };
}

export async function listJobs(pool: Pool, query: Record<string, unknown>): Promise<{ items: JobWithCounts[]; page: number; pageSize: number; total: number }> {
  const parsed = parseListQuery(query);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  const q = parsed.value;
  const filters: string[] = [];
  const values: unknown[] = [];

  const filterBy = (column: string, value: string | undefined) => {
    if (!value) return;
    values.push(value);
    filters.push(`${column} = $${values.length}`);
  };

  filterBy("j.country", q.country);
  filterBy("j.job_family", q.jobFamily);

  if (q.search) {
    values.push(`%${q.search}%`);
    filters.push(`(j.title ILIKE $${values.length} OR j.city ILIKE $${values.length})`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const direction = q.order === "asc" ? "ASC" : "DESC";
  const offset = (q.page - 1) * q.pageSize;

  const countSql = `SELECT COUNT(DISTINCT j.job_id)::int AS total ${FROM_JOBS} ${where}`;
  const listSql = `
    SELECT ${JOB_COLUMNS}
    ${FROM_JOBS}
    ${where}
    GROUP BY j.job_id
    ORDER BY ${JOB_SORT_SQL[q.sort]} ${direction}, j.job_id ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const [countResult, listResult] = await Promise.all([
    pool.query(countSql, values),
    pool.query(listSql, [...values, q.pageSize, offset]),
  ]);

  return {
    items: listResult.rows.map(mapJob),
    page: q.page,
    pageSize: q.pageSize,
    total: countResult.rows[0].total as number,
  };
}

export async function getJobById(pool: Pool, id: string): Promise<JobWithCounts | null> {
  const result = await pool.query(
    `SELECT ${JOB_COLUMNS} ${FROM_JOBS} WHERE j.job_id = $1 GROUP BY j.job_id`,
    [id],
  );
  if (result.rowCount === 0) return null;
  return mapJob(result.rows[0]);
}