package com.ontrack.backend.service;

import com.ontrack.backend.ai.GeminiClient;
import com.ontrack.backend.ai.GeminiStrengthResult;
import com.ontrack.backend.dto.ResumeStrengthResponse;
import com.ontrack.backend.entity.ResumeStrength;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.GeminiRateLimitExceededException;
import com.ontrack.backend.exception.InvalidResumeFileException;
import com.ontrack.backend.ratelimit.GeminiRateLimiter;
import com.ontrack.backend.repository.ResumeStrengthRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

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
    private final ResumeStrengthRepository resumeStrengthRepository;

    public ResumeAnalysisService(
            GeminiClient geminiClient,
            GeminiRateLimiter geminiRateLimiter,
            ResumeFileExtractor resumeFileExtractor,
            ResumeStrengthRepository resumeStrengthRepository) {
        this.geminiClient = geminiClient;
        this.geminiRateLimiter = geminiRateLimiter;
        this.resumeFileExtractor = resumeFileExtractor;
        this.resumeStrengthRepository = resumeStrengthRepository;
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

    /**
     * Returns the stored score for the user's saved resume, or empty if there is none or the
     * resume has been edited since it was scored. Never calls Gemini, so the Profile page can
     * render an existing score on load rather than making the user spend a call to see one.
     */
    @Transactional(readOnly = true)
    public Optional<ResumeStrengthResponse> findCachedStrength(User user) {
        String resumeText = user.getResumeText();
        if (resumeText == null || resumeText.isBlank()) {
            return Optional.empty();
        }
        return resumeStrengthRepository
                .findByUserIdAndInputHash(user.getId(), InputHasher.sha256Hex(resumeText))
                .map(stored -> toResponse(stored, true));
    }

    public ResumeStrengthResponse scoreStrength(User user, String resumeText) {
        return scoreStrength(user, resumeText, false);
    }

    /**
     * Scored results are cached on a hash of the exact text, the same way fit analysis has always
     * worked. Re-opening Profile, or clicking Analyze again without editing, is free.
     *
     * @param force re-run against Gemini even when the stored hash matches, for an explicit
     *              "Re-analyze". Costs a call from the daily budget, so only a deliberate click
     *              sets it.
     */
    @Transactional
    public ResumeStrengthResponse scoreStrength(User user, String resumeText, boolean force) {
        String inputHash = InputHasher.sha256Hex(resumeText);
        if (!force) {
            Optional<ResumeStrengthResponse> cached = resumeStrengthRepository
                    .findByUserIdAndInputHash(user.getId(), inputHash)
                    .map(stored -> toResponse(stored, true));
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        consumeGeminiBudget(user);
        GeminiStrengthResult result = geminiClient.scoreResumeStrength(resumeText);

        // Keyed on user id, so this overwrites any previous score rather than accumulating one
        // row per revision. See V9 for why history isn't kept.
        ResumeStrength saved = resumeStrengthRepository.save(ResumeStrength.builder()
                .userId(user.getId())
                .inputHash(inputHash)
                .score(result.score())
                .categories(result.categories().stream()
                        .map(c -> new ResumeStrength.CategoryScore(c.name(), c.score(), c.feedback()))
                        .toList())
                .recommendations(result.recommendations())
                .build());
        return toResponse(saved, false);
    }

    private ResumeStrengthResponse toResponse(ResumeStrength stored, boolean cached) {
        List<ResumeStrengthResponse.CategoryScore> categories = stored.getCategories().stream()
                .map(c -> new ResumeStrengthResponse.CategoryScore(c.name(), c.score(), c.feedback()))
                .toList();
        return new ResumeStrengthResponse(stored.getScore(), categories, stored.getRecommendations(), cached);
    }

    private void consumeGeminiBudget(User user) {
        if (!geminiRateLimiter.tryConsume(user.getId())) {
            throw new GeminiRateLimitExceededException();
        }
    }
}
