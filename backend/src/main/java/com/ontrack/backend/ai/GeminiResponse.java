package com.ontrack.backend.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Minimal shape of a Gemini generateContent response — only the fields we
 * actually read (candidates[0].content.parts[0].text). Ignores unknown
 * properties since Gemini responses include several fields we don't need
 * (finishReason, usageMetadata, thoughtSignature, etc.), and those have
 * changed across model versions.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
record GeminiResponse(List<Candidate> candidates) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    record Candidate(Content content) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Content(List<Part> parts) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Part(String text) {
    }
}
