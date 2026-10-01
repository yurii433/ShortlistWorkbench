import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJobs, type JobListItem } from "./api";
import { useWorkbenchQuery } from "./useWorkbenchQuery";

const PAGE_SIZE = 20;

const FAMILIES = [
  "Logistics",
  "Manufacturing",
  "Healthcare",
  "Office & Admin",
  "IT",
];

function JobsSkeleton() {
  return (
    <table aria-hidden="true">
      <thead>
        <tr>
          <th>Job</th>
          <th>Family</th>
          <th>Location</th>
          <th>Applicants</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 8 }, (_, index) => (
          <tr key={index} className="skeleton-row">
            <td>
              <span className="skeleton-bar" style={{ width: "80%" }} />
            </td>
            <td>
              <span className="skeleton-bar" style={{ width: "60%" }} />
            </td>
            <td>
              <span className="skeleton-bar" style={{ width: "70%" }} />
            </td>
            <td>
              <span className="skeleton-bar" style={{ width: "50%" }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function JobsList() {
  const { query, setQuery } = useWorkbenchQuery();
  const navigate = useNavigate();
  const [items, setItems] = useState<JobListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJobs({
        country: query.jobCountry,
        jobFamily: query.jobFamily,
        search: query.jobSearch,
        sort: query.jobSort,
        order: query.jobOrder,
        page: query.jobPage,
        pageSize: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError("Could not load jobs. Is the API running?");
    } finally {
      setLoading(false);
    }
  }, [
    query.jobCountry,
    query.jobFamily,
    query.jobSearch,
    query.jobSort,
    query.jobOrder,
    query.jobPage,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const rangeLabel = useMemo(() => {
    if (total === 0) {
      return "0 jobs";
    }
    const from = (query.jobPage - 1) * PAGE_SIZE + 1;
    const to = Math.min(query.jobPage * PAGE_SIZE, total);
    return `${from}–${to} of ${total} jobs`;
  }, [query.jobPage, total]);

  const openJob = (jobId: string) => {
    navigate(`/job/${jobId}`);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Trenkwalder · internal</p>
          <h1>Open jobs</h1>
        </div>
        <p className="muted">{rangeLabel}</p>
      </header>

      <div className="filters filters-jobs">
        <label>
          Search
          <input
            type="search"
            value={query.jobSearch}
            placeholder="Title or city"
            onChange={(event) => setQuery({ jobSearch: event.target.value, jobPage: 1 })}
          />
        </label>
        <label>
          Country
          <select
            value={query.jobCountry}
            onChange={(event) => setQuery({ jobCountry: event.target.value, jobPage: 1 })}
          >
            <option value="">All</option>
            <option value="DE">Germany</option>
            <option value="AT">Austria</option>
          </select>
        </label>
        <label>
          Job family
          <select
            value={query.jobFamily}
            onChange={(event) => setQuery({ jobFamily: event.target.value, jobPage: 1 })}
          >
            <option value="">All</option>
            {FAMILIES.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            value={`${query.jobSort}:${query.jobOrder}`}
            onChange={(event) => {
              const [jobSort, jobOrder] = event.target.value.split(":");
              setQuery({ jobSort, jobOrder, jobPage: 1 });
            }}
          >
            <option value="application_count:desc">Most applicants</option>
            <option value="application_count:asc">Fewest applicants</option>
            <option value="created_at:desc">Newest first</option>
            <option value="created_at:asc">Oldest first</option>
            <option value="title:asc">Title (A → Z)</option>
            <option value="title:desc">Title (Z → A)</option>
          </select>
        </label>
      </div>

      <section className="list-pane jobs-pane">
        <div className="list-body">
          {loading ? <JobsSkeleton /> : null}
          {error ? (
            <div>
              <p className="error">{error}</p>
              <button type="button" onClick={() => void load()}>
                Retry
              </button>
            </div>
          ) : null}
          {!loading && !error && items.length === 0 ? (
            <p className="empty">No jobs match these filters.</p>
          ) : null}
          {!loading && !error && items.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Family</th>
                  <th>Location</th>
                  <th>Applicants</th>
                </tr>
              </thead>
              <tbody>
                {items.map((job) => (
                  <tr key={job.job_id} onClick={() => openJob(job.job_id)}>
                    <td>
                      <strong>{job.title}</strong>
                      <div className="tiny muted">
                        {job.job_id} · {job.seniority}
                      </div>
                    </td>
                    <td>{job.job_family}</td>
                    <td>
                      {job.city}, {job.country}
                    </td>
                    <td>
                      <strong>{job.application_count}</strong>
                      <div className="tiny muted">
                        {job.new_count} new · {job.in_review_count} in review ·{" "}
                        {job.shortlisted_count} shortlisted · {job.hired_count} hired
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        <div className="pager">
          <button
            type="button"
            disabled={query.jobPage <= 1}
            onClick={() => setQuery({ jobPage: query.jobPage - 1 })}
          >
            Previous
          </button>
          <span>
            Page {query.jobPage} / {pageCount}
          </span>
          <button
            type="button"
            disabled={query.jobPage >= pageCount}
            onClick={() => setQuery({ jobPage: query.jobPage + 1 })}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}