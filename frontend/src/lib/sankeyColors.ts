// Pipeline-progress colors are the --pipeline-1..4 CSS vars (globals.css) - a
// violet ordinal ramp validated via the dataviz skill's validate_palette.js
// --ordinal (separate steps per light/dark mode). Status colors (good/critical)
// are the skill's fixed, never-themed palette for the two terminal outcomes.

const STAGE_ORDER = ["APPLIED", "OA", "PHONE_SCREEN", "ONSITE_FINAL", "OFFER"] as const;

const PROGRESS_COLORS: Record<string, string> = {
  APPLIED: "var(--pipeline-1)",
  OA: "var(--pipeline-2)",
  PHONE_SCREEN: "var(--pipeline-3)",
  ONSITE_FINAL: "var(--pipeline-4)",
};

const STATUS_GOOD = "#0ca30c";
const STATUS_CRITICAL = "#d03b3b";

const STAGE_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  OA: "OA",
  PHONE_SCREEN: "Phone Screen",
  ONSITE_FINAL: "Onsite",
  OFFER: "Offer",
};

export function isRejectedNode(name: string): boolean {
  return name.startsWith("REJECTED");
}

export function getNodeColor(name: string): string {
  if (name === "OFFER") return STATUS_GOOD;
  if (isRejectedNode(name)) return STATUS_CRITICAL;
  return PROGRESS_COLORS[name] ?? "#898781";
}

export function getNodeLabel(name: string): string {
  if (isRejectedNode(name)) {
    const fromStage = name.replace("REJECTED_", "");
    return `Rejected (${STAGE_LABELS[fromStage] ?? fromStage})`;
  }
  return STAGE_LABELS[name] ?? name;
}

/** Canonical left-to-right ordering so the chart reads as a funnel, not a random layout. */
export function orderNodeNames(names: Set<string>): string[] {
  const ordered: string[] = [];
  for (const stage of STAGE_ORDER) {
    if (names.has(stage)) ordered.push(stage);
  }
  for (const stage of STAGE_ORDER) {
    const rejected = `REJECTED_${stage}`;
    if (names.has(rejected)) ordered.push(rejected);
  }
  // Anything unexpected still renders rather than silently disappearing.
  for (const name of names) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered;
}
