package com.ontrack.backend.ai;

/**
 * What Gemini returns when asked to read a job posting off a page the extension's
 * readers could not parse.
 *
 * <p>Fields are empty strings rather than null when absent, because the response schema
 * marks all four required and the model has to put something there. The service turns
 * empty into null so the caller never has to care which it got.
 */
public record GeminiJobExtractResult(
        String company,
        String role,
        String jobDescription,
        String confidence
) {
}
