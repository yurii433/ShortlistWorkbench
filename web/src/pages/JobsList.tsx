import { useNavigate } from "react-router-dom";
import { JobFilters } from "../components/JobFilters";
import { ListSection } from "../components/ListSection";
import { Pager } from "../components/Pager";
import { pageCountOf, rangeLabel } from "../format";
import { useJobsQuery } from "./useJobsQuery";

const PAGE_SIZE = 20;
const COLUMNS = ["Job", "Family", "Location", "Applicants"];

export function JobsList() {
  const navigate = useNavigate();
  const { query, setQuery, items, total, loading, error, reload } = useJobsQuery();

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Trenkwalder · internal</p>
          <h1>Open jobs</h1>
        </div>
        <p className="muted">
          {rangeLabel(query.page, PAGE_SIZE, total, "jobs")}
        </p>
      </header>

      <JobFilters query={query} onChange={setQuery} />

      <section className="list-pane jobs-pane">
        <div className="list-body">
          <ListSection
            state={{ items, loading, error, reload }}
            columns={COLUMNS}
            emptyMessage="No jobs match these filters."
          >
            {(jobs) => (
              <table>
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.job_id}
                      onClick={() => navigate(`/job/${job.job_id}`)}
                    >
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
                          {job.shortlisted_count} shortlisted ·{" "}
                          {job.rejected_count} rejected · {job.hired_count} hired
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ListSection>
        </div>

        <Pager
          page={query.page}
          pageCount={pageCountOf(total, PAGE_SIZE)}
          onPage={(page) => setQuery({ page })}
        />
      </section>
    </div>
  );
}
