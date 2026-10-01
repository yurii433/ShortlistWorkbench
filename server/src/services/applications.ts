import type { Pool } from "pg";
import type { MatchScorer, Application, ApplicationSortField, Status } from "../types.js";
import { parseLlmScore } from "../llm.js";

export const APPLICATION_SORT_SQL: Record<string, string> = {
  match_score: "a.match_score",
  created_at: "a.created_at",
  score_disagreement: "ABS(a.llm_score - (a.match_score * 100))",
};

export const APPLICATION_COLUMNS = `
  a.application_id,
  a.created_at,
  a.source,
  a.match_score,
  a.match_band,
  a.status,
  a.status_updated_at,
  a.recruiter_note,
  a.llm_score,
  a.llm_reason,
  a.llm_scored_at,
  a.llm_model,
  j.job_id,
  j.title,
  j.job_family,
  j.seniority,
  j.country,
  j.city,
  j.created_at AS job_created_at,
  c.candidate_id,
  c.full_name,
  c.email,
  c.country AS candidate_country,
  c.city AS candidate_city,
  c.years_experience,
  c.preferred_job_family
`;

export const FROM_APPLICATIONS = `
  FROM applications a
  JOIN jobs j ON j.job_id = a.job_id
  JOIN candidates c ON c.candidate_id = a.candidate_id
`;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const STATUSES = [
  "new",
  "in_review",
  "shortlisted",
  "rejected",
  "hired",
] as const;

function toIsoDate(value: unknown): string {
  return new Date(String(value)).toISOString();
}

function toIsoDateOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : toIsoDate(value);
}

function toTextOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

export function mapApplication(row: Record<string, unknown>): Application {
  return {
    application_id: String(row.application_id),
    created_at: toIsoDate(row.created_at),
    source: String(row.source),
    match_score: Number(row.match_score),
    match_band: String(row.match_band),
    status: String(row.status) as Status,
    status_updated_at: toIsoDateOrNull(row.status_updated_at),
    recruiter_note: toTextOrNull(row.recruiter_note),
    llm_score: row.llm_score == null ? null : Number(row.llm_score),
    llm_reason: toTextOrNull(row.llm_reason),
    llm_scored_at: toIsoDateOrNull(row.llm_scored_at),
    llm_model: toTextOrNull(row.llm_model),
    job: {
      job_id: String(row.job_id),
      title: String(row.title),
      job_family: String(row.job_family),
      seniority: String(row.seniority),
      country: String(row.country),
      city: String(row.city),
      created_at: toIsoDate(row.job_created_at),
    },
    candidate: {
      candidate_id: String(row.candidate_id),
      full_name: String(row.full_name),
      email: String(row.email),
      country: String(row.candidate_country),
      city: String(row.candidate_city),
      years_experience: Number(row.years_experience),
      preferred_job_family: String(row.preferred_job_family),
    },
  };
}

function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

