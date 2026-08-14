package com.ontrack.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResumeUpdateRequest(
        @NotBlank @Size(max = 20000) String resumeText
) {
}
