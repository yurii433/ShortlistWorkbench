import type { ApplicationDetail, Status } from "./api";
import { STATUSES } from "./api";
import { StatusBadge } from "./StatusBadge";

type Props = {
  detail: ApplicationDetail | null;
  loading: boolean;
  error: string | null;
  llmError: string | null;
  llmBusy: boolean;
  onRetry: () => void;
  onStatusChange: (status: Status, note?: string) => void;
  onScore: () => void;
};

function rulePercent(score: number): number {
  return Math.round(score * 100);
}

export function ApplicationDetailPanel({
  detail,
  loading,
  error,
  llmError,
  llmBusy,
  onRetry,
  onStatusChange,
  onScore,
}: Props) {
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
        <p className="error">{error}</p>
        <button type="button" onClick={onRetry}>
          Retry
        </button>
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
          <div>
            <dt>Family</dt>
            <dd>{detail.job.job_family}</dd>
          </div>
          <div>
            <dt>Seniority</dt>
            <dd>{detail.job.seniority}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>
              {detail.job.city}, {detail.job.country}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{detail.source}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>Candidate</h3>
        <dl className="facts">
          <div>
            <dt>Experience</dt>
            <dd>{detail.candidate.years_experience} years</dd>
          </div>
          <div>
            <dt>Prefers</dt>
            <dd>{detail.candidate.preferred_job_family}</dd>
          </div>
          <div>
            <dt>Based in</dt>
            <dd>
              {detail.candidate.city}, {detail.candidate.country}
            </dd>
          </div>
        </dl>
      </section>

      <section className="scores">
        <div className="score-card">
          <p className="eyebrow">Rule-based</p>
          <p className="score-value">{rulePercent(detail.match_score)}</p>
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
              <button type="button" onClick={onScore} disabled={llmBusy}>
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
            onChange={(event) => onStatusChange(event.target.value as Status)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <label className="note-label">
          Note (optional)
          <textarea
            key={detail.application_id + (detail.recruiter_note ?? "")}
            defaultValue={detail.recruiter_note ?? ""}
            rows={3}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (value !== (detail.recruiter_note ?? "")) {
                onStatusChange(detail.status, value);
              }
            }}
          />
        </label>
      </section>
    </aside>
  );
}
