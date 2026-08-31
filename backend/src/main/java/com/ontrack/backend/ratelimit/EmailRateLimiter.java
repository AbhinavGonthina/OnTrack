package com.ontrack.backend.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limits password-reset and resend-verification requests per email address. Keyed by email
 * (not user/IP) since these endpoints are unauthenticated and must stop someone from spamming
 * a victim's inbox from many source IPs.
 */
@Component
public class EmailRateLimiter {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final int requestsPerHour;

    public EmailRateLimiter(@Value("${app.ratelimit.email-requests-per-hour:5}") int requestsPerHour) {
        this.requestsPerHour = requestsPerHour;
    }

    public boolean tryConsume(String email) {
        String key = email.toLowerCase();
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket());
        return bucket.tryConsume(1);
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.classic(requestsPerHour, Refill.greedy(requestsPerHour, Duration.ofHours(1)));
        return Bucket.builder().addLimit(limit).build();
    }
}
