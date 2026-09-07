package com.ontrack.backend.ratelimit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Limits real Gemini API calls per user account (not per IP) per day. Deliberately separate
 * from the general {@link RateLimitFilter} and only consulted on an actual cache miss in
 * FitAnalysisService - cached fit-analysis responses cost nothing and shouldn't count against
 * this budget.
 *
 * <p>Backed by the {@code gemini_usage} table rather than in-memory Bucket4j buckets, so the
 * cap survives a restart - see V6__add_gemini_usage.sql for why that matters on Render's free
 * tier. This also makes the quota a true calendar-day allowance that resets at midnight, which
 * is what the UI's "N AI calls left today" has always claimed; Bucket4j's greedy refill was
 * really a sliding window that dripped roughly one call back every {@code 24h / limit}.
 */
@Component
public class GeminiRateLimiter {

    /**
     * One statement, no read-then-write and no explicit locking: the WHERE clause on the
     * conflict branch is what enforces the cap, so two concurrent requests can't both observe
     * "under the limit" and both increment past it. Postgres reports 1 row affected when the
     * call is allowed (fresh insert, or an increment the WHERE permitted) and 0 when the user
     * is already at the cap.
     */
    private static final String CONSUME_SQL = """
            INSERT INTO gemini_usage (user_id, usage_date, call_count)
            VALUES (:userId, :usageDate, 1)
            ON CONFLICT (user_id, usage_date)
            DO UPDATE SET call_count = gemini_usage.call_count + 1
            WHERE gemini_usage.call_count < :limit
            """;

    private static final String USED_TODAY_SQL =
            "SELECT call_count FROM gemini_usage WHERE user_id = :userId AND usage_date = :usageDate";

    private final NamedParameterJdbcTemplate jdbc;
    private final int requestsPerDay;
    private final Clock clock;

    @Autowired
    public GeminiRateLimiter(
            NamedParameterJdbcTemplate jdbc,
            @Value("${app.ratelimit.gemini-requests-per-day:20}") int requestsPerDay) {
        this(jdbc, requestsPerDay, Clock.systemUTC());
    }

    GeminiRateLimiter(NamedParameterJdbcTemplate jdbc, int requestsPerDay, Clock clock) {
        this.jdbc = jdbc;
        this.requestsPerDay = requestsPerDay;
        this.clock = clock;
    }

    /**
     * REQUIRES_NEW because {@code FitAnalysisService.getOrCreate} is itself {@code @Transactional}:
     * without its own transaction, this increment would roll back with the caller whenever the
     * Gemini call failed. Transient Gemini 503s are common, so that would hand the budget back on
     * every failure and let a failing request be retried indefinitely for free. A consumed call
     * stays consumed whether or not the request that spent it ultimately succeeded.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryConsume(UUID userId) {
        // Guard: with a limit of 0 the SQL's fresh-insert branch has no conflict row to test
        // against, so it would still let a single call through.
        if (requestsPerDay <= 0) {
            return false;
        }
        return jdbc.update(CONSUME_SQL, params(userId).addValue("limit", requestsPerDay)) == 1;
    }

    /** Peeks the user's remaining budget without consuming from it - for showing a
     * "requests left today" indicator in the UI. */
    public long remaining(UUID userId) {
        return Math.max(0, requestsPerDay - usedToday(userId));
    }

    public int getLimit() {
        return requestsPerDay;
    }

    private int usedToday(UUID userId) {
        // queryForList rather than queryForObject: a user who hasn't called Gemini today simply
        // has no row yet, which is the common case and not an error.
        List<Integer> counts = jdbc.queryForList(USED_TODAY_SQL, params(userId), Integer.class);
        return counts.isEmpty() ? 0 : counts.get(0);
    }

    private MapSqlParameterSource params(UUID userId) {
        return new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("usageDate", LocalDate.now(clock));
    }
}
