import type { ApplicationStatus, InterviewFormat, InterviewType } from "@/lib/types";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  OA: "OA",
  PHONE_SCREEN: "Phone Screen",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  REJECTED: "Rejected",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "APPLIED",
  "OA",
  "PHONE_SCREEN",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
  "DECLINED",
  "REJECTED",
];

/** Stages a rejection can be attributed to - REJECTED itself is never a valid "from" stage. */
export const REJECTABLE_STAGES: ApplicationStatus[] = ["APPLIED", "OA", "PHONE_SCREEN", "INTERVIEW"];

/** APPLIED is set automatically when an application is created (its date is editable there,
 * via "date applied") - it's never something a user logs again through the status-update
 * form, so it's excluded from these selectable options even though it's still part of the
 * full STATUS_ORDER used elsewhere (labels, timeline colors, etc). ACCEPTED/DECLINED are only
 * ever legal once the application is already at OFFER - see OFFER_RESPONSE_STATUSES below -
 * so they're excluded here too and shown conditionally instead. */
export const LOGGABLE_STATUSES: ApplicationStatus[] = STATUS_ORDER.filter(
  (status) => status !== "APPLIED" && status !== "ACCEPTED" && status !== "DECLINED",
);

/** Only ever a legal next status once the application's current status is already OFFER. */
export const OFFER_RESPONSE_STATUSES: ApplicationStatus[] = ["ACCEPTED", "DECLINED"];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  TECHNICAL: "Technical",
  BEHAVIORAL: "Behavioral",
  BOTH: "Behavioral + Technical",
};

export const INTERVIEW_FORMAT_LABELS: Record<InterviewFormat, string> = {
  ONLINE: "Online",
  IN_PERSON: "In-Person",
};

// Same --pipeline-1..4 CSS vars as sankeyColors.ts (globals.css) - kept as a
// separate map because this indexes by the plain enum, not the Sankey's
// rejected-from-stage synthetic node names.
const PROGRESS_COLORS: Record<string, string> = {
  APPLIED: "var(--pipeline-1)",
  OA: "var(--pipeline-2)",
  PHONE_SCREEN: "var(--pipeline-3)",
  INTERVIEW: "var(--pipeline-4)",
};
// Kept in sync with sankeyColors.ts's STATUS_GOOD/CRITICAL/NEUTRAL - see that file for why
// these specific shades (re-validated via the dataviz skill's validate_palette.js).
const STATUS_GOOD = "#059669";
const STATUS_CRITICAL = "#e11d48";
const STATUS_NEUTRAL = "#71717a";

export function getStatusColor(status: ApplicationStatus): string {
  if (status === "OFFER" || status === "ACCEPTED") return STATUS_GOOD;
  if (status === "REJECTED") return STATUS_CRITICAL;
  if (status === "DECLINED") return STATUS_NEUTRAL;
  return PROGRESS_COLORS[status];
}
