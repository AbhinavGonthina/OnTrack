package com.ontrack.backend.service;

import com.ontrack.backend.ai.GeminiClient;
import com.ontrack.backend.ai.GeminiNormalizeResult;
import com.ontrack.backend.ai.GeminiStrengthResult;
import com.ontrack.backend.dto.ResumeStrengthResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.GeminiRateLimitExceededException;
import com.ontrack.backend.exception.InvalidResumeFileException;
import com.ontrack.backend.ratelimit.GeminiRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeAnalysisServiceTest {

    @Mock
    private GeminiClient geminiClient;

    @Mock
    private GeminiRateLimiter geminiRateLimiter;

    @Mock
    private ResumeFileExtractor resumeFileExtractor;

    private ResumeAnalysisService resumeAnalysisService;
    private User user;

    @BeforeEach
    void setUp() {
        resumeAnalysisService = new ResumeAnalysisService(geminiClient, geminiRateLimiter, resumeFileExtractor);
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
    void scoreStrengthReturnsGeminiScoreAndRecommendations() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.scoreResumeStrength("resume text"))
                .thenReturn(new GeminiStrengthResult(80, List.of("Add metrics")));

        ResumeStrengthResponse response = resumeAnalysisService.scoreStrength(user, "resume text");

        assertThat(response.score()).isEqualTo(80);
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
}
