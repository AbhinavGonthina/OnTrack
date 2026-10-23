import type { ReactNode } from "react";
import { Logo } from "../components/Logo";
import { COPY } from "../copy";

/**
 * Small shared pieces, styled to match the web app's ApplicationForm: inputs
 * and buttons with the same border, radius and focus treatment, Save as the
 * primary button and everything secondary as a text button.
 */

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 border-b border-[var(--color-surface-border)] px-4 py-3">
      <Logo size={18} />
      <span className="text-[13px] font-semibold">{COPY.appName}</span>
      {children}
    </header>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return <div className="px-4 py-3">{children}</div>;
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--color-muted)]">
      <span
        aria-hidden="true"
        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--color-surface-border)] border-t-[var(--color-brand)]"
      />
      <span>{label}</span>
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg bg-[var(--color-brand)] px-3 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function TextButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded text-[13px] font-medium text-[var(--color-brand)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-[var(--color-muted)] disabled:no-underline"
    >
      {children}
    </button>
  );
}

const FIELD_CLASS =
  "w-full rounded-lg border border-[var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] text-[var(--color-foreground)] outline-none transition-colors focus:border-[var(--color-brand)]";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  highlight,
  id,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  /** A field a reader could not fill, so the user's eye goes to it first. */
  highlight?: boolean;
  id: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--color-muted)]">
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        // Enter in a single line field must not submit by accident.
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        className={`${FIELD_CLASS} ${
          highlight ? "border-[var(--color-brand)]" : ""
        }`}
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  id,
  caption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
  caption?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-[11px] font-medium text-[var(--color-muted)]">
        {label}
      </span>
      <textarea
        id={id}
        value={value}
        rows={6}
        onChange={(event) => onChange(event.target.value)}
        className={`${FIELD_CLASS} resize-none`}
      />
      {caption ? (
        <span className="mt-1 block text-right text-[10px] text-[var(--color-muted)]">
          {caption}
        </span>
      ) : null}
    </label>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-[var(--color-surface)] px-2.5 py-2 text-[12px] text-[var(--color-muted)]">
      {children}
    </p>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-[var(--color-danger)] px-2.5 py-2 text-[12px] text-[var(--color-danger)]"
    >
      {children}
    </p>
  );
}

export function Caption({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-[var(--color-muted)]">{children}</p>;
}
