import type { Pool } from "pg";
import type {
  Application,
  ListQuery,
  MatchScorer,
  Status,
} from "../types.js";
import { parseLlmScore } from "./llm/parse.js";

const LIST_SORT_SQL: Record<ListQuery["sort"], string> = {
  match_score: "a.match_score",
  created_at: "a.created_at",
  score_disagreement: "ABS(a.llm_score - (a.match_score * 100))",
};

/**
 * The column list every application query selects. Kept in one place so the list,
 * the detail and the LLM prompt can never drift apart.
 */
const APPLICATION_COLUMNS = `
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

const FROM_APPLICATIONS = `
  FROM applications a
  JOIN jobs j ON j.job_id = a.job_id
  JOIN candidates c ON c.candidate_id = a.candidate_id
`;

export type ScoreResult =
  | { kind: "ok"; application: Application }
  | { kind: "not_found" }
  | { kind: "llm_unavailable" };

export class ApplicationsService {
  constructor(
    private readonly pool: Pool,
    private readonly scorer: MatchScorer,
  ) {}

  async list(query: ListQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];

    const filterBy = (column: string, value: string | undefined) => {
      if (!value) {
        return;
      }
      values.push(value);
      filters.push(`${column} = $${values.length}`);
    };

    filterBy("a.status", query.status);
    filterBy("j.country", query.country);
    filterBy("j.job_family", query.jobFamily);
    filterBy("a.job_id", query.jobId);

    // Sorting by disagreement only makes sense for applications that have one.
    if (query.sort === "score_disagreement") {
      filters.push("a.llm_score IS NOT NULL");
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const direction = query.order === "asc" ? "ASC" : "DESC";
    const offset = (query.page - 1) * query.pageSize;

    const countSql = `
      SELECT COUNT(*)::int AS total
      ${FROM_APPLICATIONS}
      ${where}
    `;
    const listSql = `
      SELECT ${APPLICATION_COLUMNS}
      ${FROM_APPLICATIONS}
      ${where}
      ORDER BY ${LIST_SORT_SQL[query.sort]} ${direction}, a.application_id ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const [countResult, listResult] = await Promise.all([
      this.pool.query(countSql, values),
      this.pool.query(listSql, [...values, query.pageSize, offset]),
    ]);

    return {
      items: listResult.rows.map(mapApplication),
      page: query.page,
      pageSize: query.pageSize,
      total: countResult.rows[0].total as number,
    };
  }

  async getById(id: string): Promise<Application | null> {
    const result = await this.pool.query(
      `SELECT ${APPLICATION_COLUMNS} ${FROM_APPLICATIONS} WHERE a.application_id = $1`,
      [id],
    );
    return result.rowCount === 0 ? null : mapApplication(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: Status,
    note?: string,
  ): Promise<Application | null> {
    const result = await this.pool.query(
      `
      UPDATE applications
      SET status = $2,
          status_updated_at = NOW(),
          recruiter_note = COALESCE($3, recruiter_note)
      WHERE application_id = $1
      `,
      [id, status, note ?? null],
    );
    return result.rowCount === 0 ? null : this.getById(id);
  }

  /**
   * Scores on demand and caches the result on the application. The write is
   * guarded by `llm_score IS NULL`, so two concurrent callers can never store
   * two different scores and a repeat call never reaches the model again.
   */
  async scoreWithLlm(id: string): Promise<ScoreResult> {
    const application = await this.getById(id);
    if (!application) {
      return { kind: "not_found" };
    }
    if (application.llm_score !== null) {
      return { kind: "ok", application };
    }

    let scored;
    try {
      scored = parseLlmScore(
        await this.scorer.score({
          job: application.job,
          candidate: application.candidate,
        }),
      );
    } catch {
      return { kind: "llm_unavailable" };
    }

    await this.pool.query(
      `
      UPDATE applications
      SET llm_score = $2,
          llm_reason = $3,
          llm_scored_at = NOW(),
          llm_model = $4
      WHERE application_id = $1 AND llm_score IS NULL
      `,
      [id, scored.score, scored.reason, this.scorer.model],
    );
    return { kind: "ok", application: (await this.getById(id))! };
  }
}

function mapApplication(row: Record<string, unknown>): Application {
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

function toIsoDate(value: unknown): string {
  return new Date(String(value)).toISOString();
}

function toIsoDateOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : toIsoDate(value);
}

function toTextOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}
