"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import type {
  ApplicationDetailResponse,
  ApplicationStatus,
  FitAnalysisResponse,
  InterviewFormat,
  InterviewType,
} from "@/lib/types";
import {
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_TYPE_LABELS,
  LOGGABLE_STATUSES,
  REJECTABLE_STAGES,
  STATUS_LABELS,
  getStatusColor,
} from "@/lib/statusLabels";
import { FIELD_CLASSNAME } from "@/lib/inputStyles";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/Badge";

interface Props {
  detail: ApplicationDetailResponse;
  readOnly: boolean;
  onAddStatusEvent?: (
    status: ApplicationStatus,
    eventDate: string,
    rejectedFromStage?: ApplicationStatus,
    interviewType?: InterviewType,
    interviewFormat?: InterviewFormat,
  ) => Promise<void>;
  onDeleteStatusEvent?: (eventId: string) => Promise<void>;
  onAddNote?: (text: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onRunFitAnalysis?: () => Promise<FitAnalysisResponse>;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ApplicationDetailView({
  detail,
  readOnly,
  onAddStatusEvent,
  onDeleteStatusEvent,
  onAddNote,
  onDeleteNote,
  onRunFitAnalysis,
}: Props) {
  const [statusValue, setStatusValue] = useState<ApplicationStatus>("OA");
  const [rejectedFromStage, setRejectedFromStage] = useState<ApplicationStatus>("APPLIED");
  const [interviewType, setInterviewType] = useState<InterviewType>("TECHNICAL");
  const [interviewFormat, setInterviewFormat] = useState<InterviewFormat>("ONLINE");
  const [eventDate, setEventDate] = useState(todayIso());
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deletingStatusEventId, setDeletingStatusEventId] = useState<string | null>(null);
  // After a 429, the button stays disabled for the server's own stated wait time - rapid
  // re-clicking during a rate limit previously meant every click just fired its own request,
  // and since the limiter's bucket refills continuously (not all at once), some of those
  // clicks slipped through as separate, unintended submissions once the bucket recovered.
  const [statusCooldownSeconds, setStatusCooldownSeconds] = useState(0);

  useEffect(() => {
    if (statusCooldownSeconds <= 0) return;
    const id = setTimeout(() => setStatusCooldownSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [statusCooldownSeconds]);

  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const [fitResult, setFitResult] = useState<FitAnalysisResponse | null>(null);
  const [isRunningFit, setIsRunningFit] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);

  const sortedEvents = [...detail.statusEvents].sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  async function handleStatusSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onAddStatusEvent || isSubmittingStatus || statusCooldownSeconds > 0) return;
    setStatusError(null);
    setIsSubmittingStatus(true);
    try {
      await onAddStatusEvent(
        statusValue,
        eventDate,
        statusValue === "REJECTED" ? rejectedFromStage : undefined,
        statusValue === "INTERVIEW" ? interviewType : undefined,
        statusValue === "INTERVIEW" ? interviewFormat : undefined,
      );
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      if (err instanceof ApiError && err.status === 429) {
        setStatusCooldownSeconds(err.retryAfterSeconds ?? 5);
      }
    } finally {
      setIsSubmittingStatus(false);
    }
  }

  async function handleDeleteStatusEvent(eventId: string) {
    if (!onDeleteStatusEvent) return;
    setStatusError(null);
    setDeletingStatusEventId(eventId);
    try {
      await onDeleteStatusEvent(eventId);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDeletingStatusEventId(null);
    }
  }

