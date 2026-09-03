import type {
  ApiErrorBody,
  ApplicationDetailResponse,
  ApplicationResponse,
  ApplicationStatus,
  AuthResponse,
  FitAnalysisResponse,
  InterviewFormat,
  InterviewType,
  MessageResponse,
  NoteResponse,
  ResumeStrengthResponse,
  ResumeTextResponse,
  StatsResponse,
  UserResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  /** Only set for 429s - how long the caller should wait before it's worth retrying at all. */
  retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const errorBody = data as ApiErrorBody | undefined;
    const retryAfterHeader = response.headers?.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    throw new ApiError(
      response.status,
      errorBody?.error ?? "Something went wrong. Please try again.",
      Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
    );
  }

  return data as T;
}

async function request<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    // Sends/receives the httpOnly session cookie (see AuthContext) - needed since the
    // frontend and backend are on different origins, so the browser won't attach it by
    // default the way it would for a same-origin request.
    credentials: "include",
  });

  return parseResponse<T>(response);
}

export function checkHealth(): Promise<void> {
  return request<void>("/actuator/health");
}

// --- Feedback ---

export function submitFeedback(token: string, message: string, pageUrl: string): Promise<MessageResponse> {
  return request("/api/feedback", { method: "POST", token, body: { message, pageUrl } });
}

// --- Auth ---

export function signup(email: string, password: string): Promise<MessageResponse> {
  return request("/api/auth/signup", { method: "POST", body: { email, password } });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request("/api/auth/login", { method: "POST", body: { email, password } });
}

export function verifyEmail(token: string): Promise<MessageResponse> {
  return request("/api/auth/verify-email", { method: "POST", body: { token } });
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return request("/api/auth/resend-verification", { method: "POST", body: { email } });
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return request("/api/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
  return request("/api/auth/reset-password", { method: "POST", body: { token, newPassword } });
}

export function logout(): Promise<void> {
  return request("/api/auth/logout", { method: "POST" });
}

/** Exchanges the httpOnly session cookie (if still valid) for a fresh token - used once on
 * app load to silently restore a session after a hard refresh. Rejects if there's no valid
 * cookie, which just means "not logged in," not an error to show anyone. */
export function getSession(): Promise<AuthResponse> {
  return request("/api/session");
}

// --- User / profile ---

export function getProfile(token: string): Promise<UserResponse> {
  return request("/api/users/me", { token });
}

export function updateResume(token: string, resumeText: string): Promise<UserResponse> {
  return request("/api/users/me/resume", { method: "PUT", token, body: { resumeText } });
}

/** Extracts text from an uploaded PDF/DOCX and normalizes it via Gemini - the caller
 * still calls updateResume() separately to actually persist the result. */
export async function uploadResume(token: string, file: File): Promise<ResumeTextResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/users/me/resume/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    credentials: "include",
  });

  return parseResponse<ResumeTextResponse>(response);
}

export function normalizeResumeText(token: string, resumeText: string): Promise<ResumeTextResponse> {
  return request("/api/users/me/resume/normalize", { method: "POST", token, body: { resumeText } });
}

export function getResumeStrength(token: string, resumeText: string): Promise<ResumeStrengthResponse> {
  return request("/api/users/me/resume/strength", { method: "POST", token, body: { resumeText } });
}

// --- Applications ---

export interface ApplicationInput {
  company: string;
  role: string;
  jobDescriptionText: string;
  dateApplied: string;
}

export function getApplications(token: string): Promise<ApplicationResponse[]> {
  return request("/api/applications", { token });
}

export function createApplication(token: string, input: ApplicationInput): Promise<ApplicationResponse> {
  return request("/api/applications", { method: "POST", token, body: input });
}

export function getApplication(token: string, id: string): Promise<ApplicationDetailResponse> {
  return request(`/api/applications/${id}`, { token });
}

export function updateApplication(
  token: string,
  id: string,
  input: ApplicationInput,
): Promise<ApplicationResponse> {
  return request(`/api/applications/${id}`, { method: "PUT", token, body: input });
}

export function deleteApplication(token: string, id: string): Promise<void> {
  return request(`/api/applications/${id}`, { method: "DELETE", token });
}

export function addStatusEvent(
  token: string,
  id: string,
  status: ApplicationStatus,
  eventDate: string,
  rejectedFromStage?: ApplicationStatus,
  interviewType?: InterviewType,
  interviewFormat?: InterviewFormat,
): Promise<ApplicationResponse> {
  return request(`/api/applications/${id}/status`, {
    method: "POST",
    token,
    body: { status, eventDate, rejectedFromStage, interviewType, interviewFormat },
  });
}

export function deleteStatusEvent(token: string, id: string, eventId: string): Promise<ApplicationResponse> {
  return request(`/api/applications/${id}/status/${eventId}`, { method: "DELETE", token });
}

// --- Notes ---

export function addNote(token: string, applicationId: string, text: string): Promise<NoteResponse> {
  return request(`/api/applications/${applicationId}/notes`, { method: "POST", token, body: { text } });
}

export function deleteNote(token: string, noteId: string): Promise<void> {
  return request(`/api/notes/${noteId}`, { method: "DELETE", token });
}

// --- Fit analysis ---

export function requestFitAnalysis(token: string, applicationId: string): Promise<FitAnalysisResponse> {
  return request(`/api/applications/${applicationId}/fit-analysis`, { method: "POST", token });
}

// --- Stats ---

export function getStats(token: string): Promise<StatsResponse> {
  return request("/api/stats", { token });
}

// --- Demo (public, no token) ---

export function getDemoApplications(): Promise<ApplicationResponse[]> {
  return request("/api/demo/applications");
}

export function getDemoApplication(id: string): Promise<ApplicationDetailResponse> {
  return request(`/api/demo/applications/${id}`);
}

export function getDemoFitAnalysis(id: string): Promise<FitAnalysisResponse> {
  return request(`/api/demo/applications/${id}/fit-analysis`);
}

export function getDemoStats(): Promise<StatsResponse> {
  return request("/api/demo/stats");
}
