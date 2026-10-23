/** Mirrors of the backend DTOs the extension touches. Keep in sync with
 *  backend/src/main/java/com/ontrack/backend/dto/. */

export type ApplicationStatus =
  | "APPLIED"
  | "OA"
  | "PHONE_SCREEN"
  | "ONSITE_FINAL"
  | "OFFER"
  | "REJECTED";

/** dto/AuthResponse.java, returned by GET /api/session. */
export interface SessionResponse {
  token: string;
  userId: string;
  email: string;
}

/** dto/ApplicationRequest.java. dateApplied is an ISO yyyy-MM-dd LocalDate. */
export interface ApplicationRequest {
  company: string;
  role: string;
  jobDescriptionText: string;
  applicationUrl: string;
  dateApplied: string;
}

/** dto/ApplicationResponse.java. */
export interface ApplicationResponse {
  id: string;
  company: string;
  role: string;
  jobDescriptionText: string | null;
  applicationUrl: string | null;
  dateApplied: string;
  currentStatus: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

/** dto/ApplicationLookupResponse.java. */
export interface ApplicationLookupResponse {
  match: ApplicationResponse | null;
}

/** dto/AiUsageResponse.java, from GET /api/users/me/ai-usage. */
export interface AiUsageResponse {
  remaining: number;
  limit: number;
}

/** dto/ExtractJobRequest.java. */
export interface ExtractJobRequest {
  url: string;
  pageTitle: string;
  pageText: string;
}

/** dto/ExtractJobResponse.java. */
export interface ExtractJobResponse {
  company: string | null;
  role: string | null;
  jobDescriptionText: string | null;
  confidence: "high" | "medium" | "low";
}

/**
 * Everything the popup needs to pick a sentence from Section 4.2. The worker
 * never passes a raw Response or a stack trace back to the UI.
 */
export type ApiErrorKind =
  | "unauthorized" // 401, show the signed-out state
  | "offline" // fetch rejected, no response at all
  | "waking" // health probe says the backend is still cold starting
  | "capReached" // 409 from the 100-application cap
  | "rateLimited" // 429, either the request limiter or the daily AI budget
  | "aiUnavailable" // 502 from Gemini
  | "validation" // 400
  | "server" // 5xx that is not a known case
  | "unknown";

export interface ApiError {
  kind: ApiErrorKind;
  /** The server's own message when it is already user-friendly, else "". */
  message: string;
  status?: number;
  /** Seconds, from the Retry-After header on a 429. */
  retryAfterSeconds?: number;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
