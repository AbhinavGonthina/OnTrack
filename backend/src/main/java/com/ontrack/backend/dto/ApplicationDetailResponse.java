package com.ontrack.backend.dto;

import com.ontrack.backend.enums.ApplicationStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ApplicationDetailResponse(
        UUID id,
        String company,
        String role,
        String jobDescriptionText,
        LocalDate dateApplied,
        ApplicationStatus currentStatus,
        Instant createdAt,
        Instant updatedAt,
        List<StatusEventResponse> statusEvents,
        List<NoteResponse> notes
) {
}
