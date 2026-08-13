package com.ontrack.backend.dto;

import com.ontrack.backend.enums.ApplicationStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record ApplicationResponse(
        UUID id,
        String company,
        String role,
        String jobDescriptionText,
        LocalDate dateApplied,
        ApplicationStatus currentStatus,
        Instant createdAt,
        Instant updatedAt
) {
}
