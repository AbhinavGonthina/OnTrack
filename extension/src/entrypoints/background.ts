import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { handleMessage } from "../messages/handler";
import type { ExtensionMessage } from "../messages/types";

/**
 * Everything that must outlive the popup lives here. The popup closes the
 * moment focus leaves it, so a save started from the popup would be cancelled
 * mid-flight if fetch ran there. The worker also holds the host permissions for
 * the board APIs.
 */
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Promise-returning listeners are not supported consistently across
    // browsers, so resolve manually and return true to keep the channel open.
    handleMessage(message as ExtensionMessage)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: {
            kind: "unknown",
            message: error instanceof Error ? error.message : String(error),
          },
        });
      });
    return true;
  });
});
