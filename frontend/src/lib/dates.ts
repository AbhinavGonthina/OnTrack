/**
 * Formats a plain ISO calendar date ("2026-01-14") as e.g. "Jan 14, 2026".
 *
 * Deliberately builds the date from its parts rather than `new Date(iso)`: that parses a
 * date-only string as UTC midnight, so in any negative-offset timezone (i.e. everywhere in
 * the US) `toLocaleDateString` renders the *previous* day.
 */
export function formatDateApplied(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats a full ISO timestamp ("2026-01-28T14:05:00Z") for display next to a note.
 *
 * Unlike formatDateApplied this can safely use `new Date()`: a full timestamp carries its own
 * timezone, so there's no UTC-midnight ambiguity to work around.
 */
export function formatNoteTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
