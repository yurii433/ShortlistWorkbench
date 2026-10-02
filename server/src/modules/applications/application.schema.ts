import { BadRequestError } from "../../errors.js";
import {
  readNonNegativeInt,
  readPaging,
  readSort,
  readTextList,
} from "../../http/list-query.js";
import { isMatchBand, isStatus } from "../../types.js";
import {
  APPLICATION_SORT_FIELDS,
  type ApplicationListQuery,
  type UpdateApplicationInput,
} from "./application.types.js";

/** Turns the raw `GET /applications` query string into a list query. */
export function parseApplicationListQuery(
  query: Record<string, unknown>,
): ApplicationListQuery {
  const status = readTextList(query.status);
  if (!status.every(isStatus)) {
    throw new BadRequestError("invalid_status");
  }

  const matchBand = readTextList(query.matchBand);
  if (!matchBand.every(isMatchBand)) {
    throw new BadRequestError("invalid_match_band");
  }

  return {
    ...readPaging(query),
    status,
    source: readTextList(query.source),
    matchBand,
    candidateCountry: readTextList(query.candidateCountry),
    candidateCity: readTextList(query.candidateCity),
    preferredJobFamily: readTextList(query.preferredJobFamily),
    minExperience: readNonNegativeInt(query.minExperience),
    country: readTextList(query.country),
    jobFamily: readTextList(query.jobFamily),
    jobId: readTextList(query.jobId),
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