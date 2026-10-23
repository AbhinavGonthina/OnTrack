/**
 * Build-time configuration. WXT exposes any WXT_-prefixed environment variable
 * on import.meta.env, so a dev or e2e build can point the extension at a local
 * backend without changing code:
 *
 *   WXT_API_URL=http://localhost:8080 WXT_APP_URL=http://localhost:3000 npm run build
 *
 * The defaults are production. Nothing here is a secret: the extension only
 * ever talks to OnTrack's own API, and the Gemini key lives on the backend.
 */

function readUrl(value: string | undefined, fallback: string): string {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;
  // Strip a trailing slash so callers can always join with "/api/...".
  return raw.replace(/\/+$/, "");
}

/** OnTrack's Spring Boot API. */
export const API_URL = readUrl(
  import.meta.env.WXT_API_URL,
  "https://api.abhinavgonthina.dev",
);

/** OnTrack's web app, for "Open in OnTrack" and the sign-in link. */
export const APP_URL = readUrl(
  import.meta.env.WXT_APP_URL,
  "https://ontrack.abhinavgonthina.dev",
);

/** Mirrors ApplicationRequest.jobDescriptionText's @Size(max = 20000). */
export const MAX_DESCRIPTION_CHARS = 20_000;

/** Mirrors ExtractJobRequest.pageText's @Size(max = 30000). */
export const MAX_PAGE_TEXT_CHARS = 30_000;

/** Mirrors ApplicationRequest.applicationUrl's @Size(max = 2048). */
export const MAX_URL_CHARS = 2048;
