import type { Queryable } from "../../db/queryable.js";
import { FilterBuilder } from "../../db/filter-builder.js";
import {
  toIsoDate,
  toIsoDateOrNull,
  toTextOrNull,
} from "../../db/row-utils.js";
import { pageOffset, sqlDirection } from "../../http/list-query.js";
import type { Application, MatchBand, Status } from "../../types.js";
import type {
  ApplicationListQuery,
  ApplicationSortField,
} from "./application.types.js";

/**
 * The only place a user-supplied sort key turns into a SQL expression.
 */
const APPLICATION_SORT_SQL: Record<ApplicationSortField, string> = {
  match_score: "a.match_score",
  created_at: "a.created_at",
  score_disagreement: "ABS(a.llm_score - (a.match_score * 100))",
};

/** The query fields that are filter lists, i.e. every field but sort and paging. */
type ApplicationFilterKey = {
  [Key in keyof ApplicationListQuery]-?: ApplicationListQuery[Key] extends
    | string[]
    | undefined
    ? Key
    : never;
}[keyof ApplicationListQuery];

/**
 * The same allowlist idea for filter keys: each one maps to a fixed column, so
 * the loop below can never interpolate anything the caller sent. Candidate
 * filters are prefixed with `c.` and job filters with `j.` on purpose — the
 * workbench page filters candidates for a job it already knows.
 */
const APPLICATION_FILTER_COLUMNS = {
  status: "a.status",
  source: "a.source",
  matchBand: "a.match_band",
  jobId: "a.job_id",
  country: "j.country",
  jobFamily: "j.job_family",
  candidateCountry: "c.country",
  candidateCity: "c.city",
  preferredJobFamily: "c.preferred_job_family",
} as const satisfies Record<ApplicationFilterKey, string>;

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
  c.preferred_job_family,
  ARRAY(
    SELECT d.application_id
      FROM applications d
     WHERE d.job_id = a.job_id
       AND d.candidate_id = a.candidate_id
       AND d.application_id <> a.application_id
     ORDER BY d.created_at DESC, d.application_id DESC
  ) AS sibling_application_ids
`;

/** One join, so a list row never costs an extra query for its candidate. */
const FROM_APPLICATIONS = `
  FROM applications a
  JOIN jobs j ON j.job_id = a.job_id
  JOIN candidates c ON c.candidate_id = a.candidate_id
`;

const SELECT_ONE = `SELECT ${APPLICATION_COLUMNS} ${FROM_APPLICATIONS} WHERE a.application_id = $1`;

function mapApplication(row: Record<string, unknown>): Application {
  return {
    application_id: String(row.application_id),
    created_at: toIsoDate(row.created_at),
    source: String(row.source),
    match_score: Number(row.match_score),
    match_band: String(row.match_band) as MatchBand,
    status: String(row.status) as Status,
    status_updated_at: toIsoDateOrNull(row.status_updated_at),
    recruiter_note: toTextOrNull(row.recruiter_note),
    llm_score: row.llm_score == null ? null : Number(row.llm_score),
    llm_reason: toTextOrNull(row.llm_reason),
    llm_scored_at: toIsoDateOrNull(row.llm_scored_at),
    llm_model: toTextOrNull(row.llm_model),
    sibling_application_ids: (row.sibling_application_ids ?? []) as string[],
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

export type ApplicationListResult = {
  items: Application[];
  total: number;
};

export type ApplicationRepository = {
  list(query: ApplicationListQuery): Promise<ApplicationListResult>;
  findById(id: string): Promise<Application | null>;
  updateStatus(
    id: string,
    status: string,
    note: string | undefined,
  ): Promise<Application | null>;
  saveLlmScore(
    id: string,
    score: number,
    reason: string,
    model: string,
  ): Promise<void>;
};

export function createApplicationRepository(
  db: Queryable,
): ApplicationRepository {
  return {
    async list(query) {
      const filters = new FilterBuilder();

      for (const [key, column] of Object.entries(APPLICATION_FILTER_COLUMNS)) {
        filters.in(column, query[key as ApplicationFilterKey]);
      }
      filters.atLeast("c.years_experience", query.minExperience);

      // Sorting by the gap between the two scores only makes sense for rows
      // that have been scored, so the sort silently restricts the list.
      if (query.sort === "score_disagreement") {
        filters.isNotNull("a.llm_score");
      }

      const where = filters.where();
      const values = filters.params();
      const direction = sqlDirection(query.order);

      const countSql = `
        SELECT COUNT(*)::int AS total
        ${FROM_APPLICATIONS}
        ${where}
      `;
      const listSql = `
        SELECT ${APPLICATION_COLUMNS}
        ${FROM_APPLICATIONS}
        ${where}
        ORDER BY ${APPLICATION_SORT_SQL[query.sort]} ${direction}, a.application_id ASC
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
        items: listResult.rows.map(mapApplication),
        total: countResult.rows[0].total as number,
      };
    },

    async findById(id) {
      const result = await db.query(SELECT_ONE, [id]);
      if (result.rowCount === 0) return null;
      return mapApplication(result.rows[0]);
    },

    async updateStatus(id, status, note) {
      const result = await db.query(
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

      const getResult = await db.query(SELECT_ONE, [id]);
      return mapApplication(getResult.rows[0]);
    },

    async saveLlmScore(id, score, reason, model) {
      await db.query(
        `
        UPDATE applications
        SET llm_score = $2,
            llm_reason = $3,
            llm_scored_at = NOW(),
            llm_model = $4
        WHERE application_id = $1 AND llm_score IS NULL
        `,
        [id, score, reason, model],
      );
    },
  };
}