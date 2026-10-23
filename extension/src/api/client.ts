import { API_URL } from "../config";
import type {
  AiUsageResponse,
  ApiError,
  ApiResult,
  ApplicationLookupResponse,
  ApplicationRequest,
  ApplicationResponse,
  ExtractJobRequest,
  ExtractJobResponse,
  SessionResponse,
} from "./types";

/**
 * The only place the extension talks to OnTrack. Every call sends
 * credentials: "include" so Chromium attaches the ontrack_session cookie the
 * web app already set; the extension stores no token of its own (Section 6).
 */

/** Shape of GlobalExceptionHandler's body: {timestamp, status, error}. */
interface ServerErrorBody {
  error?: unknown;
}

function kindForStatus(status: number): ApiError["kind"] {
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 400) return "validation";
  if (status === 409) return "capReached";
  if (status === 429) return "rateLimited";
  if (status === 502) return "aiUnavailable";
  if (status >= 500) return "server";
  return "unknown";
}

async function readServerMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ServerErrorBody;
    return typeof body.error === "string" ? body.error : "";
  } catch {
    return "";
  }
}

function retryAfterSeconds(response: Response): number | undefined {
  const header = response.headers.get("Retry-After");
  if (!header) return undefined;
  const seconds = Number.parseInt(header, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    // A rejected fetch means no response at all: offline, DNS failure, or the
    // backend refusing the connection while it cold starts.
    return { ok: false, error: { kind: "offline", message: "" } };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        kind: kindForStatus(response.status),
        message: await readServerMessage(response),
        status: response.status,
        retryAfterSeconds: retryAfterSeconds(response),
      },
    };
  }

  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return { ok: false, error: { kind: "server", message: "" } };
  }
}

/** 200 when the session cookie is valid, 401 otherwise. */
export function getSession(): Promise<ApiResult<SessionResponse>> {
  return request<SessionResponse>("/api/session");
}

/**
 * Cheap and public, and deliberately does not touch the database, so it is safe
 * to poll every few seconds while Render wakes the service up.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/actuator/health`, {
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function getAiUsage(): Promise<ApiResult<AiUsageResponse>> {
  return request<AiUsageResponse>("/api/users/me/ai-usage");
}

export function lookupApplication(
  url: string,
): Promise<ApiResult<ApplicationLookupResponse>> {
  return request<ApplicationLookupResponse>(
    `/api/applications/lookup?url=${encodeURIComponent(url)}`,
  );
}

export function createApplication(
  payload: ApplicationRequest,
): Promise<ApiResult<ApplicationResponse>> {
  return request<ApplicationResponse>("/api/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function extractJobWithAi(
  payload: ExtractJobRequest,
): Promise<ApiResult<ExtractJobResponse>> {
  return request<ExtractJobResponse>("/api/extension/extract-job", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
