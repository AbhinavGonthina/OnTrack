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

// Same validated hexes as sankeyColors.ts (dataviz skill reference palette) - kept
// separate because this maps the plain enum, not the Sankey's rejected-from-stage
// synthetic node names.
const PROGRESS_COLORS: Record<string, string> = {
  APPLIED: "#86b6ef",
  OA: "#5598e7",
  PHONE_SCREEN: "#2a78d6",
  ONSITE_FINAL: "#1c5cab",
};
const STATUS_GOOD = "#0ca30c";
const STATUS_CRITICAL = "#d03b3b";

export function getStatusColor(status: ApplicationStatus): string {
  if (status === "OFFER") return STATUS_GOOD;
  if (status === "REJECTED") return STATUS_CRITICAL;
  return PROGRESS_COLORS[status];
}
