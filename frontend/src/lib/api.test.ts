import { afterEach, describe, expect, test, vi } from "vitest";
import {
  ApiError,
  createApplication,
  getApplications,
  getResumeStrength,
  login,
  normalizeResumeText,
  uploadResume,
} from "./api";

function mockFetchOnce(response: { status: number; body?: unknown; text?: string }) {
  const text =
    response.text !== undefined ? response.text : response.body !== undefined ? JSON.stringify(response.body) : "";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      text: () => Promise.resolve(text),
    }),
  );
}

describe("api request()", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("GET requests have no Content-Type header and default method", async () => {
    mockFetchOnce({ status: 200, body: [] });

    await getApplications("a-token");

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/applications");
    expect(init.method).toBe("GET");
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.headers["Authorization"]).toBe("Bearer a-token");
  });

  test("requests with a body get a JSON Content-Type and a stringified body", async () => {
    mockFetchOnce({ status: 201, body: { id: "1", company: "Acme", role: "SWE", jobDescriptionText: null, dateApplied: "2026-01-01", currentStatus: "APPLIED", createdAt: "", updatedAt: "" } });

    await createApplication("a-token", { company: "Acme", role: "SWE", jobDescriptionText: "", dateApplied: "2026-01-01" });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ company: "Acme", role: "SWE", jobDescriptionText: "", dateApplied: "2026-01-01" });
  });

  test("requests without a token omit the Authorization header", async () => {
    mockFetchOnce({ status: 200, body: { token: "t", userId: "1", email: "a@b.com" } });

    await login("a@b.com", "password123");

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers["Authorization"]).toBeUndefined();
  });

  test("a 204 response resolves to undefined without parsing a body", async () => {
    mockFetchOnce({ status: 204, text: "" });

    await expect(getApplications("a-token")).resolves.toBeUndefined();
  });

  test("a non-ok response throws ApiError with the backend's error message", async () => {
    mockFetchOnce({ status: 404, body: { timestamp: "now", status: 404, error: "Application not found" } });

    await expect(getApplications("a-token")).rejects.toMatchObject(
      new ApiError(404, "Application not found"),
    );
  });

  test("a non-ok response with no parseable error body falls back to a generic message", async () => {
    mockFetchOnce({ status: 500, text: "" });

    await expect(getApplications("a-token")).rejects.toMatchObject(
      new ApiError(500, "Something went wrong. Please try again."),
    );
  });
});

describe("resume AI endpoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("uploadResume sends multipart form data with no Content-Type header", async () => {
    mockFetchOnce({ status: 200, body: { resumeText: "extracted text" } });
    const file = new File(["irrelevant"], "resume.pdf", { type: "application/pdf" });

    const result = await uploadResume("a-token", file);

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/users/me/resume/upload");
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.headers["Authorization"]).toBe("Bearer a-token");
    expect(init.body).toBeInstanceOf(FormData);
    expect(result).toEqual({ resumeText: "extracted text" });
  });

  test("normalizeResumeText posts the resume text as JSON", async () => {
    mockFetchOnce({ status: 200, body: { resumeText: "normalized" } });

    const result = await normalizeResumeText("a-token", "messy text");

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/users/me/resume/normalize");
    expect(JSON.parse(init.body)).toEqual({ resumeText: "messy text" });
    expect(result).toEqual({ resumeText: "normalized" });
  });

  test("getResumeStrength posts the resume text and returns score/recommendations", async () => {
    mockFetchOnce({ status: 200, body: { score: 80, recommendations: ["Add metrics"] } });

    const result = await getResumeStrength("a-token", "resume text");

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/users/me/resume/strength");
    expect(result).toEqual({ score: 80, recommendations: ["Add metrics"] });
  });
});

describe("ApiError", () => {
  test("carries the HTTP status alongside the message", () => {
    const error = new ApiError(401, "Unauthorized");
    expect(error.status).toBe(401);
    expect(error.message).toBe("Unauthorized");
  });
});
