"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, FileText, Pencil, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
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
  OFFER_RESPONSE_STATUSES,
  STATUS_LABELS,
  getStatusColor,
} from "@/lib/statusLabels";
import { FIELD_CLASSNAME_ROOMY } from "@/lib/inputStyles";
import { formatDateApplied, formatNoteTimestamp } from "@/lib/dates";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/Badge";
import { OfferCelebration } from "@/components/OfferCelebration";
import { AiUsageBadge } from "@/components/AiUsageBadge";

interface Props {
  detail: ApplicationDetailResponse;
  readOnly: boolean;
  /** Only passed by the real (non-demo) page - drives the header's Edit/Delete actions. */
  editHref?: string;
  onDeleteApplication?: () => void;
  isDeletingApplication?: boolean;
  onAddStatusEvent?: (
    status: ApplicationStatus,
    eventDate: string,
    interviewType?: InterviewType,
    interviewFormat?: InterviewFormat,
  ) => Promise<void>;
  onDeleteStatusEvent?: (eventId: string) => Promise<void>;
  onAddNote?: (text: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onRunFitAnalysis?: (force: boolean) => Promise<FitAnalysisResponse>;
  /**
   * A stored analysis fetched on page load, shown immediately so an existing result doesn't
   * cost a click to discover. Demo mode passes nothing and keeps its click-to-reveal flow.
   */
  initialFitResult?: FitAnalysisResponse | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const CARD = "card p-6";
const SECTION_TITLE = "text-sm font-medium text-muted";
const ICON_BUTTON = "rounded-lg p-2 text-muted transition-colors hover:bg-foreground/10 hover:text-foreground";
const DANGER_ICON_BUTTON =
  "rounded-lg p-2 text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50 dark:hover:text-rose-400";
const FIELD_LABEL = "flex flex-col gap-1.5 text-xs font-medium text-foreground";

export function ApplicationDetailView({
  detail,
  readOnly,
  editHref,
  onDeleteApplication,
  isDeletingApplication = false,
  onAddStatusEvent,
  onDeleteStatusEvent,
  onAddNote,
  onDeleteNote,
  onRunFitAnalysis,
  initialFitResult,
}: Props) {
  // Only relevant when readOnly (the demo view) - a visitor who already has their own real
  // account gets pointed at the nav above instead of a "sign up" pitch that no longer applies.
  const { isAuthenticated } = useAuth();
  const [statusValue, setStatusValue] = useState<ApplicationStatus>(
    detail.currentStatus === "OFFER" ? "ACCEPTED" : "OA",
  );
  // Once an Offer is logged, Accepted/Declined are the only legal next statuses - this keeps
  // the dropdown's selected value in sync (via the "adjust state during render" pattern,
  // rather than an effect) so it never silently points at an option that's no longer in the
  // now-narrower list.
  const [statusValueTrackedStatus, setStatusValueTrackedStatus] = useState(detail.currentStatus);
  if (detail.currentStatus !== statusValueTrackedStatus) {
    setStatusValueTrackedStatus(detail.currentStatus);
    setStatusValue(detail.currentStatus === "OFFER" ? "ACCEPTED" : "OA");
  }
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
  const [showOfferCelebration, setShowOfferCelebration] = useState(false);

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
  // Derived rather than synced into state with an effect: the cached result arrives after mount,
  // and a freshly run analysis should win over it from then on.
  const displayedFit = fitResult ?? initialFitResult ?? null;
  const [isRunningFit, setIsRunningFit] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);

  const sortedEvents = [...detail.statusEvents].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  // Newest note first. Sorted here rather than trusting the array order: the API returns
  // notes in insertion order and the page appends optimistically, so both would otherwise
  // put a just-added note at the bottom.
  const sortedNotes = [...detail.notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function handleStatusSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onAddStatusEvent || isSubmittingStatus || statusCooldownSeconds > 0) return;
    setStatusError(null);
    setIsSubmittingStatus(true);
    try {
      await onAddStatusEvent(
        statusValue,
        eventDate,
        statusValue === "INTERVIEW" ? interviewType : undefined,
        statusValue === "INTERVIEW" ? interviewFormat : undefined,
      );
      if (statusValue === "OFFER") {
        setShowOfferCelebration(true);
      }
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

  async function handleRunFitAnalysis(force: boolean) {
    if (!onRunFitAnalysis) return;
    setFitError(null);
    setIsRunningFit(true);
    try {
      setFitResult(await onRunFitAnalysis(force));
    } catch (err) {
      setFitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsRunningFit(false);
    }
  }

  return (
    <div className="space-y-8">
      {showOfferCelebration && <OfferCelebration onDone={() => setShowOfferCelebration(false)} />}
      {readOnly && (
        <p className="rounded-lg bg-brand/10 px-3 py-2 text-xs text-brand">
          {isAuthenticated
            ? "You're viewing a sample application. Click Applications in the navbar above to see your own."
            : "You're viewing a sample application. Sign up to track your own."}
        </p>
      )}

      <div>
        {/* Title and actions share one row - with the actions in an outer row alongside the
            whole title block instead, they aligned to the top of the "Applied ..." line too
            rather than sitting level with the role title. */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {detail.role} · {detail.company}
            </h1>
            <StatusBadge status={detail.currentStatus} />
          </div>
          {(editHref || onDeleteApplication) && (
          <div className="flex shrink-0 items-center gap-1.5">
            {editHref && (
              <Link href={editHref} title="Edit application" aria-label="Edit application" className={ICON_BUTTON}>
                <Pencil size={16} />
              </Link>
            )}
            {onDeleteApplication && (
              <button
                onClick={onDeleteApplication}
                disabled={isDeletingApplication}
                title="Delete application"
                aria-label="Delete application"
                className={DANGER_ICON_BUTTON}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">Applied {formatDateApplied(detail.dateApplied)}</p>
      </div>

      {/* lg rather than md: at 768px a 7/5 split leaves the timeline column ~300px, which is
          too narrow for its two-up status control. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* ---- Left: job description + the AI fit feature ---- */}
        <div className="space-y-6 lg:col-span-7">
          <div className={CARD}>
            {detail.jobDescriptionText ? (
              // group/details + the [&_summary]:... free marker rule keeps this a native
              // <details> (so it stays keyboard- and search-accessible) while still allowing a
              // custom chevron that rotates on open.
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    size={15}
                    aria-hidden
                    className="text-muted transition-transform group-open:rotate-90"
                  />
                  <FileText size={15} aria-hidden className="text-muted" />
                  Job description
                </summary>
                {/* Capped with its own scroll rather than letting a long JD stretch the
                    column: same approach as Profile's preview card and the Dashboard's
                    applications list, so the card's box size doesn't depend on content
                    length. The card itself stays fully reachable - only the body scrolls. */}
                <p className="mt-3 max-h-96 overflow-y-auto border-t border-surface-border pt-3 text-sm whitespace-pre-wrap text-foreground/70">
                  {detail.jobDescriptionText}
                </p>
              </details>
            ) : (
              <div className="flex items-start gap-2 text-sm">
                <FileText size={15} aria-hidden className="mt-0.5 shrink-0 text-muted" />
                <div>
                  <p className="font-medium text-foreground">No job description</p>
                  <p className="mt-1 text-muted">
                    Add one to unlock the AI resume fit check for this application.
                  </p>
                </div>
              </div>
            )}
          </div>


          {/* Collapsed by default and expanding on demand. That is what keeps the two
              columns balanced: a closed card contributes a fixed ~60px no matter how many
              notes exist, and it only grows while the user is actually working in it. No
              max-height on the list either - once open, the point is to see them all. */}
          <section className={CARD}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  size={15}
                  aria-hidden
                  className="text-muted transition-transform group-open:rotate-90"
                />
                <StickyNote size={15} aria-hidden className="text-muted" />
                Notes
                <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs font-normal text-muted">
                  {sortedNotes.length}
                </span>
              </summary>

              <div className="mt-3 border-t border-surface-border pt-3">
                {sortedNotes.length === 0 ? (
                  <p className="text-sm text-muted">
                    No notes yet. Log recruiter calls or interview prep points here.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {sortedNotes.map((note) => (
                      <li
                        key={note.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-surface-border bg-background p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-muted">{formatNoteTimestamp(note.createdAt)}</p>
                          <p className="mt-0.5 whitespace-pre-wrap text-foreground">{note.text}</p>
                        </div>
                        {onDeleteNote && (
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deletingNoteId === note.id}
                            title="Delete note"
                            aria-label="Delete note"
                            className={`${DANGER_ICON_BUTTON} -mt-1 shrink-0`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {onAddNote ? (
                  <form onSubmit={handleNoteSubmit} className="mt-4 flex flex-col gap-3">
                    <textarea
                      rows={3}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add a note…"
                      aria-label="Add a note"
                      className={`${FIELD_CLASSNAME_ROOMY} resize-y`}
                    />
                    <Button
                      type="submit"
                      disabled={isSubmittingNote || !noteText.trim()}
                      className="w-fit rounded-xl text-sm"
                    >
                      {isSubmittingNote ? "Adding…" : "Add note"}
                    </Button>
                  </form>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    {isAuthenticated
                      ? "Open one of your own applications to add notes."
                      : "Sign up to add your own notes."}
                  </p>
                )}
                {noteError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{noteError}</p>}
              </div>
            </details>
          </section>

          {/* The one card that gets an accent treatment - it's the app's headline feature. */}
          <div className="rounded-2xl border border-brand/30 bg-linear-to-br from-surface via-brand/10 to-surface p-6 shadow-xl shadow-purple-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles size={15} className="text-brand" />
                Resume / JD fit
              </h2>
              {onRunFitAnalysis && <AiUsageBadge />}
            </div>

            {onRunFitAnalysis ? (
              <>
                <p className="mt-2 text-sm text-muted">
                  Gemini compares your saved resume against this job description.
                </p>
                <Button
                  // Force only when re-running something already on screen. A first run stays
                  // cacheable, so it costs nothing if this exact resume and JD were scored before.
                  onClick={() => handleRunFitAnalysis(displayedFit !== null)}
                  disabled={isRunningFit}
                  className="mt-4 rounded-xl px-5 py-2.5"
                >
                  {isRunningFit ? "Analyzing…" : displayedFit ? "Re-analyze" : "Run fit analysis"}
                </Button>
                {fitError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{fitError}</p>}
                {/* Animated height so the card visibly expands into the result rather than
                    snapping. MotionConfig reducedMotion="user" is set at the app level, so
                    this is skipped for anyone who prefers reduced motion. */}
                <AnimatePresence initial={false}>
                {displayedFit && (
                  <motion.div
                    key="fit-result"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                  <div className="mt-5 border-t border-surface-border pt-5 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="gradient-text font-display text-4xl font-bold">{displayedFit.fitScore}</span>
                      <span className="text-muted">/ 100 fit score</span>
                      {displayedFit.cached && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                          cached
                        </span>
                      )}
                    </div>
                    {displayedFit.missingKeywords.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-foreground/70">Missing keywords</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {displayedFit.missingKeywords.map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full border border-surface-border bg-foreground/5 px-2 py-0.5 text-xs text-foreground/80"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {displayedFit.suggestedBullets.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-foreground/70">Suggested resume bullets</p>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-foreground/70">
                          {displayedFit.suggestedBullets.map((bullet, i) => (
                            <li key={i}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Fit analysis isn&apos;t available here.</p>
            )}
          </div>
        </div>

        {/* ---- Right: timeline + notes ---- */}
        <div className="space-y-6 lg:col-span-5">
          <section className={CARD}>
            <h2 className={SECTION_TITLE}>Status timeline</h2>
            {/* An explicit line inset by top-3/bottom-3 so it starts and ends at the first and
                last node rather than overhanging the list, which a full-height border-l did.
                Deliberately NOT -z-10: the card sets an opaque background, so a negative
                z-index would put the line behind it and make it invisible. It doesn't need
                one - the nodes come later in the DOM and paint on top anyway.
                Offsets are tied together: line centre = left-2.5 + half of w-0.5 = 11px, and
                each node is 10px wide at pl-5 (20px) minus 14px = 6px..16px, centre 11px. */}
            <div className="mt-4 max-h-80 overflow-y-auto pr-1">
            <ul className="relative flex flex-col gap-3 pl-5">
              <span aria-hidden className="absolute top-3 bottom-3 left-2.5 w-0.5 bg-surface-border" />
              {sortedEvents.map((event) => (
                <li key={event.id} className="relative flex items-start gap-2 text-sm">
                  <span
                    className="absolute top-1.5 -left-[14px] h-2.5 w-2.5 rounded-full ring-2 ring-surface"
                    style={{ background: getStatusColor(event.status) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-medium text-foreground">
                        {STATUS_LABELS[event.status]}
                        {event.interviewRound !== null && ` (Round ${event.interviewRound})`}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateApplied(event.eventDate)}
                      {event.interviewType &&
                        ` · ${INTERVIEW_TYPE_LABELS[event.interviewType]}${
                          event.interviewFormat ? ` · ${INTERVIEW_FORMAT_LABELS[event.interviewFormat]}` : ""
                        }`}
                    </p>
                  </div>
                  {onDeleteStatusEvent && event.status !== "APPLIED" && (
                    <button
                      onClick={() => handleDeleteStatusEvent(event.id)}
                      disabled={deletingStatusEventId === event.id}
                      title="Delete this update"
                      aria-label={`Delete the ${STATUS_LABELS[event.status]} update`}
                      className={`${DANGER_ICON_BUTTON} -mt-1 shrink-0`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            </div>

            {onAddStatusEvent ? (
              <form
                onSubmit={handleStatusSubmit}
                className="mt-5 grid grid-cols-1 gap-3 border-t border-surface-border pt-5 sm:grid-cols-2"
              >
                <label className={FIELD_LABEL}>
                  New status
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value as ApplicationStatus)}
                    className={FIELD_CLASSNAME_ROOMY}
                  >
                    {(detail.currentStatus === "OFFER" ? OFFER_RESPONSE_STATUSES : LOGGABLE_STATUSES).map(
                      (status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className={FIELD_LABEL}>
                  Date
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={FIELD_CLASSNAME_ROOMY}
                  />
                </label>
                {statusValue === "INTERVIEW" && (
                  <>
                    <label className={FIELD_LABEL}>
                      Interview type
                      <select
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value as InterviewType)}
                        className={FIELD_CLASSNAME_ROOMY}
                      >
                        {(Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]).map((type) => (
                          <option key={type} value={type}>
                            {INTERVIEW_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={FIELD_LABEL}>
                      Format
                      <select
                        value={interviewFormat}
                        onChange={(e) => setInterviewFormat(e.target.value as InterviewFormat)}
                        className={FIELD_CLASSNAME_ROOMY}
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
                <Button
                  type="submit"
                  disabled={isSubmittingStatus || statusCooldownSeconds > 0}
                  className="inline-flex h-10 items-center justify-center rounded-xl py-0 text-sm font-medium sm:col-span-2"
                >
                  {isSubmittingStatus
                    ? "Adding…"
                    : statusCooldownSeconds > 0
                      ? `Try again in ${statusCooldownSeconds}s`
                      : "+ Add update"}
                </Button>
              </form>
            ) : (
              <p className="mt-4 border-t border-surface-border pt-4 text-xs text-muted">
                {isAuthenticated
                  ? "Open one of your own applications to log status updates."
                  : "Sign up to log your own status updates."}
              </p>
            )}
            {statusError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{statusError}</p>}
          </section>

        </div>
      </div>
    </div>
  );
}
