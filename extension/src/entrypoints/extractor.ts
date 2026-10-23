import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { MAX_PAGE_TEXT_CHARS } from "../config";
import { elementToText } from "../extract/htmlToText";
import { runPipeline } from "../extract/pipeline";
import type { ExtractionPayload, FetchJson } from "../extract/types";

/**
 * Injected into the job page by the service worker, once, only after the user
 * clicks the toolbar icon (activeTab). There is no persistent content script
 * and no <all_urls> permission, so this code does not exist on any page the
 * user has not explicitly pointed the extension at.
 *
 * It returns its value through chrome.scripting.executeScript's result, which
 * is why the body is a plain return rather than a message.
 */

/** Same-origin only, which is all Workday's CXS endpoint needs. */
const pageFetchJson: FetchJson = async (url: string) => {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

/**
 * The visible text of the page, for the AI fallback. Truncated here rather
 * than in the popup so an enormous page never crosses the message boundary.
 */
function pageSnapshotText(): string {
  const text = elementToText(document.body);
  return text.length > MAX_PAGE_TEXT_CHARS
    ? text.slice(0, MAX_PAGE_TEXT_CHARS)
    : text;
}

export default defineUnlistedScript(async (): Promise<ExtractionPayload> => {
  const url = new URL(window.location.href);

  // Board readers are deliberately not run here: they are cross-origin and
  // their host permissions belong to the service worker, which merges its
  // results with these.
  const result = await runPipeline({
    doc: document,
    url,
    pageFetchJson,
  });

  return {
    result,
    snapshot: {
      url: url.toString(),
      title: document.title,
      text: pageSnapshotText(),
    },
  };
});
