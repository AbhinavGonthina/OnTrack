import type {
  AiUsageResponse,
  ApiError,
  ApplicationResponse,
} from "../api/types";
import type {
  ExtractionResult,
  ExtractionSource,
  PageSnapshot,
} from "../extract/types";

/**
 * The popup's whole state machine, kept out of the components so every
 * transition in Section 4.2 can be tested without rendering anything.
 */

export type Phase =
  /** Probe and extraction are still in flight. Never flash "signed out" here. */
  | "checking"
  | "signedOut"
  /** Render is cold starting; the draft is held so nothing is lost. */
  | "waking"
  /** chrome://, the Web Store, a PDF: nothing to read. */
  | "notAWebPage"
  /** The editable form. Covers the Extracted, Partial and manual cases. */
  | "form"
  | "unreadable"
  | "aiConsent"
  | "aiReading"
  | "duplicate"
  | "saving"
  | "saved";

export interface Draft {
  company: string;
  role: string;
  description: string;
  url: string;
  /** yyyy-MM-dd in the user's local time, which is what the API wants. */
  dateApplied: string;
}

export interface PopupState {
  phase: Phase;
  draft: Draft;
  source: ExtractionSource | null;
  notes: string[];
  /** Fields a reader could not find, highlighted in the form. */
  missing: Array<"company" | "role">;
  duplicate: ApplicationResponse | null;
  saved: ApplicationResponse | null;
  error: ApiError | null;
  aiUsage: AiUsageResponse | null;
  /** Page text held back for the AI fallback, so no second injection is needed. */
  snapshot: PageSnapshot | null;
  /** True once the user has chosen to save despite a duplicate. */
  savingAnyway: boolean;
}

export type PopupAction =
  | { type: "session/ok" }
  | { type: "session/signedOut" }
  | { type: "session/waking" }
  | { type: "session/awake" }
  | { type: "page/notAWebPage" }
  | { type: "extraction/done"; result: ExtractionResult; snapshot: PageSnapshot }
  | { type: "extraction/failed" }
  | { type: "lookup/match"; match: ApplicationResponse }
  | { type: "aiUsage/loaded"; usage: AiUsageResponse }
  | { type: "draft/change"; field: keyof Draft; value: string }
  | { type: "ai/askConsent" }
  | { type: "ai/decline" }
  | { type: "ai/start" }
  | { type: "ai/done"; company: string | null; role: string | null; description: string | null }
  | { type: "ai/failed"; error: ApiError }
  | { type: "fillInManually" }
  | { type: "save/start" }
  | { type: "save/ok"; application: ApplicationResponse }
  | { type: "save/failed"; error: ApiError }
  | { type: "duplicate/saveAnyway" }
  | { type: "error/dismiss" };

/** Today in the user's own timezone. toISOString() would be UTC and can be a day off. */
export function todayLocalIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function initialState(now: Date = new Date()): PopupState {
  return {
    phase: "checking",
    draft: {
      company: "",
      role: "",
      description: "",
      url: "",
      dateApplied: todayLocalIso(now),
    },
    source: null,
    notes: [],
    missing: [],
    duplicate: null,
    saved: null,
    error: null,
    aiUsage: null,
    snapshot: null,
    savingAnyway: false,
  };
}

function missingFields(draft: Draft): Array<"company" | "role"> {
  const missing: Array<"company" | "role"> = [];
  if (!draft.company.trim()) missing.push("company");
  if (!draft.role.trim()) missing.push("role");
  return missing;
}

/** Company and role are the two the API requires. */
export function canSave(state: PopupState): boolean {
  return (
    Boolean(state.draft.company.trim()) &&
    Boolean(state.draft.role.trim()) &&
    state.phase !== "saving"
  );
}

/**
 * True when a reader found something but not everything, which is the Partial
 * state: the form renders with the gaps highlighted and a one-line note.
 */
export function isPartial(state: PopupState): boolean {
  return state.phase === "form" && state.missing.length > 0 && state.source !== null;
}

