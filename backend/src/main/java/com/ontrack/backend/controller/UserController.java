package com.ontrack.backend.controller;

import com.ontrack.backend.dto.AiUsageResponse;
import com.ontrack.backend.dto.ResumeStrengthResponse;
import com.ontrack.backend.dto.ResumeTextResponse;
import com.ontrack.backend.dto.ResumeUpdateRequest;
import com.ontrack.backend.dto.UserResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.ratelimit.GeminiRateLimiter;
import com.ontrack.backend.service.ResumeAnalysisService;
import com.ontrack.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

    private final UserService userService;
    private final ResumeAnalysisService resumeAnalysisService;
    private final GeminiRateLimiter geminiRateLimiter;

    public UserController(
            UserService userService,
            ResumeAnalysisService resumeAnalysisService,
            GeminiRateLimiter geminiRateLimiter) {
        this.userService = userService;
        this.resumeAnalysisService = resumeAnalysisService;
        this.geminiRateLimiter = geminiRateLimiter;
    }

    @GetMapping
    public UserResponse profile(@AuthenticationPrincipal User user) {
        return userService.getProfile(user);
    }

    /** Lets the UI show "N AI calls left today" - shared across fit-analysis, resume
     * normalize, and resume strength, since they all draw from the same daily budget. */
    @GetMapping("/ai-usage")
    public AiUsageResponse aiUsage(@AuthenticationPrincipal User user) {
        return new AiUsageResponse(geminiRateLimiter.remaining(user.getId()), geminiRateLimiter.getLimit());
    }

    @PutMapping("/resume")
    public UserResponse updateResume(@AuthenticationPrincipal User user, @Valid @RequestBody ResumeUpdateRequest request) {
        return userService.updateResume(user, request.resumeText());
    }

    /** Extracts text from an uploaded PDF/DOCX and normalizes it via Gemini - returns the
     * result for review; the client still calls PUT /resume separately to actually save it. */
    @PostMapping("/resume/upload")
    public ResumeTextResponse uploadResume(@AuthenticationPrincipal User user, @RequestParam("file") MultipartFile file) {
        return new ResumeTextResponse(resumeAnalysisService.uploadAndNormalize(user, file));
    }

    @PostMapping("/resume/normalize")
    public ResumeTextResponse normalizeResume(@AuthenticationPrincipal User user, @Valid @RequestBody ResumeUpdateRequest request) {
        return new ResumeTextResponse(resumeAnalysisService.normalize(user, request.resumeText()));
    }

    /**
     * Read-only: the stored score for the saved resume, or 204 if there is none or the resume
     * has changed since it was scored. Safe on page load, never reaches Gemini.
     */
    @GetMapping("/resume/strength")
    public ResponseEntity<ResumeStrengthResponse> cachedResumeStrength(@AuthenticationPrincipal User user) {
        return resumeAnalysisService.findCachedStrength(user)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * @param force set by an explicit "Re-analyze" to recompute even when the stored hash matches.
     *              Defaults to false, so re-scoring unchanged text is free.
     */
    @PostMapping("/resume/strength")
    public ResumeStrengthResponse resumeStrength(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ResumeUpdateRequest request,
            @RequestParam(name = "force", defaultValue = "false") boolean force) {
        return resumeAnalysisService.scoreStrength(user, request.resumeText(), force);
    }
}
