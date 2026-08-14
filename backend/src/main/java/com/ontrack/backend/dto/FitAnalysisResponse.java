package com.ontrack.backend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FitAnalysisResponse(
        UUID id,
        Integer fitScore,
        List<String> missingKeywords,
        List<String> suggestedBullets,
        Instant createdAt,
        boolean cached
) {
}
