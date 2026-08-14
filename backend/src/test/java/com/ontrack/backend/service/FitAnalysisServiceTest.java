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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FitAnalysisServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private FitAnalysisRepository fitAnalysisRepository;

    @Mock
    private GeminiClient geminiClient;

    @Mock
    private GeminiRateLimiter geminiRateLimiter;

    private FitAnalysisService fitAnalysisService;
    private User user;
    private Application application;
    private UUID appId;

    @BeforeEach
    void setUp() {
        fitAnalysisService = new FitAnalysisService(applicationRepository, fitAnalysisRepository, geminiClient, geminiRateLimiter);
        appId = UUID.randomUUID();
        user = User.builder().id(UUID.randomUUID()).email("person@example.com").resumeText("Experienced SWE").build();
        application = Application.builder().id(appId).user(user).jobDescriptionText("Looking for a backend engineer").build();
    }

    @Test
    void throwsWhenApplicationNotOwned() {
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fitAnalysisService.getOrCreate(user, appId))
                .isInstanceOf(ApplicationNotFoundException.class);
    }

    @Test
    void throwsWhenResumeTextMissing() {
        User userWithoutResume = User.builder().id(UUID.randomUUID()).email("no-resume@example.com").build();
        when(applicationRepository.findByIdAndUserId(appId, userWithoutResume.getId())).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> fitAnalysisService.getOrCreate(userWithoutResume, appId))
                .isInstanceOf(MissingFitAnalysisInputException.class);
    }

    @Test
    void throwsWhenJobDescriptionMissing() {
        Application appWithoutJd = Application.builder().id(appId).user(user).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(appWithoutJd));

        assertThatThrownBy(() -> fitAnalysisService.getOrCreate(user, appId))
                .isInstanceOf(MissingFitAnalysisInputException.class);
    }

    @Test
    void returnsCachedResultWithoutCallingGeminiOnCacheHit() {
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        FitAnalysis cached = FitAnalysis.builder()
                .id(UUID.randomUUID())
                .fitScore(80)
                .missingKeywords(List.of("Kubernetes"))
                .suggestedBullets(List.of("Led migration to microservices"))
                .build();
        when(fitAnalysisRepository.findByApplicationIdAndInputHash(any(), any())).thenReturn(Optional.of(cached));

        FitAnalysisResponse response = fitAnalysisService.getOrCreate(user, appId);

        assertThat(response.cached()).isTrue();
        assertThat(response.fitScore()).isEqualTo(80);
        verify(geminiClient, never()).analyzeFit(any(), any());
    }

    @Test
    void callsGeminiAndSavesResultOnCacheMiss() {
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(fitAnalysisRepository.findByApplicationIdAndInputHash(any(), any())).thenReturn(Optional.empty());
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        GeminiFitResult geminiResult = new GeminiFitResult(72, List.of("Docker", "AWS"), List.of("Built a CI/CD pipeline"));
        when(geminiClient.analyzeFit("Experienced SWE", "Looking for a backend engineer")).thenReturn(geminiResult);
        when(fitAnalysisRepository.save(any(FitAnalysis.class))).thenAnswer(inv -> {
            FitAnalysis fa = inv.getArgument(0);
            fa.setId(UUID.randomUUID());
            return fa;
        });

        FitAnalysisResponse response = fitAnalysisService.getOrCreate(user, appId);

        assertThat(response.cached()).isFalse();
        assertThat(response.fitScore()).isEqualTo(72);
        assertThat(response.missingKeywords()).containsExactly("Docker", "AWS");
        verify(fitAnalysisRepository).save(any(FitAnalysis.class));
    }

    @Test
    void throwsGeminiRateLimitExceededOnCacheMissWhenDailyLimitReached() {
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(fitAnalysisRepository.findByApplicationIdAndInputHash(any(), any())).thenReturn(Optional.empty());
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(false);

        assertThatThrownBy(() -> fitAnalysisService.getOrCreate(user, appId))
                .isInstanceOf(GeminiRateLimitExceededException.class);
        verify(geminiClient, never()).analyzeFit(any(), any());
    }

    @Test
    void cacheHitNeverConsumesTheGeminiRateLimit() {
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        FitAnalysis cached = FitAnalysis.builder().id(UUID.randomUUID()).fitScore(80).build();
        when(fitAnalysisRepository.findByApplicationIdAndInputHash(any(), any())).thenReturn(Optional.of(cached));

        fitAnalysisService.getOrCreate(user, appId);

        verify(geminiRateLimiter, never()).tryConsume(any());
    }
}
