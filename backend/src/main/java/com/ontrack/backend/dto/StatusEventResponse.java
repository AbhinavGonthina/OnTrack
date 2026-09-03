package com.ontrack.backend.dto;

import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.enums.InterviewFormat;
import com.ontrack.backend.enums.InterviewType;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record StatusEventResponse(
        UUID id,
        ApplicationStatus status,
        ApplicationStatus rejectedFromStage,
        Integer interviewRound,
        InterviewType interviewType,
        InterviewFormat interviewFormat,
        LocalDate eventDate,
        Instant createdAt
) {
}
