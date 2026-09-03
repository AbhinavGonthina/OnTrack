// Pipeline-progress colors are the --pipeline-1..4 CSS vars (globals.css) - a
// violet ordinal ramp validated via the dataviz skill's validate_palette.js
// --ordinal (separate steps per light/dark mode). Status colors (good/critical)
// are the skill's fixed, never-themed palette for the two terminal outcomes.

import type { SankeyLink } from "@/lib/types";

const STAGE_ORDER = ["APPLIED", "OA", "PHONE_SCREEN", "INTERVIEW", "OFFER"] as const;

const PROGRESS_COLORS: Record<string, string> = {
  APPLIED: "var(--pipeline-1)",
  OA: "var(--pipeline-2)",
  PHONE_SCREEN: "var(--pipeline-3)",
  INTERVIEW: "var(--pipeline-4)",
};

// Re-validated via the dataviz skill's validate_palette.js against both surfaces: this
// pairing clears the lightness band on dark (unlike #10b981, which is too light there)
// and has better CVD (deutan) separation than the colors it replaced (5.8 vs 4.1 dE) -
// still below the ideal floor, but that's legal here since every node/badge using these
// always ships with a text label too, never color alone.
export const STATUS_GOOD = "#059669";
export const STATUS_CRITICAL = "#e11d48";

const STAGE_LABELS: Record<string, string> = {
  APPLIED: "Applied",
  OA: "OA",
  PHONE_SCREEN: "Phone Screen",
  INTERVIEW: "Interview",
  OFFER: "Offer",
};

const INTERVIEW_ROUND_PATTERN = /^INTERVIEW_(\d+)$/;

/** Returns the round number for a chart node name like "INTERVIEW_2", or null otherwise. */
function interviewRoundOf(name: string): number | null {
  const match = INTERVIEW_ROUND_PATTERN.exec(name);
  return match ? Number(match[1]) : null;
}

export function isRejectedNode(name: string): boolean {
  return name.startsWith("REJECTED");
}

export function getNodeColor(name: string): string {
  if (name === "OFFER") return STATUS_GOOD;
  if (isRejectedNode(name)) return STATUS_CRITICAL;
  if (interviewRoundOf(name) !== null) return PROGRESS_COLORS.INTERVIEW;
  return PROGRESS_COLORS[name] ?? "#898781";
}

export function getNodeLabel(name: string): string {
  if (isRejectedNode(name)) {
    const fromStage = name.replace("REJECTED_", "");
    return `Rejected (${STAGE_LABELS[fromStage] ?? fromStage})`;
  }
  const round = interviewRoundOf(name);
  if (round !== null) return `Interview (Round ${round})`;
  return STAGE_LABELS[name] ?? name;
}

/**
 * Canonical left-to-right ordering so the chart reads as a funnel, not a random layout.
 * Each interview round is its own distinct node name ("INTERVIEW_1", "INTERVIEW_2", ...) -
 * they're expanded here, sorted numerically, at the position the plain "INTERVIEW" stage
 * used to occupy.
 */
export function orderNodeNames(names: Set<string>): string[] {
  const ordered: string[] = [];
  for (const stage of STAGE_ORDER) {
    if (stage === "INTERVIEW") {
      const rounds = [...names]
        .filter((name) => interviewRoundOf(name) !== null)
        .sort((a, b) => interviewRoundOf(a)! - interviewRoundOf(b)!);
      ordered.push(...rounds);
      continue;
    }
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

export interface SankeyChartData {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
}

/**
 * Builds the recharts-shaped {nodes, links} the Sankey component consumes, from the raw
 * name-keyed links the backend returns. This chart is a left-to-right funnel and can't
 * represent a cycle - if an application's status history goes "backward" (e.g. Phone
 * Screen -> OA again, after already having passed through OA), the resulting link points
 * from a later canonical stage back to an earlier one. d3-sankey (which recharts' Sankey
 * uses internally) computes node depth by recursing over the graph, and a real cycle there
 * recurses forever until the call stack overflows. Dropping any non-forward link keeps the
 * graph acyclic without touching the application's actual stored status-event history -
 * only this chart's own rendering is affected.
 *
 * In practice this filter is now a pure safety net: the backend already numbers each
 * interview round globally per application (see StatsService), so a genuine cycle should
 * never reach this function at all - but rendering must never crash even if it somehow did.
 */
export function buildSankeyData(links: SankeyLink[]): SankeyChartData {
  const names = new Set<string>();
  for (const link of links) {
    names.add(link.source);
    names.add(link.target);
  }
  const orderedNames = orderNodeNames(names);
  const indexOf = new Map(orderedNames.map((name, i) => [name, i]));

  const forwardLinks = links.filter((link) => indexOf.get(link.source)! < indexOf.get(link.target)!);

  return {
    nodes: orderedNames.map((name) => ({ name })),
    links: forwardLinks.map((link) => ({
      source: indexOf.get(link.source)!,
      target: indexOf.get(link.target)!,
      value: link.value,
    })),
  };
}
