import { useCallback, useEffect, useState } from "react";
import { fetchApplication, patchStatus, requestLlmScore } from "../../api";
import type { Application, Status } from "../../domain";
import {
  MATCH_BAND_LABELS,
  STATUSES,
  STATUS_LABELS,
  SOURCE_LABELS,
} from "../../domain";
import { toAge, toDate, toDateTime, toPercent } from "../../format";
import { ErrorState } from "../ui/ErrorState";
import { StatusBadge } from "../ui/StatusBadge";
import "./ApplicationDetail.css";

type Props = {
  applicationId: string;
  onRowChange: (application: Application) => void;
  onClose: () => void;
};

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

  // Status & Note draft state
  const [selectedStatus, setSelectedStatus] = useState<Status>("new");
  const [noteDraft, setNoteDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // LLM scoring state
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setLlmError(null);
    setSaveError(null);
    setJustSaved(false);
    try {
      const loaded = await fetchApplication(id);
      setDetail(loaded);
      setSelectedStatus(loaded.status);
      setNoteDraft(loaded.recruiter_note ?? "");
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

  const isDirty =
    detail != null &&
    (selectedStatus !== detail.status ||
      noteDraft.trim() !== (detail.recruiter_note ?? "").trim());

  const onSave = async () => {
    if (!detail || !isDirty) return;

    const previous = detail;
    const nextStatus = selectedStatus;
    const trimmedNote = noteDraft.trim();
    const noteChanged = trimmedNote !== (detail.recruiter_note ?? "").trim();

    setSaveError(null);
    setJustSaved(false);
    setIsSaving(true);

    // Optimistic UI update
    applyChange({
      ...detail,
      status: nextStatus,
      recruiter_note: noteChanged ? trimmedNote || null : detail.recruiter_note,
      status_updated_at:
        nextStatus !== detail.status
          ? new Date().toISOString()
          : detail.status_updated_at,
    });

    try {
      const updated = await patchStatus(
        detail.application_id,
        nextStatus,
        noteChanged ? trimmedNote : undefined,
      );
      applyChange(updated);
      setSelectedStatus(updated.status);
      setNoteDraft(updated.recruiter_note ?? "");
      setJustSaved(true);
    } catch {
      applyChange(previous);
      setSelectedStatus(previous.status);
      setNoteDraft(previous.recruiter_note ?? "");
      setSaveError("Update failed. Previous values restored.");
    } finally {
      setIsSaving(false);
    }
  };

  const onScore = async () => {
    if (!detail) return;
    setLlmBusy(true);
    setLlmError(null);
    try {
      applyChange(await requestLlmScore(detail.application_id));
    } catch {
      setLlmError("LLM score unavailable.");
    } finally {
      setLlmBusy(false);
    }
  };

  if (loading) {
    return (
      <aside className="panel" aria-label="Application detail">
        <div className="panel-state-actions">
          <button
            type="button"
            className="panel-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className="muted">Loading application…</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="panel" aria-label="Application detail">
        <div className="panel-state-actions">
          <button
            type="button"
            className="panel-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <ErrorState
          message={error}
          onRetry={() => void loadDetail(applicationId)}
        />
      </aside>
    );
  }

  if (!detail) return null;

  return (
    <aside className="panel" aria-label="Application detail">
      <header className="panel-header">
        <div className="panel-header-info">
          <div className="panel-candidate-row">
            <h2>{detail.candidate.full_name}</h2>
            <span
              className="candidate-id"
              title={`Application ID: ${detail.application_id}`}
            >
              #{detail.application_id}
            </span>
          </div>
          <p className="muted panel-subtitle">
            {detail.candidate.email} · {detail.candidate.city},{" "}
            {detail.candidate.country}
          </p>
        </div>
        <div className="panel-actions">
          <StatusBadge status={detail.status} />
          <button
            type="button"
            className="panel-close"
            aria-label="Close application details"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>

      <section className="detail-section">
        <h3>Profile</h3>
        <dl className="facts">
          <Fact label="Source" value={SOURCE_LABELS[detail.source]} />
          <Fact label="Applied" value={toDate(detail.created_at)} />
          <Fact
            label="Experience"
            value={`${detail.candidate.years_experience} years`}
          />
          <Fact
            label="Preferred role"
            value={detail.candidate.preferred_job_family}
          />
          {detail.sibling_application_ids.length > 0 && (
            <Fact
              label="Total applications"
              value={String(detail.sibling_application_ids.length + 1)}
            />
          )}
        </dl>
      </section>

      <section className="scores">
        <div className="score-card">
          <span className="eyebrow">Rule Match</span>
          <p className="score-value">{toPercent(detail.match_score)}%</p>
          <p className="muted score-meta">
            {MATCH_BAND_LABELS[detail.match_band]} match
          </p>
        </div>
        <div className="score-card">
          <span className="eyebrow">AI Match</span>
          {detail.llm_score != null ? (
            <>
              <p className="score-value">{detail.llm_score}%</p>
              <p
                className="muted score-meta line-clamp-2"
                title={detail.llm_reason ?? undefined}
              >
                {detail.llm_reason || detail.llm_model}
              </p>
            </>
          ) : (
            <>
              <p className="score-value score-value--empty">—</p>
              <button
                type="button"
                className="score-btn"
                onClick={() => void onScore()}
                disabled={llmBusy}
              >
                {llmBusy ? "Scoring…" : "Run AI score"}
              </button>
              {llmError && <p className="error tiny">{llmError}</p>}
            </>
          )}
        </div>
      </section>

      <section className="detail-section">
        <div className="section-header">
          <h3>Application status</h3>
          {detail.status_updated_at && (
            <span
              className="field-meta muted tiny"
              title={toDateTime(detail.status_updated_at)}
            >
              Updated {toAge(detail.status_updated_at)}
            </span>
          )}
        </div>

        <div className="status-form">
          <div className="field-group">
            <label className="field-label" htmlFor="app-status">
              Status
            </label>
            <select
              id="app-status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as Status);
                setJustSaved(false);
              }}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="app-note">
              Recruiter note
            </label>
            <textarea
              id="app-note"
              rows={2}
              value={noteDraft}
              placeholder="Add an optional note…"
              onChange={(e) => {
                setNoteDraft(e.target.value);
                setJustSaved(false);
              }}
            />
          </div>

          {saveError && <p className="error tiny">{saveError}</p>}

          <div className="form-actions">
            <button
              type="button"
              className="save-btn"
              disabled={!isDirty || isSaving}
              onClick={() => void onSave()}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
            {justSaved && (
              <span className="save-feedback" aria-live="polite">
                ✓ Saved
              </span>
            )}
          </div>
        </div>
      </section>
    </aside>
  );
}
