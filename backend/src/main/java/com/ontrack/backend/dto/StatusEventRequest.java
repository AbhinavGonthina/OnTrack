package com.ontrack.backend.dto;

import com.ontrack.backend.enums.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record StatusEventRequest(
        @NotNull ApplicationStatus status,
        ApplicationStatus rejectedFromStage,
        @NotNull LocalDate eventDate
) {
}
