package com.ontrack.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FeedbackRequest(
        @NotBlank @Size(max = 2000, message = "Feedback must be 2000 characters or fewer") String message,
        String pageUrl
) {
}
