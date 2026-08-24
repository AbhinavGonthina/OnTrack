import { InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  label: string;
}

export function AuthInput({ icon: Icon, label, className = "", ...props }: AuthInputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-foreground">
      {label}
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          className={`w-full rounded-lg border border-surface-border bg-surface py-2 pr-3 pl-9 text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 ${className}`}
          {...props}
        />
      </div>
    </label>
  );
}