/**
 * The signed-out and waking states must not destroy the extracted draft: the
 * user signs in or waits, reopens the popup, and expects their job to still be
 * there. Only the phase changes.
 */
export function reducer(state: PopupState, action: PopupAction): PopupState {
  switch (action.type) {
    case "session/ok":
      // Only leave "checking" once extraction has also reported, otherwise the
      // form would render empty for a moment.
      return state.phase === "signedOut" || state.phase === "waking"
        ? { ...state, phase: state.source || state.draft.url ? "form" : "checking", error: null }
        : state;

    case "session/signedOut":
      return { ...state, phase: "signedOut", error: null };

    case "session/waking":
      return { ...state, phase: "waking", error: null };

    case "session/awake":
      return state.phase === "waking"
        ? { ...state, phase: state.draft.url ? "form" : "checking" }
        : state;

    case "page/notAWebPage":
      return { ...state, phase: "notAWebPage" };

    case "extraction/done": {
      const { result, snapshot } = action;
      const draft: Draft = {
        ...state.draft,
        company: result.company ?? "",
        role: result.role ?? "",
        description: result.description ?? "",
        url: result.url,
      };
      const missing = missingFields(draft);

      // Nothing usable found at all: offer the manual form or the AI fallback.
      const unreadable = !result.company && !result.role;

      return {
        ...state,
        // Staying signed out takes priority over showing a form the user
        // cannot submit.
        phase:
          state.phase === "signedOut" || state.phase === "waking"
            ? state.phase
            : unreadable
              ? "unreadable"
              : "form",
        draft,
        source: result.source,
        notes: result.notes,
        missing,
        snapshot,
      };
    }

    case "extraction/failed":
      return state.phase === "signedOut" || state.phase === "waking"
        ? state
        : { ...state, phase: "unreadable" };

    case "lookup/match":
      // A duplicate is only worth interrupting for before the user saves.
      return state.phase === "saved" || state.savingAnyway
        ? state
        : { ...state, phase: "duplicate", duplicate: action.match };

    case "aiUsage/loaded":
      return { ...state, aiUsage: action.usage };

    case "draft/change": {
      const draft = { ...state.draft, [action.field]: action.value };
      return {
        ...state,
        draft,
        missing: missingFields(draft),
        // Editing a field clears a previous failure's message.
        error: null,
      };
    }

    case "ai/askConsent":
      return { ...state, phase: "aiConsent" };

    case "ai/decline":
      // Declining costs nothing and must not call anything. The source becomes
      // "manual" rather than keeping whatever reader half-matched: consent is
      // only ever offered from the unreadable state, so from here on the user
      // is filling the form in themselves and the caption should say so.
      return { ...state, phase: "form", source: "manual" };

    case "ai/start":
      return { ...state, phase: "aiReading", error: null };

    case "ai/done": {
      const draft: Draft = {
        ...state.draft,
        company: action.company ?? state.draft.company,
        role: action.role ?? state.draft.role,
        description: action.description ?? state.draft.description,
      };
      return {
        ...state,
        phase: "form",
        draft,
        source: "ai",
        missing: missingFields(draft),
      };
    }

    case "ai/failed":
      // Fall back to the manual form rather than stranding the user.
      return {
        ...state,
        phase: "form",
        source: state.source ?? "manual",
        error: action.error,
      };

    case "fillInManually":
      return { ...state, phase: "form", source: "manual", missing: missingFields(state.draft) };

    case "save/start":
      return { ...state, phase: "saving", error: null };

    case "save/ok":
      return { ...state, phase: "saved", saved: action.application, error: null };

    case "save/failed":
      return { ...state, phase: "form", error: action.error };

    case "duplicate/saveAnyway":
      return { ...state, phase: "form", savingAnyway: true, duplicate: null };

    case "error/dismiss":
      return { ...state, error: null };

    default: {
      const unreachable: never = action;
      void unreachable;
      return state;
    }
  }
}
