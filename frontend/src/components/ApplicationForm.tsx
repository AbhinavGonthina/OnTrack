"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/Button";
import type { ApplicationInput } from "@/lib/api";

interface Props {
  initial?: ApplicationInput;
  submitLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (input: ApplicationInput) => void;
}

const inputClassName =
  "rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-black";

export function ApplicationForm({ initial, submitLabel, isSubmitting, error, onSubmit }: Props) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
        Company
        <input
          required
          maxLength={255}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
        Role
        <input
          required
          maxLength={255}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
        Date applied
        <input
          type="date"
          required
          value={dateApplied}
          onChange={(e) => setDateApplied(e.target.value)}
          className={inputClassName}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
        Job description
        <textarea
          rows={8}
          maxLength={20000}
          value={jobDescriptionText}
          onChange={(e) => setJobDescriptionText(e.target.value)}
          className={inputClassName}
        />
        <span className="text-xs text-black/50 dark:text-white/50">
          Optional, but needed for the AI resume/JD fit check.
        </span>
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full sm:w-fit">
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
