package com.ontrack.backend.service;

import com.ontrack.backend.ai.GeminiClient;
import com.ontrack.backend.ai.GeminiNormalizeResult;
import com.ontrack.backend.ai.GeminiStrengthResult;
import com.ontrack.backend.dto.ResumeStrengthResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.GeminiRateLimitExceededException;
import com.ontrack.backend.exception.InvalidResumeFileException;
import com.ontrack.backend.entity.ResumeStrength;
import com.ontrack.backend.ratelimit.GeminiRateLimiter;
import com.ontrack.backend.repository.ResumeStrengthRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeAnalysisServiceTest {

    @Mock
    private GeminiClient geminiClient;

    @Mock
    private GeminiRateLimiter geminiRateLimiter;

    @Mock
    private ResumeFileExtractor resumeFileExtractor;

    @Mock
    private ResumeStrengthRepository resumeStrengthRepository;

    private ResumeAnalysisService resumeAnalysisService;
    private User user;

    @BeforeEach
    void setUp() {
        resumeAnalysisService = new ResumeAnalysisService(
                geminiClient, geminiRateLimiter, resumeFileExtractor, resumeStrengthRepository);
        user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
    }

    @Test
    void normalizeThrowsWhenRateLimited() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(false);

        assertThatThrownBy(() -> resumeAnalysisService.normalize(user, "raw text"))
                .isInstanceOf(GeminiRateLimitExceededException.class);
    }

    @Test
    void normalizeReturnsGeminiNormalizedText() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.normalizeResume("raw text")).thenReturn(new GeminiNormalizeResult("## Experience\n- Cleaned up"));

        String result = resumeAnalysisService.normalize(user, "raw text");

        assertThat(result).isEqualTo("## Experience\n- Cleaned up");
    }

    @Test
    void scoreStrengthThrowsWhenRateLimited() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(false);

        assertThatThrownBy(() -> resumeAnalysisService.scoreStrength(user, "resume text"))
                .isInstanceOf(GeminiRateLimitExceededException.class);
    }

    @Test
    void scoreStrengthReturnsGeminiScoreCategoriesAndRecommendations() {
        when(resumeStrengthRepository.findByUserIdAndInputHash(eq(user.getId()), anyString()))
                .thenReturn(Optional.empty());
        when(resumeStrengthRepository.save(any(ResumeStrength.class))).thenAnswer(inv -> inv.getArgument(0));
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.scoreResumeStrength("resume text"))
                .thenReturn(new GeminiStrengthResult(
                        80,
                        List.of(new GeminiStrengthResult.CategoryScore("Impact & Metrics", 70, "Quantify more.")),
                        List.of("Add metrics")));

        ResumeStrengthResponse response = resumeAnalysisService.scoreStrength(user, "resume text");

        assertThat(response.score()).isEqualTo(80);
        assertThat(response.categories()).hasSize(1);
        assertThat(response.categories().get(0).name()).isEqualTo("Impact & Metrics");
        assertThat(response.categories().get(0).score()).isEqualTo(70);
        assertThat(response.categories().get(0).feedback()).isEqualTo("Quantify more.");
        assertThat(response.recommendations()).containsExactly("Add metrics");
    }

    @Test
    void uploadAndNormalizeExtractsThenNormalizes() {
        MultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", new byte[0]);
        when(resumeFileExtractor.extractText(file)).thenReturn("extracted raw text");
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.normalizeResume("extracted raw text")).thenReturn(new GeminiNormalizeResult("normalized"));

        String result = resumeAnalysisService.uploadAndNormalize(user, file);

        assertThat(result).isEqualTo("normalized");
    }

    @Test
    void uploadAndNormalizeThrowsWhenExtractedTextIsBlank() {
        MultipartFile file = new MockMultipartFile("file", "resume.pdf", "application/pdf", new byte[0]);
        when(resumeFileExtractor.extractText(file)).thenReturn("   ");

        assertThatThrownBy(() -> resumeAnalysisService.uploadAndNormalize(user, file))
                .isInstanceOf(InvalidResumeFileException.class);
    }

    // The whole point of V9: scoring the same text twice must not cost a second Gemini call.
    @Test
    void scoreStrengthServesAStoredScoreWithoutCallingGemini() {
        when(resumeStrengthRepository.findByUserIdAndInputHash(eq(user.getId()), anyString()))
                .thenReturn(Optional.of(storedStrength(82)));

        ResumeStrengthResponse response = resumeAnalysisService.scoreStrength(user, "resume text");

        assertThat(response.score()).isEqualTo(82);
        assertThat(response.cached()).isTrue();
        verifyNoInteractions(geminiClient);
        verify(geminiRateLimiter, never()).tryConsume(any(UUID.class));
    }

    // Editing the resume changes the hash, so the stored row no longer matches and a fresh score
    // is computed. This is the same mechanism fit analysis uses.
    @Test
    void scoreStrengthRecomputesWhenTheResumeTextHasChanged() {
        when(resumeStrengthRepository.findByUserIdAndInputHash(eq(user.getId()), anyString()))
                .thenReturn(Optional.empty());
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.scoreResumeStrength("edited resume")).thenReturn(
                new GeminiStrengthResult(70, List.of(new GeminiStrengthResult.CategoryScore("Clarity", 70, "Fine.")),
                        List.of("Tighten it")));
        when(resumeStrengthRepository.save(any(ResumeStrength.class))).thenAnswer(inv -> inv.getArgument(0));

        ResumeStrengthResponse response = resumeAnalysisService.scoreStrength(user, "edited resume");

        assertThat(response.score()).isEqualTo(70);
        assertThat(response.cached()).isFalse();
    }

    // "Re-analyze" has to reach Gemini even though the cache would match, or the button does
    // nothing visible and the user concludes it is broken.
    @Test
    void scoreStrengthWithForceBypassesTheCache() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.scoreResumeStrength("resume text")).thenReturn(
                new GeminiStrengthResult(91, List.of(new GeminiStrengthResult.CategoryScore("Impact", 91, "Strong.")),
                        List.of("Ship it")));
        when(resumeStrengthRepository.save(any(ResumeStrength.class))).thenAnswer(inv -> inv.getArgument(0));

        ResumeStrengthResponse response = resumeAnalysisService.scoreStrength(user, "resume text", true);

        assertThat(response.score()).isEqualTo(91);
        assertThat(response.cached()).isFalse();
        verify(resumeStrengthRepository, never()).findByUserIdAndInputHash(any(UUID.class), anyString());
    }

    @Test
    void findCachedStrengthReturnsEmptyWhenTheUserHasNoResumeYet() {
        User noResume = User.builder().id(UUID.randomUUID()).email("new@example.com").build();

        assertThat(resumeAnalysisService.findCachedStrength(noResume)).isEmpty();
        verifyNoInteractions(resumeStrengthRepository);
    }

    // Page load calls this, so it must never be able to spend a Gemini call.
    @Test
    void findCachedStrengthNeverCallsGemini() {
        User withResume = User.builder().id(UUID.randomUUID()).email("p@example.com").resumeText("saved resume").build();
        when(resumeStrengthRepository.findByUserIdAndInputHash(eq(withResume.getId()), anyString()))
                .thenReturn(Optional.of(storedStrength(64)));

        Optional<ResumeStrengthResponse> cached = resumeAnalysisService.findCachedStrength(withResume);

        assertThat(cached).isPresent();
        assertThat(cached.get().score()).isEqualTo(64);
        assertThat(cached.get().cached()).isTrue();
        verifyNoInteractions(geminiClient);
    }

    private ResumeStrength storedStrength(int score) {
        return ResumeStrength.builder()
                .userId(user.getId())
                .inputHash("hash")
                .score(score)
                .categories(List.of(new ResumeStrength.CategoryScore("Impact & Metrics", score, "Stored feedback.")))
                .recommendations(List.of("Stored recommendation"))
                .build();
    }
}
