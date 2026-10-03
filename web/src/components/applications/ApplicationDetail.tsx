import { useCallback, useEffect, useState } from "react";
import { fetchApplication, patchStatus, requestLlmScore } from "../../api";
import type { Application, Status } from "../../domain";
import {
  MATCH_BAND_LABELS,
  STATUSES,
  STATUS_LABELS,
  SOURCE_LABELS,
} from "../../domain";
import { toDateTime, toPercent } from "../../format";
import { ErrorState } from "../ui/ErrorState";
import { StatusBadge } from "../ui/StatusBadge";

type Props = {
  applicationId: string;
  onRowChange: (application: Application) => void;
  onClose: () => void;
};

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="panel-close"
      aria-label="Close application details"
      onClick={onClose}
    >
      ×
    </button>
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

export function ApplicationDetail({
  applicationId,
  onRowChange,
  onClose,
}: Props) {
  const [detail, setDetail] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmBusy, setLlmBusy] = useState(false);
  const [stagedStatus, setStagedStatus] = useState<Status | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setLlmError(null);
    try {
      const loaded = await fetchApplication(id);
      setDetail(loaded);
      setNoteDraft(loaded.recruiter_note ?? "");
      setStagedStatus(null);
      setJustSaved(false);
      setSaveError(null);
    } catch {
      setDetail(null);
      setError("Could not load this application.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDetail(applicationId);
  }, [applicationId, loadDetail]);

  const applyChange = (next: Application) => {
    setDetail(next);
    onRowChange(next);
  };

  const onStage = (next: Status) => {
    if (!detail) return;
    setJustSaved(false);
    setStagedStatus(next === detail.status ? null : next);
  };

  const onCommit = async () => {
    if (!detail || stagedStatus === null) return;

    const status = stagedStatus;
    const note = noteDraft.trim();
    const noteChanged = note !== (detail.recruiter_note ?? "");
    const previous = detail;

    setSaveError(null);
    setJustSaved(false);
    setStagedStatus(null);

    // Optimistic UI update
    applyChange({
      ...detail,
      status,
      recruiter_note: noteChanged ? note || null : detail.recruiter_note,
    });

    try {
      const updated = await patchStatus(
        detail.application_id,
        status,
        noteChanged ? note : undefined,
      );
      setNoteDraft(updated.recruiter_note ?? "");
      applyChange(updated);
      setJustSaved(true);
    } catch {
      applyChange(previous);
      setSaveError("Status update failed. The previous value was restored.");
    }
  };

  const onScore = async () => {
    if (!detail) return;
    setLlmBusy(true);
    setLlmError(null);
    try {
      applyChange(await requestLlmScore(detail.application_id));
    } catch {
      setLlmError(
        "LLM score is unavailable. The rest of this page still works.",
      );
    } finally {
      setLlmBusy(false);
    }
  };

  if (loading) {
    return (
      <aside className="panel">
        <div className="panel-state-actions">
          <CloseButton onClose={onClose} />
        </div>
        <p className="muted">Loading application…</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="panel">
        <div className="panel-state-actions">
          <CloseButton onClose={onClose} />
        </div>
        <ErrorState
          message={error}
          onRetry={() => void loadDetail(applicationId)}
        />
      </aside>
    );
  }

  if (!detail) return null;

  const moveFormClass = [
    "move-form",
    justSaved && "move-form--saved",
    stagedStatus && "move-form--staged",
  ]
    .filter(Boolean)
    .join(" ");

  const getHintMessage = () => {
    if (justSaved) {
      return `Saved. Moved to ${STATUS_LABELS[detail.status]}.`;
    }
    if (stagedStatus === null) {
      return "Pick a different status to stage a move.";
    }
    return `Moves to ${STATUS_LABELS[stagedStatus]}${
      noteDraft.trim() ? " and saves the note." : "."
    }`;
  };

  return (
    <aside className="panel">
      <header className="panel-header">
        <div>
          <p className="eyebrow">{detail.application_id}</p>
          <h2>{detail.candidate.full_name}</h2>
          <p className="muted">{detail.candidate.email}</p>
        </div>
        <div className="panel-actions">
          <StatusBadge status={detail.status} />
          <CloseButton onClose={onClose} />
        </div>
      </header>

      <section>
        <dl className="facts">
          <Fact label="Source" value={SOURCE_LABELS[detail.source]} />
          <Fact
            label="Match band"
            value={MATCH_BAND_LABELS[detail.match_band]}
          />
          <Fact
            label="Experience"
            value={`${detail.candidate.years_experience} years`}
          />
          <Fact label="Prefers" value={detail.candidate.preferred_job_family} />
          <Fact
            label="Based in"
            value={`${detail.candidate.city}, ${detail.candidate.country}`}
          />
          {detail.sibling_application_ids.length > 0 && (
            <Fact
              label="Applications to this job"
              value={String(detail.sibling_application_ids.length + 1)}
            />
          )}
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
              <p className="muted tiny">LLM · {detail.llm_model}</p>
            </>
          ) : (
            <>
              <p className="muted">Not scored yet. On demand only.</p>
              <button
                type="button"
                onClick={() => void onScore()}
                disabled={llmBusy}
              >
                {llmBusy ? "Scoring…" : "Get LLM score"}
              </button>
              {llmError && <p className="error">{llmError}</p>}
            </>
          )}
        </div>
      </section>

      <section>
        <h3>Move application</h3>
        <div className={moveFormClass}>
          <div className="move-field">
            <label className="field-label" htmlFor="move-status">
              New status
            </label>
            <select
              id="move-status"
              value={stagedStatus ?? detail.status}
              onChange={(e) => onStage(e.target.value as Status)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <p className="muted tiny">
              {detail.status_updated_at
                ? `Saved status last changed ${toDateTime(detail.status_updated_at)}`
                : "Status never changed yet."}
            </p>
          </div>

          <div className="move-field">
            <label className="field-label" htmlFor="move-note">
              Note (optional)
            </label>
            <textarea
              id="move-note"
              rows={3}
              value={noteDraft}
              placeholder="Add a short note regarding the status change"
              onChange={(e) => setNoteDraft(e.target.value)}
            />
          </div>

          {saveError && <p className="error">{saveError}</p>}

          <p
            className={`move-hint${justSaved ? " move-hint--saved" : ""}`}
            aria-live="polite"
          >
            {getHintMessage()}
          </p>

          <button
            type="button"
            className="move-commit"
            disabled={stagedStatus === null}
            onClick={() => void onCommit()}
          >
            Change status
          </button>
        </div>
      </section>
    </aside>
  );
}
