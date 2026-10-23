package com.ontrack.backend.controller;

import com.ontrack.backend.dto.ExtractJobRequest;
import com.ontrack.backend.dto.ExtractJobResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.service.JobExtractionService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints the browser extension needs that have no equivalent in the web app.
 *
 * <p>Authenticated like everything else: this is not under /api/auth/** or /api/demo/**, so
 * SecurityConfig's anyRequest().authenticated() covers it. That matters more here than
 * elsewhere, because this endpoint spends a real Gemini call.
 */
@RestController
@RequestMapping("/api/extension")
public class ExtensionController {

    private final JobExtractionService jobExtractionService;

    public ExtensionController(JobExtractionService jobExtractionService) {
        this.jobExtractionService = jobExtractionService;
    }

    /**
     * Reads a job posting from raw page text, for pages the extension's own readers could
     * not parse. Only ever called after the user has seen how many AI calls they have left
     * and explicitly chosen to spend one.
     */
    @PostMapping("/extract-job")
    public ExtractJobResponse extractJob(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ExtractJobRequest request) {
        return jobExtractionService.extract(user, request);
    }
}
