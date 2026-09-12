package com.ontrack.backend.ratelimit;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Mirrors GeminiRateLimiterTest: the cap itself is enforced by a single Postgres upsert (see
 * EmailRateLimiter.CONSUME_SQL), so these cover the Java-side contract around it, namely the
 * rows-affected interpretation, the parameters that statement is handed, the zero-limit guard,
 * and email normalization. The SQL's concurrency behaviour is Postgres's to guarantee, and there
 * is no faithful H2 equivalent of ON CONFLICT ... DO UPDATE ... WHERE to test it against here.
 */
class EmailRateLimiterTest {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-09-11T18:42:17Z"), ZoneOffset.UTC);

    private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);

    private EmailRateLimiter limiter(int requestsPerHour) {
        return new EmailRateLimiter(jdbc, requestsPerHour, FIXED_CLOCK);
    }

    @Test
    void allowsTheSendWhenTheUpsertReportsARowAffected() {
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(1);

        assertThat(limiter(5).tryConsume("person@example.com")).isTrue();
    }

    @Test
    void rejectsTheSendWhenTheUpsertAffectsNoRows() {
        // 0 rows means the ON CONFLICT branch's "request_count < :limit" guard blocked the
        // increment, so this address is already at its cap for the hour.
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(0);

        assertThat(limiter(5).tryConsume("person@example.com")).isFalse();
    }

    // The receiving mailbox is the same either way, so casing must not buy a fresh allowance.
    @Test
    void normalizesTheEmailToLowercaseSoCasingCannotDodgeTheCap() {
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(1);

        limiter(5).tryConsume("Person@Example.COM");

        assertThat(capturedParams().getValue("email")).isEqualTo("person@example.com");
    }

    // Truncating to the hour is what makes this a real per-hour allowance rather than a sliding
    // window, matching how V6 made the Gemini cap a true calendar-day one.
    //
    // The type matters as much as the value: pgjdbc has no mapping for java.time.Instant and
    // fails at bind time with "Can't infer the SQL type", which shipped as a 500 on signup.
    // OffsetDateTime maps onto TIMESTAMPTZ directly.
    @Test
    void bucketsRequestsByTheTruncatedHourAsAnOffsetDateTime() {
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(1);

        limiter(5).tryConsume("person@example.com");

        Object windowStart = capturedParams().getValue("windowStart");
        assertThat(windowStart)
                .isInstanceOf(OffsetDateTime.class)
                .isEqualTo(OffsetDateTime.parse("2026-09-11T18:00:00Z"));
    }

    @Test
    void passesTheConfiguredLimitToTheStatement() {
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(1);

        limiter(3).tryConsume("person@example.com");

        assertThat(capturedParams().getValue("limit")).isEqualTo(3);
    }

    // Without the guard the fresh-insert branch has no conflict row to test against, so a limit
    // of 0 would still let exactly one send through.
    @Test
    void aZeroLimitBlocksEverythingAndNeverTouchesTheDatabase() {
        assertThat(limiter(0).tryConsume("person@example.com")).isFalse();

        verify(jdbc, org.mockito.Mockito.never()).update(anyString(), any(MapSqlParameterSource.class));
    }

    private MapSqlParameterSource capturedParams() {
        ArgumentCaptor<MapSqlParameterSource> captor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).update(anyString(), captor.capture());
        return captor.getValue();
    }
}
