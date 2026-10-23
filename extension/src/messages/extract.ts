import { browser } from "wxt/browser";
import { canonicalizeUrl } from "../extract/canonicalUrl";
import { combineBoardAndPage, runBoardReaders } from "../extract/pipeline";
import type {
  ExtractionPayload,
  ExtractionResult,
  FetchJson,
} from "../extract/types";

/**
 * Worker half of extraction: inject the extractor into the tab, fetch whatever
 * the board APIs know, and merge the two.
 */

/** Pages the extension cannot read, so the popup can say so plainly. */
const UNREADABLE_SCHEMES = [
  "chrome:",
  "chrome-extension:",
  "edge:",
  "about:",
  "moz-extension:",
  "view-source:",
  "devtools:",
  "file:",
];

const BLOCKED_HOSTS = [
  "chromewebstore.google.com",
  "chrome.google.com",
  "addons.mozilla.org",
  "microsoftedge.microsoft.com",
];

export function isReadablePage(rawUrl: string | undefined): boolean {
  if (!rawUrl) return false;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (UNREADABLE_SCHEMES.includes(url.protocol)) return false;
  // Browsers refuse to inject into their own extension galleries.
  if (BLOCKED_HOSTS.includes(url.hostname.toLowerCase())) return false;
  return url.protocol === "http:" || url.protocol === "https:";
}

/** Cross-origin fetch, permitted only for the board API hosts in the manifest. */
const workerFetchJson: FetchJson = async (url: string) => {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

export interface ExtractOutcome {
  kind: "ok" | "notAWebPage" | "failed";
  payload?: ExtractionPayload;
}

/**
 * The whole extraction path for one tab.
 *
 * executeScript is what actually consumes the activeTab permission, and it
 * only succeeds because the user clicked the toolbar icon.
 */
export async function extractFromTab(tabId: number): Promise<ExtractOutcome> {
  let tab;
  try {
    tab = await browser.tabs.get(tabId);
  } catch {
    return { kind: "failed" };
  }

  if (!isReadablePage(tab.url)) return { kind: "notAWebPage" };
  const url = new URL(tab.url as string);

  let pageResult: ExtractionResult;
  let payload: ExtractionPayload | undefined;
  try {
    const injection = await browser.scripting.executeScript({
      target: { tabId },
      files: ["/extractor.js"],
    });
    payload = injection[0]?.result as ExtractionPayload | undefined;
    if (!payload) return { kind: "failed" };
    pageResult = payload.result;
  } catch {
    // Injection is refused on some pages even when the URL looks fine.
    return { kind: "notAWebPage" };
  }

  const boardResults = await runBoardReaders(url, workerFetchJson);
  const merged = combineBoardAndPage(boardResults, pageResult, url);

  return {
    kind: "ok",
    payload: {
      result: { ...merged, url: merged.url || canonicalizeUrl(url.toString()) },
      snapshot: payload.snapshot,
    },
  };
}
