package com.ontrack.backend.ai;

import java.util.List;

public record GeminiFitResult(
        int fitScore,
        List<String> missingKeywords,
        List<String> suggestedBullets
) {
}
