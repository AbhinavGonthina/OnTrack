package com.ontrack.backend.ai;

import java.util.List;

public record GeminiStrengthResult(int score, List<CategoryScore> categories, List<String> recommendations) {

    public record CategoryScore(String name, int score, String feedback) {
    }
}
