import { useCallback, useEffect, useState } from "react";
import { fetchApplication, patchStatus, requestLlmScore } from "../../api";
import type { Application, Status } from "../../utils/domain";
import {
  MATCH_BAND_LABELS,
  STATUSES,
  STATUS_LABELS,
  SOURCE_LABELS,
} from "../../utils/domain";
import { toAge, toDate, toDateTime, toPercent } from "../../utils/format";
import { ErrorState } from "../ui/ErrorState";
import { StatusBadge } from "../ui/StatusBadge";
import "./ApplicationDetail.css";

type Props = {
  applicationId: string;
  onRowChange: (application: Application) => void;
  onClose: () => void;
  onSelect: (id: string) => void;
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
  onSelect,
}: Props) {
  const [detail, setDetail] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status & Note state
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
        <div className="section-header">
          <span />
          <CloseButton onClose={onClose} />
        </div>
        <p className="muted">Loading application…</p>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="panel" aria-label="Application detail">
        <div className="section-header">
          <span />
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

  return (
    <aside className="panel" aria-label="Application detail">
      <header className="panel-header">
        <div>
          <h2>
            {detail.candidate.full_name}{" "}
            <span className="tiny muted">#{detail.application_id}</span>
          </h2>
          <p className="muted tiny">
            {detail.candidate.email} ·
            <br />
            {detail.candidate.city}, {detail.candidate.country}
          </p>
        </div>
        <div className="panel-actions">
          <StatusBadge status={detail.status} />
          <CloseButton onClose={onClose} />
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
            // add here link

            <div className="tiny">
              also applied as{" "}
              {detail.sibling_application_ids.map((id, index) => (
                <span key={id}>
                  {index > 0 ? ", " : null}
                  <button
                    type="button"
                    className="link-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(id);
                    }}
                  >
                    {id}
                  </button>
                </span>
              ))}
            </div>
          )}
        </dl>
      </section>

      <section className="score-card">
        {/* Top Metric Bar */}
        <div className="score-header">
          {/* Rule Match */}
          <div>
            <span className="eyebrow">Rule Match</span>
            <div className="score-row">
              <p className="score-value">{toPercent(detail.match_score)}%</p>
              <span className="muted tiny">
                {MATCH_BAND_LABELS[detail.match_band]} match
              </span>
            </div>
          </div>

          {/* AI Match */}
          <div>
            <span className="eyebrow">AI Match</span>
            {detail.llm_score != null ? (
              <div className="score-row">
                <p className="score-value">{detail.llm_score}%</p>
              </div>
            ) : (
              <div className="score-row">
                <p className="score-value score-value--empty">—</p>
                <button
                  type="button"
                  className="score-btn"
                  onClick={() => void onScore()}
                  disabled={llmBusy}
                >
                  {llmBusy ? "Scoring…" : "Run AI score"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {llmError && <p className="error tiny">{llmError}</p>}

        {/* Full Unclamped AI Reason */}
        {detail.llm_score != null && detail.llm_reason && (
          <p className="score-reason">
            {detail.llm_model && (
              <span className="muted tiny">
                🤖 {detail.llm_model.split("/").pop()}:
              </span>
            )}
            <br />
            {detail.llm_reason}
          </p>
        )}
      </section>

      <section className="detail-section">
        <div className="section-header">
          <h3>Application status</h3>
          {detail.status_updated_at && (
            <span
              className="muted tiny"
              title={toDateTime(detail.status_updated_at)}
            >
              Updated {toAge(detail.status_updated_at)}
            </span>
          )}
        </div>

        <div className="status-form">
          <div className="field-group">
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
