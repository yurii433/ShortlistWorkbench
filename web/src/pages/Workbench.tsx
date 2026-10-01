import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { fetchApplication, fetchJob, patchStatus, requestLlmScore } from "../api";
import type { Application, JobWithCounts, Status } from "../domain";
import { ApplicationDetailPanel } from "../components/ApplicationDetailPanel";
import { ApplicationFilters } from "../components/ApplicationFilters";
import { ListSection } from "../components/ListSection";
import { Pager } from "../components/Pager";
import { StatusBadge } from "../components/StatusBadge";
import { toPercent, pageCountOf, rangeLabel } from "../format";
import { useApplicationsQuery } from "./useApplicationsQuery";

const PAGE_SIZE = 20;
const COLUMNS = ["Candidate", "Match", "LLM", "Status"];

const EMPTY_MESSAGES: Record<string, string> = {
  score_disagreement:
    "No LLM scores stored yet. Open an application and score it first.",
};

export function Workbench() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const {
    query,
    setQuery,
    items,
    setItems,
    total,
    loading,
    error,
    reload,
  } = useApplicationsQuery(jobId ?? "");

  const [job, setJob] = useState<JobWithCounts | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Application | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);

  const loadJob = useCallback(async (id: string) => {
    setJobError(null);
    try {
      setJob(await fetchJob(id));
    } catch {
      setJob(null);
      setJobError("Could not load this job.");
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setLlmError(null);
    try {
      setDetail(await fetchApplication(id));
    } catch {
      setDetail(null);
      setDetailError("Could not load this application.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (jobId) void loadJob(jobId);
    else setJob(null);
  }, [jobId, loadJob]);

  useEffect(() => {
    if (query.id) void loadDetail(query.id);
    else setDetail(null);
  }, [query.id, loadDetail]);

  /** Reflects a change in both the open panel and the row behind it. */
  const mergeItem = (updated: Application) => {
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
    if (!detail) return;
    const previous = detail;
    // Optimistic: the row and panel update immediately, and roll back on failure.
    mergeItem({ ...detail, status, recruiter_note: note ?? detail.recruiter_note });
    try {
      const updated = await patchStatus(detail.application_id, status, note);
      mergeItem(updated);
      if (jobId) void loadJob(jobId);
    } catch {
      mergeItem(previous);
      setDetailError("Status update failed. The previous value was restored.");
    }
  };

  const onScore = async () => {
    if (!detail) return;
    setLlmBusy(true);
    setLlmError(null);
    try {
      mergeItem(await requestLlmScore(detail.application_id));
    } catch {
      setLlmError("LLM score is unavailable. The rest of this page still works.");
    } finally {
      setLlmBusy(false);
    }
  };

  if (!jobId) {
    return <Navigate to="/" replace />;
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
            {job
              ? `${job.city}, ${job.country} · ${job.job_family} · ${job.seniority}`
              : jobId}
          </p>
        </div>
        <p className="muted">
          {rangeLabel(query.page, PAGE_SIZE, total, "applications")}
        </p>
      </header>

      {jobError ? <p className="error">{jobError}</p> : null}

      <ApplicationFilters query={query} onChange={setQuery} />

      <div className="workbench">
        <section className="list-pane">
          <div className="list-body">
            <ListSection
              state={{ items, loading, error, reload }}
              columns={COLUMNS}
              emptyMessage={
                EMPTY_MESSAGES[query.sort] ?? "No applications match these filters."
              }
            >
              {(rows) => (
                <table>
                  <thead>
                    <tr>
                      {COLUMNS.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr
                        key={item.application_id}
                        className={
                          item.application_id === query.id ? "selected" : undefined
                        }
                        onClick={() => setQuery({ id: item.application_id })}
                      >
                        <td>
                          <strong>{item.candidate.full_name}</strong>
                          <div className="tiny muted">
                            {item.application_id} · {item.source}
                          </div>
                        </td>
                        <td>{toPercent(item.match_score)}</td>
                        <td>{item.llm_score ?? "—"}</td>
                        <td>
                          <StatusBadge status={item.status} />
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
