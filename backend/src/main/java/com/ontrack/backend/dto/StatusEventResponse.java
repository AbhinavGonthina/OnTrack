package com.ontrack.backend.dto;

import com.ontrack.backend.enums.ApplicationStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StatusEventResponse(
        UUID id,
        ApplicationStatus status,
        ApplicationStatus rejectedFromStage,
        LocalDate eventDate,
        Instant createdAt
) {
}
