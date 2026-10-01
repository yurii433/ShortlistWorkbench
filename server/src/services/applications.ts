import type { Pool } from "pg";
import type { Candidate, Job, ListQuery, MatchScorer, Status } from "../types.js";

const LIST_SORT_SQL: Record<ListQuery["sort"], string> = {
  match_score: "a.match_score",
  created_at: "a.created_at",
  score_disagreement: "ABS(a.llm_score - (a.match_score * 100))",
};

function mapJob(row: Record<string, unknown>): Job {
  return {
    job_id: String(row.job_id),
    title: String(row.title),
    job_family: String(row.job_family),
    seniority: String(row.seniority),
    country: String(row.country),
    city: String(row.city),
    created_at: new Date(String(row.job_created_at ?? row.created_at)).toISOString(),
  };
}

function mapCandidate(row: Record<string, unknown>): Candidate {
  return {
    candidate_id: String(row.candidate_id),
    full_name: String(row.full_name),
    email: String(row.email),
    country: String(row.candidate_country ?? row.country),
    city: String(row.candidate_city ?? row.city),
    years_experience: Number(row.years_experience),
    preferred_job_family: String(row.preferred_job_family),
  };
}

export function toNumberScore(value: unknown): number {
  return Number(value);
}

export class ApplicationsService {
  constructor(
    private readonly pool: Pool,
    private readonly scorer: MatchScorer,
  ) {}

  async list(query: ListQuery) {
    const filters: string[] = [];
    const values: unknown[] = [];

    if (query.status) {
      values.push(query.status);
      filters.push(`a.status = $${values.length}`);
    }
    if (query.country) {
      values.push(query.country);
      filters.push(`j.country = $${values.length}`);
    }
    if (query.jobFamily) {
      values.push(query.jobFamily);
      filters.push(`j.job_family = $${values.length}`);
    }
    if (query.jobId) {
      values.push(query.jobId);
      filters.push(`a.job_id = $${values.length}`);
    }
    if (query.hasLlmScore || query.sort === "score_disagreement") {
      filters.push("a.llm_score IS NOT NULL");
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const sortExpr = LIST_SORT_SQL[query.sort];
    const direction = query.order === "asc" ? "ASC" : "DESC";
    const offset = (query.page - 1) * query.pageSize;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM applications a
      JOIN jobs j ON j.job_id = a.job_id
      JOIN candidates c ON c.candidate_id = a.candidate_id
      ${where}
    `;
    const listSql = `
      SELECT
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
        j.country AS job_country,
        j.city AS job_city,
        c.candidate_id,
        c.full_name
      FROM applications a
      JOIN jobs j ON j.job_id = a.job_id
      JOIN candidates c ON c.candidate_id = a.candidate_id
      ${where}
      ORDER BY ${sortExpr} ${direction}, a.application_id ASC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const [countResult, listResult] = await Promise.all([
      this.pool.query(countSql, values),
      this.pool.query(listSql, [...values, query.pageSize, offset]),
    ]);

    return {
      items: listResult.rows.map((row) => ({
        application_id: row.application_id,
        created_at: new Date(row.created_at).toISOString(),
        source: row.source,
        match_score: toNumberScore(row.match_score),
        match_band: row.match_band,
        status: row.status,
        status_updated_at: row.status_updated_at
          ? new Date(row.status_updated_at).toISOString()
          : null,
        recruiter_note: row.recruiter_note,
        llm_score: row.llm_score,
        llm_reason: row.llm_reason,
        job: {
          job_id: row.job_id,
          title: row.title,
          job_family: row.job_family,
          seniority: row.seniority,
          country: row.job_country,
          city: row.job_city,
        },
        candidate: {
          candidate_id: row.candidate_id,
          full_name: row.full_name,
        },
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
      FROM applications a
      JOIN jobs j ON j.job_id = a.job_id
      JOIN candidates c ON c.candidate_id = a.candidate_id
      WHERE a.application_id = $1
      `,
      [id],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.mapDetail(result.rows[0] as Record<string, unknown>);
  }

  async updateStatus(id: string, status: Status, note?: string) {
    const result = await this.pool.query(
      `
      UPDATE applications
      SET status = $2,
          status_updated_at = NOW(),
          recruiter_note = COALESCE($3, recruiter_note)
      WHERE application_id = $1
      RETURNING application_id
      `,
      [id, status, note ?? null],
    );
    if (result.rowCount === 0) {
      return null;
    }
    return this.getById(id);
  }

  async scoreWithLlm(id: string) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query(
        `
        SELECT
          a.application_id,
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
        FROM applications a
        JOIN jobs j ON j.job_id = a.job_id
        JOIN candidates c ON c.candidate_id = a.candidate_id
        WHERE a.application_id = $1
        FOR UPDATE OF a
        `,
        [id],
      );
      if (locked.rowCount === 0) {
        await client.query("ROLLBACK");
        return { kind: "not_found" as const };
      }
      const row = locked.rows[0] as Record<string, unknown>;
      if (row.llm_score != null) {
        await client.query("COMMIT");
        return { kind: "ok" as const, application: await this.getById(id) };
      }

      const job = mapJob(row);
      const candidate = mapCandidate(row);
      let scored;
      try {
        scored = await this.scorer.score({ job, candidate });
      } catch {
        await client.query("ROLLBACK");
        return { kind: "llm_unavailable" as const };
      }

      if (
        !Number.isInteger(scored.score) ||
        scored.score < 0 ||
        scored.score > 100 ||
        !scored.reason?.trim()
      ) {
        await client.query("ROLLBACK");
        return { kind: "llm_unavailable" as const };
      }

      await client.query(
        `
        UPDATE applications
        SET llm_score = $2,
            llm_reason = $3,
            llm_scored_at = NOW(),
            llm_model = $4
        WHERE application_id = $1
        `,
        [id, scored.score, scored.reason.trim(), this.scorer.model],
      );
      await client.query("COMMIT");
      return { kind: "ok" as const, application: await this.getById(id) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private mapDetail(row: Record<string, unknown>) {
    return {
      application_id: String(row.application_id),
      created_at: new Date(String(row.created_at)).toISOString(),
      source: String(row.source),
      match_score: toNumberScore(row.match_score),
      match_band: String(row.match_band),
      status: String(row.status),
      status_updated_at: row.status_updated_at
        ? new Date(String(row.status_updated_at)).toISOString()
        : null,
      recruiter_note: row.recruiter_note ? String(row.recruiter_note) : null,
      llm_score: row.llm_score == null ? null : Number(row.llm_score),
      llm_reason: row.llm_reason ? String(row.llm_reason) : null,
      llm_scored_at: row.llm_scored_at
        ? new Date(String(row.llm_scored_at)).toISOString()
        : null,
      llm_model: row.llm_model ? String(row.llm_model) : null,
      job: mapJob(row),
      candidate: mapCandidate(row),
    };
  }
}
