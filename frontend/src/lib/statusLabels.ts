import type { ApplicationStatus } from "@/lib/types";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  OA: "OA",
  PHONE_SCREEN: "Phone Screen",
  ONSITE_FINAL: "Onsite",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "APPLIED",
  "OA",
  "PHONE_SCREEN",
  "ONSITE_FINAL",
  "OFFER",
  "REJECTED",
];

/** Stages a rejection can be attributed to - REJECTED itself is never a valid "from" stage. */
export const REJECTABLE_STAGES: ApplicationStatus[] = ["APPLIED", "OA", "PHONE_SCREEN", "ONSITE_FINAL"];

// Same --pipeline-1..4 CSS vars as sankeyColors.ts (globals.css) - kept as a
// separate map because this indexes by the plain enum, not the Sankey's
// rejected-from-stage synthetic node names.
const PROGRESS_COLORS: Record<string, string> = {
  APPLIED: "var(--pipeline-1)",
  OA: "var(--pipeline-2)",
  PHONE_SCREEN: "var(--pipeline-3)",
  ONSITE_FINAL: "var(--pipeline-4)",
};
// Kept in sync with sankeyColors.ts's STATUS_GOOD/CRITICAL - see that file for why these
// specific shades (re-validated via the dataviz skill's validate_palette.js).
const STATUS_GOOD = "#059669";
const STATUS_CRITICAL = "#e11d48";

export function getStatusColor(status: ApplicationStatus): string {
  if (status === "OFFER") return STATUS_GOOD;
  if (status === "REJECTED") return STATUS_CRITICAL;
  return PROGRESS_COLORS[status];
}
