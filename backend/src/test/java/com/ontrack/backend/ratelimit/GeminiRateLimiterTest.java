package com.ontrack.backend.ratelimit;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class GeminiRateLimiterTest {

    @Test
    void allowsUpToTheDailyLimitThenRejects() {
        GeminiRateLimiter limiter = new GeminiRateLimiter(2);
        UUID userId = UUID.randomUUID();

        assertThat(limiter.tryConsume(userId)).isTrue();
        assertThat(limiter.tryConsume(userId)).isTrue();
        assertThat(limiter.tryConsume(userId)).isFalse();
    }

    @Test
    void tracksDifferentUsersSeparately() {
        GeminiRateLimiter limiter = new GeminiRateLimiter(1);
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();

        assertThat(limiter.tryConsume(userA)).isTrue();
        assertThat(limiter.tryConsume(userB)).isTrue();
        assertThat(limiter.tryConsume(userA)).isFalse();
    }

    @Test
    void remainingReflectsConsumedRequestsWithoutConsuming() {
        GeminiRateLimiter limiter = new GeminiRateLimiter(3);
        UUID userId = UUID.randomUUID();

        assertThat(limiter.remaining(userId)).isEqualTo(3);
        limiter.tryConsume(userId);
        assertThat(limiter.remaining(userId)).isEqualTo(2);
        assertThat(limiter.remaining(userId)).isEqualTo(2);
    }

    @Test
    void getLimitReturnsTheConfiguredDailyLimit() {
        GeminiRateLimiter limiter = new GeminiRateLimiter(7);

        assertThat(limiter.getLimit()).isEqualTo(7);
    }
}
