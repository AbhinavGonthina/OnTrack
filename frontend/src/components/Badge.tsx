import type { ApplicationStatus } from "@/lib/types";
import { STATUS_LABELS, getStatusColor } from "@/lib/statusLabels";

interface BadgeProps {
  label: string;
  color: string;
}

export function Badge({ label, color }: BadgeProps) {
  return (
    <span
      className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge label={STATUS_LABELS[status]} color={getStatusColor(status)} />;
}
