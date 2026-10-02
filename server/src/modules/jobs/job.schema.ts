import { readPaging, readSort, readText } from "../../http/list-query.js";
import { JOB_SORT_FIELDS, type JobListQuery } from "./job.types.js";

/** Turns the raw `GET /jobs` query string into a job list query. */
export function parseJobListQuery(query: Record<string, unknown>): JobListQuery {
  return {
    ...readPaging(query),
    country: readText(query.country),
    jobFamily: readText(query.jobFamily),
    search: readText(query.search),
    sort: readSort(query.sort, JOB_SORT_FIELDS, "created_at"),
  };
}