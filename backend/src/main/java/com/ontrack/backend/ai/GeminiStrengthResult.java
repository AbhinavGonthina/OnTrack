package com.ontrack.backend.ai;

import java.util.List;

public record GeminiStrengthResult(int score, List<String> recommendations) {
}
