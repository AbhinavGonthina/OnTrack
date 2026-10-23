import { describe, expect, it } from "vitest";
import {
  canSave,
  initialState,
  isPartial,
  reducer,
  todayLocalIso,
  type PopupState,
} from "../src/popup/state";
import type { ApiError, ApplicationResponse } from "../src/api/types";
import type { ExtractionResult, PageSnapshot } from "../src/extract/types";

const snapshot: PageSnapshot = {
  url: "https://acme.com/j/1",
  title: "Engineer at Acme",
  text: "page text",
};

function extraction(partial: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    company: "Acme",
    role: "Engineer",
    description: "Build things.",
    url: "https://acme.com/j/1",
    source: "jsonld",
    confidence: "high",
    notes: [],
    ...partial,
  };
}

const existing: ApplicationResponse = {
  id: "11111111-1111-1111-1111-111111111111",
  company: "Acme",
  role: "Engineer",
  jobDescriptionText: null,
  applicationUrl: "https://acme.com/j/1",
  dateApplied: "2026-10-01",
  currentStatus: "APPLIED",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
};

const error = (partial: Partial<ApiError> = {}): ApiError => ({
  kind: "unknown",
  message: "",
  ...partial,
});

/** Convenience: run a list of actions from the initial state. */
function run(...actions: Parameters<typeof reducer>[1][]): PopupState {
  return actions.reduce(reducer, initialState(new Date("2026-10-22T18:00:00")));
}

describe("todayLocalIso", () => {
  it("uses the local date, not UTC", () => {
    // Late evening in a negative offset would be tomorrow in UTC.
    const evening = new Date(2026, 9, 22, 23, 30);
    expect(todayLocalIso(evening)).toBe("2026-10-22");
  });

  it("zero pads month and day", () => {
    expect(todayLocalIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("initial state", () => {
  it("starts in checking so nothing flashes before the probe answers", () => {
    expect(initialState().phase).toBe("checking");
  });

  it("prefills today's date", () => {
    expect(initialState(new Date(2026, 9, 22)).draft.dateApplied).toBe("2026-10-22");
  });
});

describe("Extracted state", () => {
  it("shows the form with the fields filled in", () => {
    const state = run({ type: "extraction/done", result: extraction(), snapshot });

    expect(state.phase).toBe("form");
    expect(state.draft.company).toBe("Acme");
    expect(state.draft.role).toBe("Engineer");
    expect(state.draft.description).toBe("Build things.");
    expect(state.draft.url).toBe("https://acme.com/j/1");
    expect(state.source).toBe("jsonld");
    expect(state.missing).toEqual([]);
    expect(isPartial(state)).toBe(false);
  });

  it("keeps the page snapshot for a possible AI call", () => {
    const state = run({ type: "extraction/done", result: extraction(), snapshot });
    expect(state.snapshot).toEqual(snapshot);
  });

  it("carries truncation notes through", () => {
    const state = run({
      type: "extraction/done",
      result: extraction({ notes: ["Description shortened to fit OnTrack's 20,000 character limit."] }),
      snapshot,
    });
    expect(state.notes).toHaveLength(1);
  });
});

describe("Partial state", () => {
  it("flags a missing company but still shows the form", () => {
    const state = run({
      type: "extraction/done",
      result: extraction({ company: null }),
      snapshot,
    });

    expect(state.phase).toBe("form");
    expect(state.missing).toEqual(["company"]);
    expect(isPartial(state)).toBe(true);
    expect(canSave(state)).toBe(false);
  });

  it("clears the flag once the user types the company", () => {
    const state = run(
      { type: "extraction/done", result: extraction({ company: null }), snapshot },
      { type: "draft/change", field: "company", value: "Acme" },
    );

    expect(state.missing).toEqual([]);
    expect(canSave(state)).toBe(true);
  });
});

describe("Unreadable state", () => {
  it("is reached when neither company nor role was found", () => {
    const state = run({
      type: "extraction/done",
      result: extraction({ company: null, role: null }),
      snapshot,
    });
    expect(state.phase).toBe("unreadable");
  });

  it("is reached when extraction fails outright", () => {
    expect(run({ type: "extraction/failed" }).phase).toBe("unreadable");
  });

  it("Fill it in myself opens an empty form with the link and date kept", () => {
    const state = run(
      { type: "extraction/done", result: extraction({ company: null, role: null }), snapshot },
      { type: "fillInManually" },
    );

    expect(state.phase).toBe("form");
    expect(state.source).toBe("manual");
    expect(state.draft.url).toBe("https://acme.com/j/1");
    expect(state.draft.dateApplied).toBe("2026-10-22");
  });
});

describe("Signed out state", () => {
  it("never flashes before the probe answers", () => {
    expect(initialState().phase).not.toBe("signedOut");
  });

  it("takes priority over showing a form the user cannot submit", () => {
    const state = run(
      { type: "session/signedOut" },
      { type: "extraction/done", result: extraction(), snapshot },
    );
    expect(state.phase).toBe("signedOut");
  });

  it("keeps the extracted draft so signing in loses nothing", () => {
    const state = run(
      { type: "session/signedOut" },
      { type: "extraction/done", result: extraction(), snapshot },
    );

    expect(state.draft.company).toBe("Acme");
    expect(state.draft.role).toBe("Engineer");
  });

  it("returns to the form once the session becomes valid", () => {
    const state = run(
      { type: "session/signedOut" },
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "session/ok" },
    );
    expect(state.phase).toBe("form");
  });
});

describe("Waking state", () => {
  it("shows while the backend cold starts and keeps the draft", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "session/waking" },
    );

    expect(state.phase).toBe("waking");
    expect(state.draft.company).toBe("Acme");
  });

  it("returns to the form once health passes", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "session/waking" },
      { type: "session/awake" },
    );
    expect(state.phase).toBe("form");
  });
});

