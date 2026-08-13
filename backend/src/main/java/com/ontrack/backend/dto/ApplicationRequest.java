package com.ontrack.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ApplicationRequest(
        @NotBlank @Size(max = 255) String company,
        @NotBlank @Size(max = 255) String role,
        @Size(max = 20000) String jobDescriptionText,
        @NotNull LocalDate dateApplied
) {
}
