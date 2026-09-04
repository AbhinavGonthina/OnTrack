package com.ontrack.backend.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limits real Gemini API calls per user per day. Deliberately separate from
 * the general {@link RateLimitFilter} and only consulted on an actual cache
 * miss in FitAnalysisService - cached fit-analysis responses cost nothing
 * and shouldn't count against this budget.
 */
@Component
public class GeminiRateLimiter {

    private final ConcurrentHashMap<UUID, Bucket> buckets = new ConcurrentHashMap<>();
    private final int requestsPerDay;

    public GeminiRateLimiter(@Value("${app.ratelimit.gemini-requests-per-day:20}") int requestsPerDay) {
        this.requestsPerDay = requestsPerDay;
    }

    public boolean tryConsume(UUID userId) {
        Bucket bucket = buckets.computeIfAbsent(userId, id -> newBucket());
        return bucket.tryConsume(1);
    }

    /** Peeks the user's remaining budget without consuming from it - for showing a
     * "requests left today" indicator in the UI. */
    public long remaining(UUID userId) {
        Bucket bucket = buckets.computeIfAbsent(userId, id -> newBucket());
        return bucket.getAvailableTokens();
    }

    public int getLimit() {
        return requestsPerDay;
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.classic(requestsPerDay, Refill.greedy(requestsPerDay, Duration.ofDays(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
