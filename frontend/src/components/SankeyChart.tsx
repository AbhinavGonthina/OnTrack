"use client";

import { useMemo, useState } from "react";
import { Sankey, ResponsiveContainer } from "recharts";
import type { LinkProps, NodeProps } from "recharts/types/chart/Sankey";
import type { SankeyLink } from "@/lib/types";
import { useTheme } from "@/context/ThemeContext";
import {
  getNodeColor,
  getNodeLabel,
  isRejectedNode,
  orderNodeNames,
  STATUS_CRITICAL,
  STATUS_GOOD,
} from "@/lib/sankeyColors";

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
  const isTerminal = name === "APPLIED" || name === "OFFER" || isRejectedNode(name);

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

  const labelOnRight = x < 60;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={2} />
      <text
        x={labelOnRight ? x + width + 8 : x - 8}
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

export function SankeyChart({ links }: Props) {
  const { theme } = useTheme();
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

  return (
    <div className="card relative p-4">
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
                strokeOpacity={isActive ? 0.65 : 0.38}
                style={{ mixBlendMode: theme === "dark" ? "screen" : "normal" }}
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
          margin={{ top: 26, right: 110, bottom: 8, left: 110 }}
        />
      </ResponsiveContainer>
      {tooltip && (
        <div
          className="card pointer-events-none absolute z-10 px-2 py-1 text-xs text-foreground shadow-sm"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -130%)" }}
        >
          {tooltip.value} application{tooltip.value === 1 ? "" : "s"}
        </div>
      )}
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
          Offer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_CRITICAL }} />
          Rejected
        </span>
      </div>
    </div>
  );
}
