import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Tighter padding/sizing for the zero-scroll dashboard's narrow sidebar column. */
  compact?: boolean;
}

export function StatTile({ label, value, icon: Icon, compact = false }: Props) {
  return (
    <div className={`card shadow-sm ${compact ? "p-3.5" : "p-4"}`}>
      <div
        className={`mb-2 flex items-center justify-center rounded-lg bg-brand/10 text-brand ${
          compact ? "h-6 w-6" : "h-8 w-8"
        }`}
      >
        {compact ? <Icon className="h-4 w-4" /> : <Icon size={16} />}
      </div>
      {/* min-h-8 reserves 2 lines of text-xs regardless of whether this particular label
          wraps (e.g. "Avg. days to first response" vs. "Applications"), so the value below
          always starts at the same baseline across every tile in the grid. */}
      <p className="min-h-8 text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
