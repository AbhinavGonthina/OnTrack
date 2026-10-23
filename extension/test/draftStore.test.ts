import { describe, expect, it, vi } from "vitest";
import {
  clearDraft,
  draftKey,
  loadDraft,
  saveDraft,
  type SessionStorageArea,
} from "../src/popup/draftStore";
import type { Draft } from "../src/popup/state";

/** An in-memory stand-in for chrome.storage.session. */
function fakeStorage(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial };
  const area: SessionStorageArea = {
    get: vi.fn(async (key: string) =>
      key in data ? { [key]: data[key] } : {},
    ),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    }),
    remove: vi.fn(async (key: string) => {
      delete data[key];
    }),
  };
  return { area, data };
}

const draft: Draft = {
  company: "Acme",
  role: "Engineer",
  description: "Build things.",
  url: "https://jobs.lever.co/acme/abc",
  dateApplied: "2026-10-22",
};

describe("draftKey", () => {
  it("keys on the canonical URL so tracking parameters do not split a draft", () => {
    expect(draftKey("https://jobs.lever.co/acme/abc?utm_source=x")).toBe(
      draftKey("https://jobs.lever.co/acme/abc"),
    );
  });

  it("keys different postings separately", () => {
    expect(draftKey("https://jobs.lever.co/acme/abc")).not.toBe(
      draftKey("https://jobs.lever.co/acme/xyz"),
    );
  });

  it("matches the posting from the page seen after applying", () => {
    expect(draftKey("https://jobs.lever.co/acme/abc/thanks")).toBe(
      draftKey("https://jobs.lever.co/acme/abc"),
    );
  });
});

describe("saveDraft and loadDraft", () => {
  it("round trips a draft", async () => {
    const { area } = fakeStorage();
    await saveDraft(area, draft.url, { draft, source: "lever", notes: [] });

    const loaded = await loadDraft(area, draft.url);

    expect(loaded?.draft).toEqual(draft);
    expect(loaded?.source).toBe("lever");
  });

  /** The reason this exists: sign in, come back, still have your work. */
  it("restores a draft saved under a URL with tracking parameters", async () => {
    const { area } = fakeStorage();
    await saveDraft(area, "https://jobs.lever.co/acme/abc?utm_source=x", {
      draft,
      source: "lever",
      notes: [],
    });

    const loaded = await loadDraft(area, "https://jobs.lever.co/acme/abc");
    expect(loaded?.draft.company).toBe("Acme");
  });

  it("returns null when nothing was saved for this posting", async () => {
    const { area } = fakeStorage();
    expect(await loadDraft(area, "https://jobs.lever.co/acme/none")).toBeNull();
  });

  it("ignores a draft older than an hour and cleans it up", async () => {
    const { area } = fakeStorage();
    await saveDraft(area, draft.url, { draft, source: "lever", notes: [] });

    const twoHoursLater = Date.now() + 2 * 60 * 60 * 1000;
    expect(await loadDraft(area, draft.url, twoHoursLater)).toBeNull();
    expect(area.remove).toHaveBeenCalledWith(draftKey(draft.url));
  });

  it("keeps a draft that is still within the hour", async () => {
    const { area } = fakeStorage();
    await saveDraft(area, draft.url, { draft, source: "lever", notes: [] });

    const halfAnHourLater = Date.now() + 30 * 60 * 1000;
    expect(await loadDraft(area, draft.url, halfAnHourLater)).not.toBeNull();
  });

  it("does nothing for a blank URL", async () => {
    const { area } = fakeStorage();
    await saveDraft(area, "", { draft, source: null, notes: [] });

    expect(area.set).not.toHaveBeenCalled();
    expect(await loadDraft(area, "")).toBeNull();
  });

  it("survives storage throwing rather than breaking the popup", async () => {
    const area: SessionStorageArea = {
      get: vi.fn(async () => {
        throw new Error("storage unavailable");
      }),
      set: vi.fn(async () => {
        throw new Error("storage unavailable");
      }),
      remove: vi.fn(async () => {
        throw new Error("storage unavailable");
      }),
    };

    await expect(
      saveDraft(area, draft.url, { draft, source: null, notes: [] }),
    ).resolves.toBeUndefined();
    await expect(loadDraft(area, draft.url)).resolves.toBeNull();
    await expect(clearDraft(area, draft.url)).resolves.toBeUndefined();
  });

  it("ignores a malformed stored value", async () => {
    const { area } = fakeStorage({ [draftKey(draft.url)]: { nonsense: true } });
    expect(await loadDraft(area, draft.url)).toBeNull();
  });
});

describe("clearDraft", () => {
  it("removes the draft once the job is saved", async () => {
    const { area } = fakeStorage();
    await saveDraft(area, draft.url, { draft, source: "lever", notes: [] });

    await clearDraft(area, draft.url);

    expect(await loadDraft(area, draft.url)).toBeNull();
  });
});

/**
 * CLAUDE.md's no-credentials rule, extended to the extension by Section 2 of
 * the build spec. The extension authenticates purely by riding the existing
 * cookie, so there is nothing token shaped to store, and this pins that down.
 */
describe("what gets stored", () => {
  it("writes only the draft fields, with no token or cookie anywhere", async () => {
    const { area, data } = fakeStorage();
    await saveDraft(area, draft.url, { draft, source: "lever", notes: ["a note"] });

    const serialized = JSON.stringify(data);
    for (const forbidden of ["token", "cookie", "ontrack_session", "authorization", "password"]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden);
    }

    const stored = data[draftKey(draft.url)] as Record<string, unknown>;
    expect(Object.keys(stored).sort()).toEqual(["draft", "notes", "savedAt", "source"]);
    expect(Object.keys(stored.draft as object).sort()).toEqual([
      "company",
      "dateApplied",
      "description",
      "role",
      "url",
    ]);
  });
});
