package com.ontrack.backend.service;

import com.ontrack.backend.ai.GeminiClient;
import com.ontrack.backend.ai.GeminiStrengthResult;
import com.ontrack.backend.dto.ResumeStrengthResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.GeminiRateLimitExceededException;
import com.ontrack.backend.exception.InvalidResumeFileException;
import com.ontrack.backend.ratelimit.GeminiRateLimiter;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Resume-editing AI helpers (upload+extract, normalize, strength score) - distinct from
 * FitAnalysisService, which compares a saved resume against one specific job description.
 * These all operate on whatever text the client currently has (not necessarily saved yet),
 * and share the same per-user daily Gemini budget as fit-analysis rather than getting their
 * own separate limits, since they're all still "a real Gemini call" cost-wise. Unlike
 * fit-analysis, none of these are cached - the input is free-form text a user is actively
 * editing, so a cached result would usually just be stale.
 */
@Service
public class ResumeAnalysisService {

    private final GeminiClient geminiClient;
    private final GeminiRateLimiter geminiRateLimiter;
    private final ResumeFileExtractor resumeFileExtractor;

    public ResumeAnalysisService(
            GeminiClient geminiClient,
            GeminiRateLimiter geminiRateLimiter,
            ResumeFileExtractor resumeFileExtractor) {
        this.geminiClient = geminiClient;
        this.geminiRateLimiter = geminiRateLimiter;
        this.resumeFileExtractor = resumeFileExtractor;
    }

    public String uploadAndNormalize(User user, MultipartFile file) {
        String rawText = resumeFileExtractor.extractText(file);
        if (rawText == null || rawText.isBlank()) {
            throw new InvalidResumeFileException("Couldn't find any text in that file");
        }
        return normalize(user, rawText);
    }

    public String normalize(User user, String rawText) {
        consumeGeminiBudget(user);
        return geminiClient.normalizeResume(rawText).normalizedText();
    }

    public ResumeStrengthResponse scoreStrength(User user, String resumeText) {
        consumeGeminiBudget(user);
        GeminiStrengthResult result = geminiClient.scoreResumeStrength(resumeText);
        return new ResumeStrengthResponse(result.score(), result.recommendations());
    }

    private void consumeGeminiBudget(User user) {
        if (!geminiRateLimiter.tryConsume(user.getId())) {
            throw new GeminiRateLimitExceededException();
        }
    }
}
