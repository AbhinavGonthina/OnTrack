import { browser } from "wxt/browser";
import {
  checkHealth,
  createApplication,
  extractJobWithAi,
  getAiUsage,
  getSession,
  lookupApplication,
} from "../api/client";
import type { ApiResult } from "../api/types";
import { extractFromTab } from "./extract";
import type { ExtensionMessage } from "./types";

/** How long the saved check stays on the toolbar icon. */
const BADGE_MS = 4000;

async function showSavedBadge(): Promise<void> {
  // Not fatal if the badge APIs are unavailable (they are not in every test
  // harness), so never let a badge failure fail the save that triggered it.
  try {
    await browser.action.setBadgeBackgroundColor({ color: "#7c3aed" });
    await browser.action.setBadgeText({ text: "✓" });
    setTimeout(() => {
      void browser.action.setBadgeText({ text: "" });
    }, BADGE_MS);
  } catch {
    /* ignore */
  }
}

/**
 * Single dispatch point for everything the popup asks the worker to do.
 * Returns an ApiResult rather than throwing so the popup always has a
 * structured error to map to a sentence.
 */
export async function handleMessage(
  message: ExtensionMessage,
): Promise<ApiResult<unknown>> {
  switch (message.type) {
    case "job.extract":
      return { ok: true, data: await extractFromTab(message.tabId) };

    case "session.probe":
      return getSession();

    case "health.check":
      return { ok: true, data: { healthy: await checkHealth() } };

    case "ai.usage":
      return getAiUsage();

    case "application.lookup":
      return lookupApplication(message.url);

    case "application.save": {
      const result = await createApplication(message.payload);
      if (result.ok) void showSavedBadge();
      return result;
    }

    case "ai.extract":
      return extractJobWithAi({
        url: message.url,
        pageTitle: message.pageTitle,
        pageText: message.pageText,
      });

    case "badge.saved":
      await showSavedBadge();
      return { ok: true, data: { done: true } };

    default: {
      // Exhaustiveness: adding a message type without handling it fails to compile.
      const unreachable: never = message;
      return {
        ok: false,
        error: {
          kind: "unknown",
          message: `Unhandled message ${JSON.stringify(unreachable)}`,
        },
      };
    }
  }
}
