package com.ontrack.backend.service;

import com.ontrack.backend.ai.GeminiClient;
import com.ontrack.backend.ai.GeminiFitResult;
import com.ontrack.backend.dto.FitAnalysisResponse;
import com.ontrack.backend.entity.Application;
import com.ontrack.backend.entity.FitAnalysis;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.exception.GeminiRateLimitExceededException;
import com.ontrack.backend.exception.MissingFitAnalysisInputException;
import com.ontrack.backend.ratelimit.GeminiRateLimiter;
import com.ontrack.backend.repository.ApplicationRepository;
import com.ontrack.backend.repository.FitAnalysisRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class FitAnalysisService {

    private final ApplicationRepository applicationRepository;
    private final FitAnalysisRepository fitAnalysisRepository;
    private final GeminiClient geminiClient;
    private final GeminiRateLimiter geminiRateLimiter;

    public FitAnalysisService(
            ApplicationRepository applicationRepository,
            FitAnalysisRepository fitAnalysisRepository,
            GeminiClient geminiClient,
            GeminiRateLimiter geminiRateLimiter) {
        this.applicationRepository = applicationRepository;
        this.fitAnalysisRepository = fitAnalysisRepository;
        this.geminiClient = geminiClient;
        this.geminiRateLimiter = geminiRateLimiter;
    }

    /**
     * Returns the cached analysis for this application's current resume and job description, or
     * empty if there isn't one. Never calls Gemini and never consumes budget, so the detail page
     * can show an existing result on load instead of making the user click to find out one
     * exists. Returns empty rather than throwing when the resume or JD is missing: on page load
     * that's an ordinary state, not an error worth surfacing.
     */
    @Transactional(readOnly = true)
    public Optional<FitAnalysisResponse> findCached(User user, UUID applicationId) {
        Application application = applicationRepository.findByIdAndUserId(applicationId, user.getId())
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));

        String resumeText = user.getResumeText();
        String jobDescriptionText = application.getJobDescriptionText();
        if (resumeText == null || resumeText.isBlank() || jobDescriptionText == null || jobDescriptionText.isBlank()) {
            return Optional.empty();
        }
        return fitAnalysisRepository
                .findByApplicationIdAndInputHash(applicationId, InputHasher.sha256Hex(resumeText + jobDescriptionText))
                .map(existing -> toResponse(existing, true));
    }

    @Transactional
    public FitAnalysisResponse getOrCreate(User user, UUID applicationId) {
        return getOrCreate(user, applicationId, false);
    }

    /**
     * @param force re-run against Gemini even when a cached result matches, for an explicit
     *              "Re-analyze". Costs a call from the daily budget, which is why it is only ever
     *              set by a deliberate user action and never by simply opening the page.
     */
    @Transactional
    public FitAnalysisResponse getOrCreate(User user, UUID applicationId, boolean force) {
        Application application = applicationRepository.findByIdAndUserId(applicationId, user.getId())
                .orElseThrow(() -> new ApplicationNotFoundException(applicationId));

        String resumeText = user.getResumeText();
        if (resumeText == null || resumeText.isBlank()) {
            throw new MissingFitAnalysisInputException(
                    "Add your resume text to your profile before requesting a fit analysis");
        }
        String jobDescriptionText = application.getJobDescriptionText();
        if (jobDescriptionText == null || jobDescriptionText.isBlank()) {
            throw new MissingFitAnalysisInputException(
                    "This application needs a job description before requesting a fit analysis");
        }

        String inputHash = InputHasher.sha256Hex(resumeText + jobDescriptionText);

        Optional<FitAnalysis> cached = force
                ? Optional.empty()
                : fitAnalysisRepository.findByApplicationIdAndInputHash(applicationId, inputHash);

        return cached
                .map(existing -> toResponse(existing, true))
                .orElseGet(() -> {
                    if (!geminiRateLimiter.tryConsume(user.getId())) {
                        throw new GeminiRateLimitExceededException();
                    }
                    GeminiFitResult result = geminiClient.analyzeFit(resumeText, jobDescriptionText);
                    // A forced re-run has the same inputs, so it would otherwise insert a second
                    // row with an identical (application, input_hash) and the next cache read
                    // would be a coin flip between them.
                    fitAnalysisRepository.findByApplicationIdAndInputHash(applicationId, inputHash)
                            .ifPresent(fitAnalysisRepository::delete);
                    FitAnalysis saved = fitAnalysisRepository.save(FitAnalysis.builder()
                            .application(application)
                            .inputHash(inputHash)
                            .fitScore(result.fitScore())
                            .missingKeywords(result.missingKeywords())
                            .suggestedBullets(result.suggestedBullets())
                            .build());
                    return toResponse(saved, false);
                });
    }

    private FitAnalysisResponse toResponse(FitAnalysis fitAnalysis, boolean cached) {
        return new FitAnalysisResponse(
                fitAnalysis.getId(),
                fitAnalysis.getFitScore(),
                fitAnalysis.getMissingKeywords(),
                fitAnalysis.getSuggestedBullets(),
                fitAnalysis.getCreatedAt(),
                cached
        );
    }

}
