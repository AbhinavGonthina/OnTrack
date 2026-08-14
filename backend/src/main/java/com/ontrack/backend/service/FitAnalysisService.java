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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
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

    @Transactional
    public FitAnalysisResponse getOrCreate(User user, UUID applicationId) {
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

        String inputHash = sha256Hex(resumeText + jobDescriptionText);

        return fitAnalysisRepository.findByApplicationIdAndInputHash(applicationId, inputHash)
                .map(existing -> toResponse(existing, true))
                .orElseGet(() -> {
                    if (!geminiRateLimiter.tryConsume(user.getId())) {
                        throw new GeminiRateLimitExceededException();
                    }
                    GeminiFitResult result = geminiClient.analyzeFit(resumeText, jobDescriptionText);
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

    private String sha256Hex(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
