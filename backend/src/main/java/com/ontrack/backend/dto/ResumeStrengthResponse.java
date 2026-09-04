package com.ontrack.backend.dto;

import java.util.List;

public record ResumeStrengthResponse(int score, List<CategoryScore> categories, List<String> recommendations) {

    public record CategoryScore(String name, int score, String feedback) {
    }
}
