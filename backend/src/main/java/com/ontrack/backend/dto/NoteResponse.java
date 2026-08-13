package com.ontrack.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record NoteResponse(
        UUID id,
        String text,
        Instant createdAt
) {
}
