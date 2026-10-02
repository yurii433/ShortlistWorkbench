import { useCallback, useEffect, useState } from "react";
import { fetchApplication, patchStatus, requestLlmScore } from "../../api";
import type { Application, Status } from "../../domain";
import { STATUSES, STATUS_LABELS } from "../../domain";
import { toPercent } from "../../format";
import { ErrorState } from "../ui/ErrorState";
import { StatusBadge } from "../ui/StatusBadge";

type Props = {
  /** The selected application, or "" when nothing is open. */
  applicationId: string;
  /** Reflects a saved change in the list row behind the panel. */
  onRowChange: (application: Application) => void;
  /** A confirmed status change: lets the page refresh its header counts. */
  onStatusSaved: () => void;
};

/**
 * The detail panel owns everything about the open application: loading it,
 * showing it, and the status / LLM actions. It tells the page about saved
 * changes so the row behind it and the header counts stay in sync.
 */
export function ApplicationDetail({ applicationId, onRowChange, onStatusSaved }: Props) {
  const [detail, setDetail] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setLlmError(null);
    try {
      setDetail(await fetchApplication(id));
    } catch {
      setDetail(null);
      setError("Could not load this application.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (applicationId) {
      void loadDetail(applicationId);
    } else {
      setDetail(null);
      setError(null);
      setLlmError(null);
    }
  }, [applicationId, loadDetail]);

  const onStatusChange = async (status: Status, note?: string) => {
    if (!detail) return;
    const previous = detail;
    // Optimistic: the panel and the row behind it update immediately, and roll
    // back together on failure.
    const optimistic = {
      ...detail,
      status,
      recruiter_note: note ?? detail.recruiter_note,
    };
    setDetail(optimistic);
    onRowChange(optimistic);
    try {
      const updated = await patchStatus(detail.application_id, status, note);
      setDetail(updated);
      onRowChange(updated);
      onStatusSaved();
    } catch {
      setDetail(previous);
      onRowChange(previous);
      setError("Status update failed. The previous value was restored.");
    }
  };

  const onScore = async () => {
    if (!detail) return;
    setLlmBusy(true);
    setLlmError(null);
    try {
      const updated = await requestLlmScore(detail.application_id);
      setDetail(updated);
      onRowChange(updated);
    } catch {
      setLlmError("LLM score is unavailable. The rest of this page still works.");
    } finally {
      setLlmBusy(false);
    }
  };

  if (loading) {
    return (
      <aside className="panel">
        <p className="muted">Loading application…</p>
      </aside>
    );
  }
  if (error) {
    return (
      <aside className="panel">
        <ErrorState
          message={error}
          onRetry={() => applicationId && void loadDetail(applicationId)}
        />
      </aside>
    );
  }
  if (!detail) {
    return (
      <aside className="panel empty-panel">
        <h2>Select an application</h2>
        <p>Open a row to see the candidate, job, and match scores.</p>
      </aside>
    );
  }

  return (
    <aside className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">{detail.application_id}</p>
          <h2>{detail.candidate.full_name}</h2>
          <p className="muted">{detail.candidate.email}</p>
        </div>
        <StatusBadge status={detail.status} />
      </header>

      <section>
        <h3>Job</h3>
        <p className="job-title">{detail.job.title}</p>
        <dl className="facts">
          <Fact label="Family" value={detail.job.job_family} />
          <Fact label="Seniority" value={detail.job.seniority} />
          <Fact
            label="Location"
            value={`${detail.job.city}, ${detail.job.country}`}
          />
          <Fact label="Source" value={detail.source} />
        </dl>
      </section>

      <section>
        <h3>Candidate</h3>
        <dl className="facts">
          <Fact
            label="Experience"
            value={`${detail.candidate.years_experience} years`}
          />
          <Fact label="Prefers" value={detail.candidate.preferred_job_family} />
          <Fact
            label="Based in"
            value={`${detail.candidate.city}, ${detail.candidate.country}`}
          />
        </dl>
      </section>

      <section className="scores">
        <div className="score-card">
          <p className="eyebrow">Rule-based</p>
          <p className="score-value">{toPercent(detail.match_score)}</p>
          <p className="muted">{detail.match_band} band · 0–100 scale</p>
        </div>
        <div className="score-card">
          <p className="eyebrow">LLM</p>
          {detail.llm_score != null ? (
            <>
              <p className="score-value">{detail.llm_score}</p>
              <p className="muted">{detail.llm_reason}</p>
              <p className="muted tiny">Cached · {detail.llm_model}</p>
            </>
          ) : (
            <>
              <p className="muted">Not scored yet. On demand only.</p>
              <button type="button" onClick={() => void onScore()} disabled={llmBusy}>
                {llmBusy ? "Scoring…" : "Get LLM score"}
              </button>
              {llmError ? <p className="error">{llmError}</p> : null}
            </>
          )}
        </div>
      </section>

      <section>
        <h3>Move application</h3>
        <div className="status-row">
          <select
            value={detail.status}
            onChange={(event) =>
              void onStatusChange(event.target.value as Status)
            }
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <NoteField
          detail={detail}
          onSave={(status, note) => void onStatusChange(status, note)}
        />
      </section>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Keeps a draft note and saves it with the current status on blur. Remounting via
 * `key` when the stored note changes picks up a note saved elsewhere.
 */
function NoteField({
  detail,
  onSave,
}: {
  detail: Application;
  onSave: (status: Status, note?: string) => void;
}) {
  const stored = detail.recruiter_note ?? "";
  return (
    <label className="note-label">
      Note (optional)
      <textarea
        key={detail.application_id + stored}
        defaultValue={stored}
        rows={3}
        onBlur={(event) => {
          const value = event.target.value.trim();
          if (value !== stored) {
            onSave(detail.status, value);
          }
        }}
      />
    </label>
  );
}
