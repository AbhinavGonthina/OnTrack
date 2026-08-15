"use client";

import { useMemo, useState } from "react";
import { Sankey, ResponsiveContainer } from "recharts";
import type { LinkProps, NodeProps } from "recharts/types/chart/Sankey";
import type { SankeyLink } from "@/lib/types";
import { getNodeColor, getNodeLabel, orderNodeNames } from "@/lib/sankeyColors";

interface Props {
  links: SankeyLink[];
}

interface TooltipState {
  index: number;
  x: number;
  y: number;
  value: number;
}

function SankeyNode({ x, y, width, height, payload }: NodeProps) {
  const name = payload.name as string;
  const color = getNodeColor(name);
  const label = getNodeLabel(name);
  const labelOnRight = x < 60;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />
      <text
        x={labelOnRight ? x + width + 8 : x - 8}
        y={y + height / 2}
        textAnchor={labelOnRight ? "start" : "end"}
        dominantBaseline="middle"
        className="fill-[#0b0b0b] text-xs dark:fill-white"
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

export function SankeyChart({ links }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const data = useMemo(() => {
    const names = new Set<string>();
    for (const link of links) {
      names.add(link.source);
      names.add(link.target);
    }
    const orderedNames = orderNodeNames(names);
    const indexOf = new Map(orderedNames.map((name, i) => [name, i]));

    return {
      nodes: orderedNames.map((name) => ({ name })),
      links: links.map((link) => ({
        source: indexOf.get(link.source)!,
        target: indexOf.get(link.target)!,
        value: link.value,
      })),
    };
  }, [links]);

  if (links.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-black/10 bg-[#fcfcfb] text-sm text-black/50 dark:border-white/10 dark:bg-[#1a1a19] dark:text-white/50">
        Add an application and log a status update to see your pipeline here.
      </div>
    );
  }

  return (
    <div className="relative rounded-xl border border-black/10 bg-[#fcfcfb] p-4 dark:border-white/10 dark:bg-[#1a1a19]">
      <ResponsiveContainer width="100%" height={320}>
        <Sankey
          data={data}
          node={SankeyNode}
          link={(linkProps: LinkProps) => {
            const targetName = linkProps.payload.target.name as string;
            const color = getNodeColor(targetName);
            const isActive = tooltip?.index === linkProps.index;
            return (
              <path
                d={buildLinkPath(linkProps)}
                fill="none"
                stroke={color}
                strokeWidth={linkProps.linkWidth}
                strokeOpacity={isActive ? 0.75 : 0.45}
                onMouseEnter={() =>
                  setTooltip({
                    index: linkProps.index,
                    x: (linkProps.sourceX + linkProps.targetX) / 2,
                    y: (linkProps.sourceY + linkProps.targetY) / 2,
                    value: linkProps.payload.value,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              />
            );
          }}
          nodePadding={24}
          nodeWidth={12}
          margin={{ top: 8, right: 110, bottom: 8, left: 110 }}
        />
      </ResponsiveContainer>
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-black/10 bg-white px-2 py-1 text-xs text-black shadow-sm dark:border-white/10 dark:bg-black dark:text-white"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -130%)" }}
        >
          {tooltip.value} application{tooltip.value === 1 ? "" : "s"}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-black/60 dark:text-white/60">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "linear-gradient(90deg, #86b6ef, #1c5cab)" }}
          />
          Pipeline stage (darker = further along)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#0ca30c" }} />
          Offer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#d03b3b" }} />
          Rejected
        </span>
      </div>
    </div>
  );
}
