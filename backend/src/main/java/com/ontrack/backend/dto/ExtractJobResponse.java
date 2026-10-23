package com.ontrack.backend.dto;

/**
 * The AI's reading of a job page. Any field the page did not state comes back null rather
 * than as an empty string, so the extension can highlight it as missing and ask the user to
 * fill it in.
 */
public record ExtractJobResponse(
        String company,
        String role,
        String jobDescriptionText,
        String confidence
) {
}
