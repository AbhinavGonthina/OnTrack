import { browser } from "wxt/browser";
import type { ApiResult } from "../api/types";
import type {
  ExtensionMessage,
  MessageResponse,
  MessageResultMap,
} from "./types";

/**
 * Popup-side half of the protocol. Keeps the generic plumbing in one place so
 * callers get a typed result and never have to cast a sendMessage response.
 */
export async function send<T extends ExtensionMessage["type"]>(
  message: Extract<ExtensionMessage, { type: T }>,
): Promise<MessageResponse<T>> {
  try {
    const response = (await browser.runtime.sendMessage(
      message,
    )) as MessageResponse<T> | undefined;

    if (!response) {
      // The worker was torn down mid-call, or nothing answered.
      return {
        ok: false,
        error: { kind: "unknown", message: "" },
      } satisfies ApiResult<MessageResultMap[T]>;
    }
    return response;
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: "unknown",
        message: error instanceof Error ? error.message : "",
      },
    } satisfies ApiResult<MessageResultMap[T]>;
  }
}