  async function handleNoteSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onAddNote || !noteText.trim()) return;
    setNoteError(null);
    setIsSubmittingNote(true);
    try {
      await onAddNote(noteText.trim());
      setNoteText("");
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmittingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!onDeleteNote) return;
    setDeletingNoteId(noteId);
    try {
      await onDeleteNote(noteId);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDeletingNoteId(null);
    }
  }

  async function handleRunFitAnalysis() {
    if (!onRunFitAnalysis) return;
    setFitError(null);
    setIsRunningFit(true);
    try {
      setFitResult(await onRunFitAnalysis());
    } catch (err) {
      setFitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsRunningFit(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {readOnly && (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-xs text-brand">
          You&apos;re viewing a sample application. Sign up to track your own.
        </p>
      )}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {detail.role} · {detail.company}
          </h1>
          <StatusBadge status={detail.currentStatus} />
        </div>
        <p className="mt-1 text-sm text-muted">applied {detail.dateApplied}</p>
        {detail.jobDescriptionText && (
          <details className="mt-3 text-sm text-foreground/70">
            <summary className="cursor-pointer font-medium text-foreground">Job description</summary>
            <p className="mt-2 whitespace-pre-wrap">{detail.jobDescriptionText}</p>
          </details>
        )}
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted">Status timeline</h2>
        <ul className="mt-3 flex flex-col gap-3 border-l-2 border-surface-border pl-5">
          {sortedEvents.map((event) => (
            <li key={event.id} className="relative flex flex-wrap items-center gap-2 text-sm">
              <span
                className="absolute top-1/2 -left-[26px] h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-2 ring-background"
                style={{ background: getStatusColor(event.status) }}
              />
              <span className="font-medium text-foreground">
                {STATUS_LABELS[event.status]}
                {event.interviewRound !== null && ` (Round ${event.interviewRound})`}
              </span>
              {event.rejectedFromStage && (
                <span className="text-muted">(from {STATUS_LABELS[event.rejectedFromStage]})</span>
              )}
              {event.interviewType && (
                <span className="text-muted">
                  {INTERVIEW_TYPE_LABELS[event.interviewType]}
                  {event.interviewFormat && ` · ${INTERVIEW_FORMAT_LABELS[event.interviewFormat]}`}
                </span>
              )}
              <span className="text-muted">{event.eventDate}</span>
              {onDeleteStatusEvent && event.status !== "APPLIED" && (
                <button
                  onClick={() => handleDeleteStatusEvent(event.id)}
                  disabled={deletingStatusEventId === event.id}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                >
                  {deletingStatusEventId === event.id ? "Deleting…" : "Delete"}
                </button>
              )}
            </li>
          ))}
        </ul>

        {onAddStatusEvent ? (
          <form onSubmit={handleStatusSubmit} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-foreground">
              New status
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value as ApplicationStatus)}
                className={FIELD_CLASSNAME}
              >
                {LOGGABLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            {statusValue === "REJECTED" && (
              <label className="flex flex-col gap-1 text-xs text-foreground">
                Rejected from
                <select
                  value={rejectedFromStage}
                  onChange={(e) => setRejectedFromStage(e.target.value as ApplicationStatus)}
                  className={FIELD_CLASSNAME}
                >
                  {REJECTABLE_STAGES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {statusValue === "INTERVIEW" && (
              <>
                <label className="flex flex-col gap-1 text-xs text-foreground">
                  Interview type
                  <select
                    value={interviewType}
                    onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                    className={FIELD_CLASSNAME}
                  >
                    {(Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]).map((type) => (
                      <option key={type} value={type}>
                        {INTERVIEW_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-foreground">
                  Format
                  <select
                    value={interviewFormat}
                    onChange={(e) => setInterviewFormat(e.target.value as InterviewFormat)}
                    className={FIELD_CLASSNAME}
                  >
                    {(Object.keys(INTERVIEW_FORMAT_LABELS) as InterviewFormat[]).map((format) => (
                      <option key={format} value={format}>
                        {INTERVIEW_FORMAT_LABELS[format]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="flex flex-col gap-1 text-xs text-foreground">
              Date
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={FIELD_CLASSNAME}
              />
            </label>
            <Button
              type="submit"
              disabled={isSubmittingStatus || statusCooldownSeconds > 0}
              className="text-sm"
            >
              {isSubmittingStatus
                ? "Adding…"
                : statusCooldownSeconds > 0
                  ? `Try again in ${statusCooldownSeconds}s`
                  : "Add update"}
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-xs text-muted">Sign up to log your own status updates.</p>
        )}
        {statusError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{statusError}</p>}
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted">Notes</h2>
        {detail.notes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No notes yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {detail.notes.map((note) => (
              <li key={note.id} className="card flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <span className="whitespace-pre-wrap text-foreground">{note.text}</span>
                {onDeleteNote && (
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={deletingNoteId === note.id}
                    className="shrink-0 font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    {deletingNoteId === note.id ? "Deleting…" : "Delete"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {onAddNote ? (
          <form onSubmit={handleNoteSubmit} className="mt-3 flex flex-col gap-2">
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
              className={FIELD_CLASSNAME}
            />
            <Button type="submit" disabled={isSubmittingNote || !noteText.trim()} className="w-fit text-sm">
              {isSubmittingNote ? "Adding…" : "Add note"}
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-xs text-muted">Sign up to add your own notes.</p>
        )}
        {noteError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{noteError}</p>}
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted">Resume / JD fit</h2>
        {onRunFitAnalysis ? (
          <>
            <Button
              onClick={handleRunFitAnalysis}
              disabled={isRunningFit}
              variant="secondary"
              className="mt-2 text-sm"
            >
              {isRunningFit ? "Analyzing…" : "Run fit analysis"}
            </Button>
            {fitError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{fitError}</p>}
            {fitResult && (
              <div className="card mt-3 p-4 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-bold gradient-text">{fitResult.fitScore}</span>
                  <span className="text-muted">/ 100 fit score</span>
                  {fitResult.cached && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                      cached
                    </span>
                  )}
                </div>
                {fitResult.missingKeywords.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-foreground/70">Missing keywords</p>
                    <p className="text-foreground/70">{fitResult.missingKeywords.join(", ")}</p>
                  </div>
                )}
                {fitResult.suggestedBullets.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-foreground/70">Suggested resume bullets</p>
                    <ul className="mt-1 list-disc pl-5 text-foreground/70">
                      {fitResult.suggestedBullets.map((bullet, i) => (
                        <li key={i}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Fit analysis isn&apos;t available here.</p>
        )}
      </section>
    </div>
  );
}
