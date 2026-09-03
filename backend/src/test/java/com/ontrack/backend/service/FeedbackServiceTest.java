package com.ontrack.backend.service;

import com.ontrack.backend.dto.FeedbackRequest;
import com.ontrack.backend.dto.MessageResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.EmailRateLimitExceededException;
import com.ontrack.backend.ratelimit.EmailRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    @Mock
    private EmailService emailService;

    @Mock
    private EmailRateLimiter emailRateLimiter;

    private FeedbackService feedbackService;

    @BeforeEach
    void setUp() {
        feedbackService = new FeedbackService(emailService, emailRateLimiter);
    }

    @Test
    void submitSendsFeedbackEmailWithReporterEmailMessageAndPage() {
        User user = User.builder().email("person@example.com").build();
        when(emailRateLimiter.tryConsume("person@example.com")).thenReturn(true);
        FeedbackRequest request = new FeedbackRequest("Something's broken", "/dashboard");

        MessageResponse response = feedbackService.submit(user, request);

        assertThat(response.message()).isNotBlank();
        verify(emailService).sendFeedbackEmail("person@example.com", "Something's broken", "/dashboard");
    }

    @Test
    void submitThrowsWhenRateLimited() {
        User user = User.builder().email("person@example.com").build();
        when(emailRateLimiter.tryConsume("person@example.com")).thenReturn(false);
        FeedbackRequest request = new FeedbackRequest("Something's broken", "/dashboard");

        assertThatThrownBy(() -> feedbackService.submit(user, request))
                .isInstanceOf(EmailRateLimitExceededException.class);
    }
}