interface ListQueryParsed {
  status?: string;
  country?: string;
  jobFamily?: string;
  jobId?: string;
  search?: string;
  sort: ApplicationSortField;
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

function parseListQuery(query: Record<string, unknown>): { ok: true; value: ListQueryParsed } | { ok: false; error: string } {
  const sortFields = ["match_score", "created_at", "score_disagreement"] as const;
  const defaultSort = "match_score" as const;

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

  const status = typeof query.status === "string" && query.status.trim() !== "" ? query.status : undefined;
  if (status && !isStatus(status)) {
    return { ok: false, error: "invalid_status" };
  }

  return {
    ok: true,
    value: {
      status,
      country: typeof query.country === "string" && query.country.trim() !== "" ? query.country : undefined,
      jobFamily: typeof query.jobFamily === "string" && query.jobFamily.trim() !== "" ? query.jobFamily : undefined,
      jobId: typeof query.jobId === "string" && query.jobId.trim() !== "" ? query.jobId : undefined,
      search: typeof query.search === "string" && query.search.trim() !== "" ? query.search : undefined,
      sort,
      order,
      page,
      pageSize: Math.min(pageSize, MAX_PAGE_SIZE),
    },
  };
}

export async function listApplications(
  pool: Pool,
  query: Record<string, unknown>,
): Promise<{ items: Application[]; page: number; pageSize: number; total: number }> {
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

  filterBy("a.status", q.status);
  filterBy("j.country", q.country);
  filterBy("j.job_family", q.jobFamily);
  filterBy("a.job_id", q.jobId);

  if (q.sort === "score_disagreement") {
    filters.push("a.llm_score IS NOT NULL");
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const direction = q.order === "asc" ? "ASC" : "DESC";
  const offset = (q.page - 1) * q.pageSize;

  const countSql = `
    SELECT COUNT(*)::int AS total
    ${FROM_APPLICATIONS}
    ${where}
  `;
  const listSql = `
    SELECT ${APPLICATION_COLUMNS}
    ${FROM_APPLICATIONS}
    ${where}
    ORDER BY ${APPLICATION_SORT_SQL[q.sort]} ${direction}, a.application_id ASC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}
  `;

  const [countResult, listResult] = await Promise.all([
    pool.query(countSql, values),
    pool.query(listSql, [...values, q.pageSize, offset]),
  ]);

  return {
    items: listResult.rows.map(mapApplication),
    page: q.page,
    pageSize: q.pageSize,
    total: countResult.rows[0].total as number,
  };
}

export async function getApplicationById(pool: Pool, id: string): Promise<Application | null> {
  const result = await pool.query(
    `SELECT ${APPLICATION_COLUMNS} ${FROM_APPLICATIONS} WHERE a.application_id = $1`,
    [id],
  );
  if (result.rowCount === 0) return null;
  return mapApplication(result.rows[0]);
}

export async function updateApplicationStatus(
  pool: Pool,
  id: string,
  status: string,
  note: string | undefined,
): Promise<Application | null> {
  if (!isStatus(status)) {
    throw new Error("invalid_status");
  }
  if (note !== undefined && typeof note !== "string") {
    throw new Error("invalid_note");
  }

  const result = await pool.query(
    `
    UPDATE applications
    SET status = $2,
        status_updated_at = NOW(),
        recruiter_note = COALESCE($3, recruiter_note)
    WHERE application_id = $1
    `,
    [id, status, note ?? null],
  );
  if (result.rowCount === 0) return null;

  const getResult = await pool.query(
    `SELECT ${APPLICATION_COLUMNS} ${FROM_APPLICATIONS} WHERE a.application_id = $1`,
    [id],
  );
  return mapApplication(getResult.rows[0]);
}

export async function scoreApplicationWithLlm(
  pool: Pool,
  scorer: MatchScorer,
  id: string,
): Promise<Application> {
  const applicationResult = await pool.query(
    `SELECT ${APPLICATION_COLUMNS} ${FROM_APPLICATIONS} WHERE a.application_id = $1`,
    [id],
  );
  if (applicationResult.rowCount === 0) {
    throw new Error("not_found");
  }

  const application = mapApplication(applicationResult.rows[0]);
  if (application.llm_score !== null) {
    return application;
  }

  let scored;
  try {
    scored = parseLlmScore(
      await scorer.score({
        job: application.job,
        candidate: application.candidate,
      }),
    );
  } catch {
    throw new Error("llm_unavailable");
  }

  await pool.query(
    `
    UPDATE applications
    SET llm_score = $2,
        llm_reason = $3,
        llm_scored_at = NOW(),
        llm_model = $4
    WHERE application_id = $1 AND llm_score IS NULL
    `,
    [id, scored.score, scored.reason, scorer.model],
  );

  const getResult = await pool.query(
    `SELECT ${APPLICATION_COLUMNS} ${FROM_APPLICATIONS} WHERE a.application_id = $1`,
    [id],
  );
  return mapApplication(getResult.rows[0]);
}