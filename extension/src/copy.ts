import type { ExtractionSource } from "./extract/types";

/**
 * Every user-facing string the extension can show, in one place.
 *
 * Appendix B of the build spec: short plain sentences, address the user as
 * "you", buttons are verbs, and no mid-sentence em dashes or en dashes
 * anywhere. test/copy.test.ts enforces the dash rule against this file and the
 * components, because it is the one that is easy to break by accident.
 */

export const COPY = {
  appName: "OnTrack",

  // --- States (Section 4.2) ---
  checking: "Reading this page",

  signedOutTitle: "Sign in to OnTrack to save this job.",
  signedOutButton: "Sign in",

  wakingTitle: "OnTrack's server is starting up.",
  wakingBody: "This can take a couple of minutes.",

  notAWebPageTitle: "Open a job posting in this tab, then click OnTrack again.",

  unreadableTitle: "We couldn't read this job posting automatically.",
  fillItInMyself: "Fill it in myself",
  useAi: (remaining: number) =>
    `Use AI to read it (uses 1 of your ${remaining} AI calls left today)`,
  aiExhausted: "You've used all of today's AI calls.",
  aiReading: "Reading the page with AI.",

  duplicateTitle: "You've already logged this job.",
  openInOnTrack: "Open in OnTrack",
  saveAnotherCopy: "Save another copy",

  savedTitle: "Saved to OnTrack.",
  viewInOnTrack: "View in OnTrack",

  // --- Form ---
  companyLabel: "Company",
  roleLabel: "Role",
  descriptionLabel: "Job description",
  linkLabel: "Link",
  dateAppliedLabel: "Date applied",
  save: "Save",
  saving: "Saving",

  missingCompany: "We could not find the company on this page. Please fill it in.",
  missingRole: "We could not find the role on this page. Please fill it in.",
  missingBoth:
    "We could not find the company or the role on this page. Please fill them in.",

  characterCount: (used: number, limit: number) =>
    `${used.toLocaleString()} of ${limit.toLocaleString()} characters`,

  // --- Errors (Section 4.2) ---
  errorCapReached: "You've reached the maximum of 100 applications.",
  errorOffline: "Couldn't reach OnTrack. Check your connection and try again.",
  errorAiUnavailable:
    "The AI service is temporarily unavailable. Please try again shortly.",
  errorGeneric: "Something went wrong. Please try again.",
  errorRateLimited: (retryAfterSeconds?: number) =>
    retryAfterSeconds
      ? `Too many requests. Try again in ${retryAfterSeconds} seconds.`
      : "Too many requests. Please try again shortly.",
} as const;

/** The caption under the form naming where the fields came from. */
export const SOURCE_CAPTION: Record<ExtractionSource, string> = {
  greenhouse: "Read from Greenhouse",
  lever: "Read from Lever",
  ashby: "Read from Ashby",
  workday: "Read from Workday",
  linkedin: "Read from LinkedIn",
  jsonld: "Read from the page's job data",
  heuristic: "Guessed from the page, please check",
  ai: "Read with AI, please double check",
  manual: "You filled this in",
};
