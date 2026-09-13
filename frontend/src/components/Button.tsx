import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Shows a spinner and disables the button. Swapping the label alone (e.g. "Log In" to
   * "Logging in…") is easy to miss, so a slow request reads as a frozen page rather than a
   * working one. Disabling here rather than at every call site also stops a double submit.
   */
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-linear-to-r from-brand to-brand-secondary text-white shadow-md shadow-brand/25 hover:shadow-lg hover:shadow-brand/30 hover:brightness-110 hover:scale-[1.02] active:scale-95",
  secondary:
    "border border-brand/30 text-foreground hover:bg-brand/10 hover:border-brand/50 active:scale-95",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-xs",
  md: "px-5 py-3 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  loading = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // inline-flex unconditionally rather than only while loading: switching layout mode at
      // the moment the spinner appears would shift the label sideways on click.
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:scale-100 disabled:active:scale-100 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || loading}
      // The label already changes to describe what's happening, so the spinner itself is
      // decorative; announcing it would just repeat that to a screen reader.
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={16} aria-hidden className="animate-spin" />}
      {children}
    </button>
  );
}
