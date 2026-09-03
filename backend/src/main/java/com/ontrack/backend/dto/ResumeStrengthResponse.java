package com.ontrack.backend.dto;

import java.util.List;

public record ResumeStrengthResponse(int score, List<String> recommendations) {
}
