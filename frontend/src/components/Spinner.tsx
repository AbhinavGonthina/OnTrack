import { Loader2 } from "lucide-react";

export function Spinner({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm text-muted ${className}`}>
      <Loader2 size={16} className="animate-spin" />
      {label}
    </div>
  );
}
