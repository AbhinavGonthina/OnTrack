package com.ontrack.backend.dto;

import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.enums.InterviewFormat;
import com.ontrack.backend.enums.InterviewType;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record StatusEventRequest(
        @NotNull ApplicationStatus status,
        ApplicationStatus rejectedFromStage,
        InterviewType interviewType,
        InterviewFormat interviewFormat,
        @NotNull LocalDate eventDate
) {
}
