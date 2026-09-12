package com.ontrack.backend.dto;

import java.util.List;

/**
 * @param cached true when this came from the stored score rather than a fresh Gemini call, so the
 *               UI can say the result is a saved one instead of implying it just recomputed.
 */
public record ResumeStrengthResponse(
        int score, List<CategoryScore> categories, List<String> recommendations, boolean cached) {

    public record CategoryScore(String name, int score, String feedback) {
    }
}
