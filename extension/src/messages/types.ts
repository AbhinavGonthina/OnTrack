import type {
  AiUsageResponse,
  ApiResult,
  ApplicationLookupResponse,
  ApplicationRequest,
  ApplicationResponse,
  ExtractJobResponse,
  SessionResponse,
} from "../api/types";

/**
 * Typed envelope for chrome.runtime.sendMessage. The popup never calls fetch
 * itself: a save has to survive the popup closing, and the board API host
 * permissions belong to the worker.
 */
export type ExtensionMessage =
  | { type: "session.probe" }
  | { type: "health.check" }
  | { type: "ai.usage" }
  | { type: "application.lookup"; url: string }
  | { type: "application.save"; payload: ApplicationRequest }
  | {
      type: "ai.extract";
      url: string;
      pageTitle: string;
      pageText: string;
    }
  | { type: "badge.saved" };

/** Maps each message to the payload its response carries. */
export interface MessageResultMap {
  "session.probe": SessionResponse;
  "health.check": { healthy: boolean };
  "ai.usage": AiUsageResponse;
  "application.lookup": ApplicationLookupResponse;
  "application.save": ApplicationResponse;
  "ai.extract": ExtractJobResponse;
  "badge.saved": { done: true };
}

export type MessageResponse<T extends ExtensionMessage["type"]> = ApiResult<
  MessageResultMap[T]
>;
