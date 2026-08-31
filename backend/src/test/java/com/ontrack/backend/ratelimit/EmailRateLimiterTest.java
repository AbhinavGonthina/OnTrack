package com.ontrack.backend.ratelimit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailRateLimiterTest {

    @Test
    void allowsUpToTheHourlyLimitThenRejects() {
        EmailRateLimiter limiter = new EmailRateLimiter(2);

        assertThat(limiter.tryConsume("person@example.com")).isTrue();
        assertThat(limiter.tryConsume("person@example.com")).isTrue();
        assertThat(limiter.tryConsume("person@example.com")).isFalse();
    }

    @Test
    void tracksDifferentEmailsSeparately() {
        EmailRateLimiter limiter = new EmailRateLimiter(1);

        assertThat(limiter.tryConsume("a@example.com")).isTrue();
        assertThat(limiter.tryConsume("b@example.com")).isTrue();
        assertThat(limiter.tryConsume("a@example.com")).isFalse();
    }

    @Test
    void treatsEmailCaseInsensitively() {
        EmailRateLimiter limiter = new EmailRateLimiter(1);

        assertThat(limiter.tryConsume("Person@Example.com")).isTrue();
        assertThat(limiter.tryConsume("person@example.com")).isFalse();
    }
}
