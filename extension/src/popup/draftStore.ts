import { canonicalizeUrl } from "../extract/canonicalUrl";
import type { ExtractionSource } from "../extract/types";
import type { Draft } from "./state";

/**
 * Keeps an unsaved draft alive across popup closes.
 *
 * A popup is destroyed the moment focus leaves it, and the two states where
 * the user is most likely to click away are exactly the two where they have
 * the most to lose: signing in, and waiting out a cold start that can take
 * most of three minutes. Without this, coming back would hand them an empty
 * form and they would have to find the posting again.
 *
 * Storage rules (CLAUDE.md, extended to the extension by Section 2 of the
 * build spec): chrome.storage.session only, which is memory backed and
 * cleared when the browser closes, and never anything resembling a
 * credential. What is stored here is the user's own half-typed job details.
 */

const KEY_PREFIX = "draft:";

/** Drafts older than this are stale enough to be noise rather than help. */
const MAX_AGE_MS = 60 * 60 * 1000;

export interface StoredDraft {
  draft: Draft;
  source: ExtractionSource | null;
  notes: string[];
  savedAt: number;
}

/**
 * The slice of chrome.storage this module needs. Narrowing it to an interface
 * keeps the store unit testable without a browser, and makes it obvious that
 * nothing here reaches for local or sync storage.
 */
export interface SessionStorageArea {
  get(keys: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string): Promise<void>;
}

/** Keyed by canonical URL so one posting's draft never shows up on another. */
export function draftKey(url: string): string {
  return `${KEY_PREFIX}${canonicalizeUrl(url)}`;
}

export async function saveDraft(
  storage: SessionStorageArea,
  url: string,
  value: Omit<StoredDraft, "savedAt">,
): Promise<void> {
  if (!url) return;
  try {
    await storage.set({
      [draftKey(url)]: { ...value, savedAt: Date.now() } satisfies StoredDraft,
    });
  } catch {
    // Losing a draft is a far smaller problem than a popup that fails to open.
  }
}

export async function loadDraft(
  storage: SessionStorageArea,
  url: string,
  now: number = Date.now(),
): Promise<StoredDraft | null> {
  if (!url) return null;
  try {
    const key = draftKey(url);
    const stored = await storage.get(key);
    const value = stored[key] as StoredDraft | undefined;
    if (!value || typeof value.savedAt !== "number") return null;
    if (now - value.savedAt > MAX_AGE_MS) {
      await storage.remove(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/** Called once a save succeeds, so a finished job stops being offered back. */
export async function clearDraft(
  storage: SessionStorageArea,
  url: string,
): Promise<void> {
  if (!url) return;
  try {
    await storage.remove(draftKey(url));
  } catch {
    /* ignore */
  }
}
