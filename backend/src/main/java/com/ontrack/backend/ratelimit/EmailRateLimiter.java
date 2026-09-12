package com.ontrack.backend.ratelimit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;

/**
 * Limits outbound account emails (signup, resend-verification, password reset) per email address.
 * Keyed by email rather than user or IP because these endpoints are unauthenticated: the thing
 * being protected is a stranger's inbox, and someone spamming it can trivially rotate source IPs.
 *
 * <p>Backed by the {@code email_rate_limit} table rather than in-memory Bucket4j buckets, so the
 * cap survives a restart. On Render's free tier the process spins down after roughly 15 minutes
 * idle, which made the in-memory version a speed bump rather than a limit: an attacker only had
 * to wait out an idle period to get a fresh allowance. Same reasoning as V6 applied to Gemini.
 */
@Component
public class EmailRateLimiter {

    /**
     * One statement, no read-then-write and no explicit locking: the WHERE clause on the conflict
     * branch enforces the cap, so two concurrent requests can't both see "under the limit" and
     * both increment past it. Postgres reports 1 row affected when the send is allowed and 0 when
     * the address is already at its hourly cap.
     */
    private static final String CONSUME_SQL = """
            INSERT INTO email_rate_limit (email, window_start, request_count)
            VALUES (:email, :windowStart, 1)
            ON CONFLICT (email, window_start)
            DO UPDATE SET request_count = email_rate_limit.request_count + 1
            WHERE email_rate_limit.request_count < :limit
            """;

    /** Windows older than this are unreachable, since the current window is always "now". */
    private static final String PRUNE_SQL =
            "DELETE FROM email_rate_limit WHERE window_start < :cutoff";

    private final NamedParameterJdbcTemplate jdbc;
    private final int requestsPerHour;
    private final Clock clock;

    @Autowired
    public EmailRateLimiter(
            NamedParameterJdbcTemplate jdbc,
            @Value("${app.ratelimit.email-requests-per-hour:5}") int requestsPerHour) {
        this(jdbc, requestsPerHour, Clock.systemUTC());
    }

    EmailRateLimiter(NamedParameterJdbcTemplate jdbc, int requestsPerHour, Clock clock) {
        this.jdbc = jdbc;
        this.requestsPerHour = requestsPerHour;
        this.clock = clock;
    }

    /**
     * REQUIRES_NEW because callers such as {@code AuthService.signup} are themselves
     * {@code @Transactional}: without its own transaction the increment would roll back with the
     * caller, so any request that failed after consuming would hand the allowance straight back
     * and could be retried for free indefinitely. A consumed send stays consumed.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryConsume(String email) {
        // Guard: with a limit of 0 the fresh-insert branch has no conflict row to test against,
        // so it would still let a single send through.
        if (requestsPerHour <= 0) {
            return false;
        }
        MapSqlParameterSource params = new MapSqlParameterSource()
                // Lowercased so Mixed@Case.com and mixed@case.com share one bucket, since the
                // receiving mailbox is the same either way.
                .addValue("email", email.toLowerCase())
                .addValue("windowStart", currentWindow())
                .addValue("limit", requestsPerHour);
        return jdbc.update(CONSUME_SQL, params) == 1;
    }

    /** Drops windows that can no longer be hit. Nothing reads them; they would just accumulate. */
    @Transactional
    public int pruneWindowsBefore(Instant cutoff) {
        return jdbc.update(PRUNE_SQL, new MapSqlParameterSource("cutoff", cutoff.atOffset(ZoneOffset.UTC)));
    }

    /**
     * Returned as an OffsetDateTime, not an Instant. The Postgres JDBC driver has no mapping for
     * {@code java.time.Instant} and fails at bind time with "Can't infer the SQL type to use for
     * an instance of java.time.Instant", which surfaces as a 500 on signup rather than anything
     * that looks like a type problem. OffsetDateTime maps straight onto TIMESTAMPTZ.
     *
     * <p>Truncating to the hour is what makes this a real per-hour allowance rather than a
     * sliding window, matching what V6 did for the Gemini cap's calendar day.
     */
    private OffsetDateTime currentWindow() {
        return Instant.now(clock).atOffset(ZoneOffset.UTC).truncatedTo(ChronoUnit.HOURS);
    }
}