describe("Duplicate state", () => {
  it("shows the existing application instead of saving again", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "lookup/match", match: existing },
    );

    expect(state.phase).toBe("duplicate");
    expect(state.duplicate?.id).toBe(existing.id);
  });

  it("Save another copy returns to the form and does not ask again", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "lookup/match", match: existing },
      { type: "duplicate/saveAnyway" },
      // A late-arriving lookup must not bounce the user back.
      { type: "lookup/match", match: existing },
    );

    expect(state.phase).toBe("form");
    expect(state.savingAnyway).toBe(true);
  });

  it("does not interrupt an already saved application", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "save/ok", application: existing },
      { type: "lookup/match", match: existing },
    );
    expect(state.phase).toBe("saved");
  });
});

describe("Saving and saved", () => {
  it("disables save while in flight", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "save/start" },
    );

    expect(state.phase).toBe("saving");
    expect(canSave(state)).toBe(false);
  });

  it("moves to the saved state with the created application", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "save/start" },
      { type: "save/ok", application: existing },
    );

    expect(state.phase).toBe("saved");
    expect(state.saved?.id).toBe(existing.id);
  });
});

describe("Error paths", () => {
  it("409 returns to the form carrying the cap error", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "save/start" },
      { type: "save/failed", error: error({ kind: "capReached", status: 409 }) },
    );

    expect(state.phase).toBe("form");
    expect(state.error?.kind).toBe("capReached");
  });

  it("429 keeps the Retry-After value for the message", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "save/failed", error: error({ kind: "rateLimited", status: 429, retryAfterSeconds: 30 }) },
    );
    expect(state.error?.retryAfterSeconds).toBe(30);
  });

  it("a network failure returns to the form rather than stranding the user", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "save/failed", error: error({ kind: "offline" }) },
    );

    expect(state.phase).toBe("form");
    expect(state.error?.kind).toBe("offline");
  });

  it("editing any field clears the previous error", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "save/failed", error: error({ kind: "validation", status: 400 }) },
      { type: "draft/change", field: "company", value: "Acme Inc" },
    );
    expect(state.error).toBeNull();
  });

  it("the save keeps the draft intact so nothing is retyped", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "save/failed", error: error({ kind: "offline" }) },
    );
    expect(state.draft.company).toBe("Acme");
  });
});

describe("Not a web page", () => {
  it("has its own state", () => {
    expect(run({ type: "page/notAWebPage" }).phase).toBe("notAWebPage");
  });
});

describe("canSave", () => {
  it("requires both company and role", () => {
    const base = run({ type: "extraction/done", result: extraction(), snapshot });
    expect(canSave(base)).toBe(true);

    expect(canSave(reducer(base, { type: "draft/change", field: "company", value: "" }))).toBe(false);
    expect(canSave(reducer(base, { type: "draft/change", field: "role", value: "  " }))).toBe(false);
  });
});

