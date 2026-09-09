"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { FIELD_CLASSNAME_ROOMY } from "@/lib/inputStyles";
import type { ApplicationInput } from "@/lib/api";

interface Props {
  initial?: ApplicationInput;
  submitLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (input: ApplicationInput) => void;
  /** Where Cancel goes back to - the list when creating, the application when editing. */
  cancelHref: string;
  /**
   * Shows the (read-only) starting status alongside the date. Only meaningful when creating:
   * the server always seeds the first status event as APPLIED, so there is nothing to choose.
   */
  showInitialStatus?: boolean;
}

const LABEL = "flex flex-col gap-1.5 text-sm font-medium text-foreground";

export function ApplicationForm({
  initial,
  submitLabel,
  isSubmitting,
  error,
  onSubmit,
  cancelHref,
  showInitialStatus = false,
}: Props) {
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [jobDescriptionText, setJobDescriptionText] = useState(initial?.jobDescriptionText ?? "");
  const [dateApplied, setDateApplied] = useState(
    initial?.dateApplied ?? new Date().toISOString().slice(0, 10),
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ company, role, jobDescriptionText, dateApplied });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Two-up only from sm: side by side at 320px each field would be ~120px wide. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={LABEL}>
          Company
          <input
            required
            maxLength={255}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Stripe"
            className={FIELD_CLASSNAME_ROOMY}
          />
        </label>
        <label className={LABEL}>
          Role
          <input
            required
            maxLength={255}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Software Engineer Intern"
            className={FIELD_CLASSNAME_ROOMY}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={LABEL}>
          Date applied
          <input
            type="date"
            required
            value={dateApplied}
            onChange={(e) => setDateApplied(e.target.value)}
            className={FIELD_CLASSNAME_ROOMY}
          />
        </label>
        {showInitialStatus && (
          // Deliberately read-only rather than a working dropdown: POST /api/applications
          // takes no status, and the service always appends APPLIED as the first status
          // event. A selectable dropdown here would silently discard whatever was picked.
          <label className={LABEL}>
            Starting status
            <input
              readOnly
              disabled
              value="Applied"
              aria-describedby="starting-status-hint"
              className={`${FIELD_CLASSNAME_ROOMY} cursor-not-allowed opacity-70`}
            />
            <span id="starting-status-hint" className="text-xs font-normal text-muted">
              Every application starts here. Log later stages from its timeline.
            </span>
          </label>
        )}
      </div>

      <label className={LABEL}>
        <span className="flex flex-wrap items-center gap-2">
          Job description
          <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-xs font-normal text-brand">
            <Sparkles size={11} />
            AI fit analysis input
          </span>
        </span>
        <textarea
          rows={7}
          maxLength={20000}
          value={jobDescriptionText}
          onChange={(e) => setJobDescriptionText(e.target.value)}
          placeholder="Paste the job description here…"
          className={`${FIELD_CLASSNAME_ROOMY} min-h-[140px] resize-y p-4`}
        />
        <span className="text-xs font-normal text-muted">
          Optional, but needed for the AI resume/JD fit check.
        </span>
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-surface-border pt-5 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href={cancelHref}
          className="rounded-xl border border-surface-border px-4 py-2 text-center text-sm text-muted transition-all hover:bg-foreground/5 hover:text-foreground"
        >
          Cancel
        </Link>
        <Button type="submit" disabled={isSubmitting} className="rounded-xl px-5 py-2.5">
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
