package com.ontrack.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NoteRequest(
        @NotBlank @Size(max = 5000, message = "Note must be 5000 characters or fewer") String text
) {
}
