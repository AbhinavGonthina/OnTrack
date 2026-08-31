"use client";

import { InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  label: string;
}

export function AuthInput({ icon: Icon, label, className = "", type, ...props }: AuthInputProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const resolvedType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <label className="flex flex-col gap-1 text-sm text-foreground">
      {label}
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          type={resolvedType}
          className={`w-full rounded-lg border border-surface-border bg-surface py-2 pl-9 ${isPassword ? "pr-9" : "pr-3"} text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </label>
  );
}
