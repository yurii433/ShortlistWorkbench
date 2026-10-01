import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchApplication,
  fetchApplications,
  fetchJob,
  patchStatus,
  requestLlmScore,
  type ApplicationDetail,
  type JobListItem,
  type ListItem,
  type Status,
} from "./api";
import { ApplicationDetailPanel } from "./ApplicationDetailPanel";
import { Filters } from "./Filters";
import { StatusBadge } from "./StatusBadge";
import { useWorkbenchQuery } from "./useWorkbenchQuery";

const PAGE_SIZE = 20;

function ListSkeleton() {
  return (
    <table aria-hidden="true">
      <thead>
        <tr>
          <th>Candidate</th>
          <th>Match</th>
          <th>LLM</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          <tr key={index} className="skeleton-row">
            <td>
              <span className="skeleton-bar" style={{ width: "80%" }} />
            </td>
            <td>
              <span className="skeleton-bar" style={{ width: "50%" }} />
            </td>
            <td>
              <span className="skeleton-bar" style={{ width: "50%" }} />
            </td>
            <td>
              <span className="skeleton-bar" style={{ width: "70%" }} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Workbench() {
  const { query, setQuery } = useWorkbenchQuery();
  const navigate = useNavigate();
  const { jobId = "" } = useParams();
  const [job, setJob] = useState<JobListItem | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadJob = useCallback(async (id: string) => {
    setJobError(null);
    try {
      setJob(await fetchJob(id));
    } catch {
      setJob(null);
      setJobError("Could not load this job.");
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchApplications({
        status: query.status,
        country: query.country,
        jobFamily: "",
        jobId,
        sort: query.sort,
        order: query.order,
        page: query.page,
        pageSize: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setListError("Could not load applications. Is the API running?");
    } finally {
      setListLoading(false);
    }
  }, [query.status, query.country, query.sort, query.order, query.page, jobId]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setLlmError(null);
    try {
      const data = await fetchApplication(id);
      setDetail(data);
    } catch {
      setDetail(null);
      setDetailError("Could not load this application.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    void loadJob(jobId);
  }, [jobId, loadJob]);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    void loadList();
  }, [loadList, jobId]);

  useEffect(() => {
    if (!query.id) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    void loadDetail(query.id);
  }, [query.id, loadDetail]);

  const selectedId = query.id;

  const mergeItem = (updated: ApplicationDetail) => {
    setItems((current) =>
      current.map((item) =>
        item.application_id === updated.application_id
          ? { ...item, status: updated.status, llm_score: updated.llm_score }
          : item,
      ),
    );
    setDetail(updated);
  };

  const onStatusChange = async (status: Status, note?: string) => {
    if (!detail) {
      return;
    }
    const previous = detail;
    mergeItem({ ...detail, status, recruiter_note: note ?? detail.recruiter_note });
    try {
      const updated = await patchStatus(detail.application_id, status, note);
      mergeItem(updated);
      void loadJob(jobId);
    } catch {
      mergeItem(previous);
      setDetailError("Status update failed. The previous value was restored.");
    }
  };

  const onScore = async () => {
    if (!detail) {
      return;
    }
    setLlmBusy(true);
    setLlmError(null);
    try {
      const updated = await requestLlmScore(detail.application_id);
      mergeItem(updated);
    } catch {
      setLlmError("LLM score is unavailable. The rest of this page still works.");
    } finally {
      setLlmBusy(false);
    }
  };

  const rangeLabel = useMemo(() => {
    if (total === 0) {
      return "0 applications";
    }
    const from = (query.page - 1) * PAGE_SIZE + 1;
    const to = Math.min(query.page * PAGE_SIZE, total);
    return `${from}–${to} of ${total}`;
  }, [query.page, total]);

  if (!jobId) {
    return null;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">
            <button
              type="button"
              className="link-button"
              onClick={() => navigate("/")}
            >
              ← All jobs
            </button>
          </p>
          <h1>{job ? job.title : "Candidates"}</h1>
          <p className="muted">
            {job ? `${job.city}, ${job.country} · ${job.job_family} · ${job.seniority}` : jobId}
          </p>
        </div>
        <p className="muted">{rangeLabel}</p>
      </header>

      <Filters query={query} onChange={setQuery} />

      <div className="workbench">
        <section className="list-pane">
          <div className="list-body">
            {listLoading ? <ListSkeleton /> : null}
            {jobError ? <p className="error">{jobError}</p> : null}
            {listError ? (
              <div>
                <p className="error">{listError}</p>
                <button type="button" onClick={() => void loadList()}>
                  Retry
                </button>
              </div>
            ) : null}
            {!listLoading && !listError && items.length === 0 ? (
              <p className="empty">
                {query.sort === "score_disagreement"
                  ? "No LLM scores stored yet. Open an application and score it first."
                  : "No applications match these filters."}
              </p>
            ) : null}
            {!listLoading && !listError && items.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Match</th>
                    <th>LLM</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.application_id}
                      className={item.application_id === selectedId ? "selected" : undefined}
                      onClick={() => setQuery({ id: item.application_id })}
                    >
                      <td>
                        <strong>{item.candidate.full_name}</strong>
                        <div className="tiny muted">
                          {item.application_id} · {item.source}
                        </div>
                      </td>
                      <td>{Math.round(item.match_score * 100)}</td>
                      <td>{item.llm_score ?? "—"}</td>
                      <td>
                        <StatusBadge status={item.status} />
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
              disabled={query.page <= 1}
              onClick={() => setQuery({ page: query.page - 1 })}
            >
              Previous
            </button>
            <span>
              Page {query.page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={query.page >= pageCount}
              onClick={() => setQuery({ page: query.page + 1 })}
            >
              Next
            </button>
          </div>
        </section>

        <ApplicationDetailPanel
          detail={detail}
          loading={detailLoading}
          error={detailError}
          llmError={llmError}
          llmBusy={llmBusy}
          onRetry={() => query.id && void loadDetail(query.id)}
          onStatusChange={(status, note) => void onStatusChange(status, note)}
          onScore={() => void onScore()}
        />
      </div>
    </div>
  );
}
