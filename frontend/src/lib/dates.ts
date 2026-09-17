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
 * Today's date in the user's own timezone, as "YYYY-MM-DD" for a date input's default value.
 *
 * Deliberately not `new Date().toISOString().slice(0, 10)`, which is what this replaced. That
 * converts to UTC first, so anywhere west of Greenwich the date flips forward after local
 * evening: applying at 9:32pm Eastern on the 16th produced "2026-09-17", because that instant
 * is already 01:32 UTC on the 17th. Reading the local getters avoids the conversion entirely.
 */
export function todayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
