package com.ontrack.backend.service;

import com.ontrack.backend.ai.GeminiApiException;
import com.ontrack.backend.ai.GeminiClient;
import com.ontrack.backend.ai.GeminiJobExtractResult;
import com.ontrack.backend.dto.ExtractJobRequest;
import com.ontrack.backend.dto.ExtractJobResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.GeminiRateLimitExceededException;
import com.ontrack.backend.ratelimit.GeminiRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobExtractionServiceTest {

    @Mock
    private GeminiClient geminiClient;
    @Mock
    private GeminiRateLimiter geminiRateLimiter;

    private JobExtractionService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new JobExtractionService(geminiClient, geminiRateLimiter);
        user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
    }

    private ExtractJobRequest request() {
        return new ExtractJobRequest(
                "https://acme.com/careers/1", "Careers at Acme", "Some page text.");
    }

    @Test
    void returnsWhatGeminiRead() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenReturn(new GeminiJobExtractResult(
                        "Acme", "Staff Engineer", "Build things.", "high"));

        ExtractJobResponse response = service.extract(user, request());

        assertThat(response.company()).isEqualTo("Acme");
        assertThat(response.role()).isEqualTo("Staff Engineer");
        assertThat(response.jobDescriptionText()).isEqualTo("Build things.");
        assertThat(response.confidence()).isEqualTo("high");
    }

    @Test
    void consumesTheDailyBudgetBeforeCallingGemini() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenReturn(new GeminiJobExtractResult("Acme", "Engineer", "Text.", "high"));

        service.extract(user, request());

        // Order matters: consuming after the call would let a burst of concurrent
        // requests all pass the check before any of them had been counted.
        InOrder order = inOrder(geminiRateLimiter, geminiClient);
        order.verify(geminiRateLimiter).tryConsume(user.getId());
        order.verify(geminiClient).extractJobPosting(anyString(), anyString(), anyString());
    }

    @Test
    void refusesWhenTheUserHasNoCallsLeftAndNeverReachesGemini() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(false);

        assertThatThrownBy(() -> service.extract(user, request()))
                .isInstanceOf(GeminiRateLimitExceededException.class);

        verify(geminiClient, never()).extractJobPosting(any(), any(), any());
    }

    /**
     * The free-tier quota is spent the moment the request leaves, so a failure upstream
     * still costs the user a call. Refunding it would let a user retry a failing page
     * indefinitely against a shared quota.
     */
    @Test
    void aFailedGeminiCallStillCountsAgainstTheBudget() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenThrow(new GeminiApiException("upstream exploded"));

        assertThatThrownBy(() -> service.extract(user, request()))
                .isInstanceOf(GeminiApiException.class);

        verify(geminiRateLimiter).tryConsume(user.getId());
    }

    @Test
    void turnsEmptyFieldsIntoNullSoTheExtensionCanFlagThem() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenReturn(new GeminiJobExtractResult("", "   ", "", "low"));

        ExtractJobResponse response = service.extract(user, request());

        assertThat(response.company()).isNull();
        assertThat(response.role()).isNull();
        assertThat(response.jobDescriptionText()).isNull();
    }

    @Test
    void trimsSurroundingWhitespaceOnTheFieldsItKeeps() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenReturn(new GeminiJobExtractResult("  Acme  ", " Engineer ", " Text. ", "medium"));

        ExtractJobResponse response = service.extract(user, request());

        assertThat(response.company()).isEqualTo("Acme");
        assertThat(response.role()).isEqualTo("Engineer");
        assertThat(response.jobDescriptionText()).isEqualTo("Text.");
    }

    @Test
    void normalizesConfidenceCasing() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenReturn(new GeminiJobExtractResult("Acme", "Engineer", "Text.", "HIGH"));

        assertThat(service.extract(user, request()).confidence()).isEqualTo("high");
    }

    @Test
    void treatsAnOffScheduleConfidenceValueAsLow() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenReturn(new GeminiJobExtractResult("Acme", "Engineer", "Text.", "pretty sure"));

        // Going off-schema is itself a reason not to trust the answer.
        assertThat(service.extract(user, request()).confidence()).isEqualTo("low");
    }

    @Test
    void treatsAMissingConfidenceAsLow() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenReturn(new GeminiJobExtractResult("Acme", "Engineer", "Text.", null));

        assertThat(service.extract(user, request()).confidence()).isEqualTo("low");
    }

    @Test
    void passesEmptyStringsRatherThanNullsToGemini() {
        when(geminiRateLimiter.tryConsume(user.getId())).thenReturn(true);
        when(geminiClient.extractJobPosting(anyString(), anyString(), anyString()))
                .thenReturn(new GeminiJobExtractResult("Acme", "Engineer", "Text.", "high"));

        service.extract(user, new ExtractJobRequest(null, null, "Page text."));

        verify(geminiClient).extractJobPosting("", "", "Page text.");
    }
}
