"use client";

import { useMemo, useState } from "react";
import { Sankey, ResponsiveContainer } from "recharts";
import type { LinkProps, NodeProps } from "recharts/types/chart/Sankey";
import type { SankeyLink } from "@/lib/types";
import { useTheme } from "@/context/ThemeContext";
import {
  buildSankeyData,
  getNodeColor,
  getNodeLabel,
  isRejectedNode,
  STATUS_CRITICAL,
  STATUS_GOOD,
  STATUS_NEUTRAL,
} from "@/lib/sankeyColors";

interface Props {
  links: SankeyLink[];
  /** Fills the parent's height instead of a fixed 320px - for the zero-scroll dashboard
   * layout, where the parent wraps this in an explicit fixed-height box (e.g. h-[380px])
   * so the chart's actual pixel height stays predictable regardless of viewport size. */
  fillHeight?: boolean;
}

function SankeyNode({ x, y, width, height, payload }: NodeProps) {
  const name = payload.name as string;
  const color = getNodeColor(name);
  const label = getNodeLabel(name);
  const isTerminal =
    name === "APPLIED" || name === "OFFER" || name === "ACCEPTED" || name === "DECLINED" || isRejectedNode(name);

  // Interior stage nodes (OA, Phone Screen, Onsite) are narrow and packed close together
  // with no side margin reserved for a label - placed above instead of beside so longer
  // labels never get clipped against a neighboring column's node or ribbon.
  if (!isTerminal) {
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />
        <text x={x + width / 2} y={y - 6} textAnchor="middle" className="fill-foreground text-xs font-semibold">
          {label}
        </text>
      </g>
    );
  }

  // Name-based, not x-coordinate-based: with a wide margin reserved on both edges, every
  // terminal node's x sits well past any small pixel threshold, so a "< 60" check never
  // reliably tells the leftmost (Applied) column apart from the rightmost (Offer/Rejected)
  // one - it was silently placing every terminal label on the left, jammed against the bar.
  const labelOnRight = name !== "APPLIED";

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />
      <text
        x={labelOnRight ? x + width + 8 : x - 12}
        y={y + height / 2}
        textAnchor={labelOnRight ? "start" : "end"}
        dominantBaseline="middle"
        className="fill-foreground text-xs font-semibold"
      >
        {label}
      </text>
    </g>
  );
}

function buildLinkPath(props: LinkProps): string {
  const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX } = props;
  return `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;
}

export function SankeyChart({ links, fillHeight = false }: Props) {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => buildSankeyData(links), [links]);

  return (
    <div className={`card relative ${fillHeight ? "flex h-full flex-col p-6" : "p-4"}`}>
      <h2 className="shrink-0 text-sm font-medium text-muted">Pipeline</h2>
      {/* A Sankey needs real horizontal room: the fixed left/right margins below reserve
          270px for the "Applied" and "Rejected (Phone Screen)"-style end labels, so on a
          phone the diagram was being squeezed into a ~25px sliver with every label piled on
          top of the next. Scrolling sideways below a min-width keeps the chart at its
          intended proportions instead of degrading it.

          All of that is scoped to below md, and deliberately so. This card is only 9 of 12
          columns, so an unconditional min-width starts overflowing once the viewport is
          under ~985px - which is merely ~145% browser zoom on a 1440px window. That put a
          scrollbar on the desktop layout at ordinary zoom levels, with no hint explaining it
          (the hint below is md:hidden), and because the min-width wasn't aligned to the md
          breakpoint the card's width changed *non-monotonically* across it - the grid
          reflows to full width at 768px, so the card abruptly got wider as the viewport got
          narrower, making the whole chart jump. At md+ the chart is plainly responsive again.

          overflow-y-hidden is explicit rather than inherited: CSS forces the other axis to
          auto when one axis isn't visible, so overflow-x-auto alone also allowed a spurious
          *vertical* scrollbar from sub-pixel rounding while zooming. md:overflow-visible has
          to set both axes back for the same reason. */}
      <div
        className={`${fillHeight ? "mt-3 min-h-0 flex-1" : "mt-3"} overflow-x-auto overflow-y-hidden md:overflow-visible`}
      >
        <div className={`min-w-[640px] md:min-w-0 ${fillHeight ? "h-full" : ""}`}>
          {/* debounce: ResponsiveContainer otherwise re-measures and re-lays-out on every
              intermediate resize step. With 270px of fixed margin, every node and label
              visibly shifts on each step, so a zoom gesture reads as the chart flickering
              through positions. Settling once at the end is both calmer and cheaper. */}
          <ResponsiveContainer width="100%" height={fillHeight ? "100%" : 320} debounce={150}>
            <Sankey
              data={data}
              node={SankeyNode}
              link={(linkProps: LinkProps) => {
                const targetName = linkProps.payload.target.name as string;
                const color = getNodeColor(targetName);
                const isActive = activeIndex === linkProps.index;
                const value = linkProps.payload.value as number;

                // Nodes render on top of links (recharts draws all links, then all nodes),
                // so a label sitting at the raw geometric midpoint of a link that skips one
                // or more columns (e.g. an OA -> Offer flow skipping Phone Screen/Interview)
                // would land directly behind one of those columns' opaque bars and
                // disappear. Hugging the target end instead keeps it in the gap right before
                // the target's own bar, which no other column ever occupies.
                const spansMultipleColumns = linkProps.payload.target.depth - linkProps.payload.source.depth > 1;
                const labelX = spansMultipleColumns
                  ? linkProps.targetX - 14
                  : (linkProps.sourceX + linkProps.targetX) / 2;
                const labelY = spansMultipleColumns ? linkProps.targetY : (linkProps.sourceY + linkProps.targetY) / 2;

                return (
                  <g onMouseEnter={() => setActiveIndex(linkProps.index)} onMouseLeave={() => setActiveIndex(null)}>
                    <path
                      d={buildLinkPath(linkProps)}
                      fill="none"
                      stroke={color}
                      strokeWidth={linkProps.linkWidth}
                      strokeOpacity={isActive ? 0.5 : 0.25}
                      style={{ mixBlendMode: theme === "dark" ? "screen" : "normal" }}
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor={spansMultipleColumns ? "end" : "middle"}
                      dominantBaseline="middle"
                      paintOrder="stroke"
                      // A fixed dark outline (not var(--surface), which is near-white in
                      // light mode and made a white fill blend into it) so the label stays
                      // legible over both the pale ribbon tint light mode renders and the
                      // darker one dark mode renders, without depending on the active theme.
                      stroke="#18181b"
                      strokeWidth={3}
                      className="pointer-events-none fill-white text-[11px] font-semibold"
                    >
                      {value}
                    </text>
                  </g>
                );
              }}
              nodePadding={24}
              nodeWidth={10}
              margin={{ top: 42, right: 160, bottom: 8, left: 110 }}
            />
          </ResponsiveContainer>
        </div>
      </div>
      {/* The chart being visibly cut off mid-ribbon is a hint on its own, but only if you
          already suspect it scrolls - this says so outright. md:hidden because at that
          point the card is wider than the chart's min-width and nothing is clipped. */}
      <p className="mt-2 text-xs text-muted/70 md:hidden">Scroll sideways to see the full pipeline →</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "linear-gradient(90deg, var(--pipeline-1), var(--pipeline-4))" }}
          />
          Pipeline stage (darker = further along)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_GOOD }} />
          Offer / Accepted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_NEUTRAL }} />
          Declined
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_CRITICAL }} />
          Rejected
        </span>
      </div>
    </div>
  );
}
