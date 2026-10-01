import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchApplication,
  fetchApplications,
  patchStatus,
  requestLlmScore,
  type ApplicationDetail,
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
          <th>Job</th>
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
              <span className="skeleton-bar" style={{ width: "90%" }} />
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

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchApplications({
        status: query.status,
        country: query.country,
        jobFamily: query.jobFamily,
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
  }, [query.status, query.country, query.jobFamily, query.sort, query.order, query.page]);

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
    void loadList();
  }, [loadList]);

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

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Trenkwalder · internal</p>
          <h1>Shortlist Workbench</h1>
        </div>
        <p className="muted">{rangeLabel}</p>
      </header>

      <Filters query={query} onChange={setQuery} />

      <div className="workbench">
        <section className="list-pane">
          <div className="list-body">
            {listLoading ? <ListSkeleton /> : null}
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
                    <th>Job</th>
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
                        <div className="tiny muted">{item.application_id}</div>
                      </td>
                      <td>
                        {item.job.title}
                        <div className="tiny muted">
                          {item.job.city}, {item.job.country} · {item.job.job_family}
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
