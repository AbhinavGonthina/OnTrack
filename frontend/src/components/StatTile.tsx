import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
}

export function StatTile({ label, value, icon: Icon }: Props) {
  return (
    <div className="card p-4 shadow-sm">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon size={16} />
      </div>
      {/* min-h-8 reserves 2 lines of text-xs regardless of whether this particular label
          wraps (e.g. "Avg. days to first response" vs. "Applications"), so the value below
          always starts at the same baseline across every tile in the grid. */}
      <p className="min-h-8 text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