describe("AI fallback", () => {
  const unreadable = () =>
    run(
      { type: "extraction/done", result: extraction({ company: null, role: null }), snapshot },
      { type: "aiUsage/loaded", usage: { remaining: 3, limit: 20 } },
    );

  it("the unreadable state knows how many calls are left", () => {
    expect(unreadable().aiUsage?.remaining).toBe(3);
  });

  it("asking for AI moves to the consent screen, not straight to a call", () => {
    const state = reducer(unreadable(), { type: "ai/askConsent" });
    expect(state.phase).toBe("aiConsent");
  });

  /**
   * The point of the consent step. Declining has to leave no trace and cost
   * nothing; the e2e suite also asserts no request is made.
   */
  it("declining returns to the manual form and spends nothing", () => {
    const declined = reducer(
      reducer(unreadable(), { type: "ai/askConsent" }),
      { type: "ai/decline" },
    );

    expect(declined.phase).toBe("form");
    expect(declined.source).toBe("manual");
    expect(declined.aiUsage?.remaining).toBe(3);
  });

  it("shows the reading state while the call is in flight", () => {
    const state = reducer(
      reducer(unreadable(), { type: "ai/askConsent" }),
      { type: "ai/start" },
    );
    expect(state.phase).toBe("aiReading");
  });

  it("fills the form from the AI result and labels the source", () => {
    const state = run(
      { type: "extraction/done", result: extraction({ company: null, role: null }), snapshot },
      { type: "ai/askConsent" },
      { type: "ai/start" },
      { type: "ai/done", company: "Acme", role: "Engineer", description: "Build things." },
    );

    expect(state.phase).toBe("form");
    expect(state.source).toBe("ai");
    expect(state.draft.company).toBe("Acme");
    expect(state.draft.role).toBe("Engineer");
    expect(state.draft.description).toBe("Build things.");
    expect(canSave(state)).toBe(true);
  });

  it("keeps a field the AI could not find flagged as missing", () => {
    const state = run(
      { type: "extraction/done", result: extraction({ company: null, role: null }), snapshot },
      { type: "ai/start" },
      { type: "ai/done", company: null, role: "Engineer", description: "Text." },
    );

    expect(state.missing).toEqual(["company"]);
    expect(canSave(state)).toBe(false);
  });

  it("a 429 falls back to the manual form carrying the error", () => {
    const state = run(
      { type: "extraction/done", result: extraction({ company: null, role: null }), snapshot },
      { type: "ai/start" },
      { type: "ai/failed", error: error({ kind: "rateLimited", status: 429 }) },
    );

    expect(state.phase).toBe("form");
    expect(state.error?.kind).toBe("rateLimited");
  });

  it("a 502 falls back to the manual form carrying the error", () => {
    const state = run(
      { type: "extraction/done", result: extraction({ company: null, role: null }), snapshot },
      { type: "ai/start" },
      { type: "ai/failed", error: error({ kind: "aiUnavailable", status: 502 }) },
    );

    expect(state.phase).toBe("form");
    expect(state.error?.kind).toBe("aiUnavailable");
  });

  it("keeps the page snapshot so the AI call has text to send", () => {
    expect(unreadable().snapshot?.text).toBe("page text");
  });
});

describe("Draft restore across a popup close", () => {
  const restored = {
    company: "Acme Edited",
    role: "Senior Engineer",
    description: "My own notes.",
    url: "https://acme.com/j/1",
    dateApplied: "2026-10-20",
  };

  it("a restored draft wins over what the readers just produced", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "draft/restore", draft: restored, source: "manual", notes: [] },
    );

    expect(state.draft).toEqual(restored);
    expect(state.phase).toBe("form");
  });

  /**
   * The two states the restore exists for. Putting the user's text back must
   * not jump them past a sign-in they still have to do, or a cold start that
   * is still running.
   */
  it("does not jump past the signed out state", () => {
    const state = run(
      { type: "session/signedOut" },
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "draft/restore", draft: restored, source: "manual", notes: [] },
    );

    expect(state.phase).toBe("signedOut");
    expect(state.draft.company).toBe("Acme Edited");
  });

  it("does not jump past the waking state", () => {
    const state = run(
      { type: "session/waking" },
      { type: "extraction/done", result: extraction(), snapshot },
      { type: "draft/restore", draft: restored, source: "manual", notes: [] },
    );

    expect(state.phase).toBe("waking");
    expect(state.draft.role).toBe("Senior Engineer");
  });

  it("recomputes which fields are still missing", () => {
    const state = run(
      { type: "extraction/done", result: extraction(), snapshot },
      {
        type: "draft/restore",
        draft: { ...restored, company: "" },
        source: "manual",
        notes: [],
      },
    );

    expect(state.missing).toEqual(["company"]);
    expect(canSave(state)).toBe(false);
  });

  it("lifts an unreadable page to the form when a draft comes back", () => {
    const state = run(
      { type: "extraction/done", result: extraction({ company: null, role: null }), snapshot },
      { type: "draft/restore", draft: restored, source: "manual", notes: [] },
    );

    expect(state.phase).toBe("form");
  });
});
