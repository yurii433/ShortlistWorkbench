import { BadRequestError } from "../../errors.js";
import { readPaging, readSort, readText } from "../../http/list-query.js";
import { isStatus } from "../../types.js";
import {
  APPLICATION_SORT_FIELDS,
  type ApplicationListQuery,
  type UpdateApplicationInput,
} from "./application.types.js";

/** Turns the raw `GET /applications` query string into a list query. */
export function parseApplicationListQuery(
  query: Record<string, unknown>,
): ApplicationListQuery {
  const status = readText(query.status);
  if (status !== undefined && !isStatus(status)) {
    throw new BadRequestError("invalid_status");
  }

  return {
    ...readPaging(query),
    status,
    country: readText(query.country),
    jobFamily: readText(query.jobFamily),
    jobId: readText(query.jobId),
    search: readText(query.search),
    sort: readSort(query.sort, APPLICATION_SORT_FIELDS, "match_score"),
  };
}

/**
 * Only checks the shape of the body. Whether the status is one the pipeline
 * actually supports is a business rule, so the service decides that.
 */
export function parseUpdateApplicationBody(
  body: unknown,
): UpdateApplicationInput {
  const { status, note } = (body ?? {}) as {
    status?: unknown;
    note?: unknown;
  };

  if (typeof status !== "string") {
    throw new BadRequestError("invalid_status");
  }

  return { status, note: note as string | undefined };
}