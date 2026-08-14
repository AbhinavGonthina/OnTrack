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
}
