package com.ontrack.backend.ratelimit;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The cap itself is enforced by a single Postgres upsert (see GeminiRateLimiter.CONSUME_SQL),
 * so these tests cover the Java-side contract around it - the rows-affected interpretation, the
 * date/limit parameters that statement is given, the zero-limit guard, and the remaining()
 * arithmetic. The SQL's own concurrency behaviour is Postgres's to guarantee and was verified
 * live against the real Neon database, since the project has no Postgres test container and
 * ON CONFLICT ... DO UPDATE ... WHERE has no faithful H2 equivalent.
 */
class GeminiRateLimiterTest {

    private static final Clock FIXED_CLOCK =
            Clock.fixed(Instant.parse("2026-09-07T18:30:00Z"), ZoneOffset.UTC);

    private final NamedParameterJdbcTemplate jdbc = mock(NamedParameterJdbcTemplate.class);

    private GeminiRateLimiter limiter(int requestsPerDay) {
        return new GeminiRateLimiter(jdbc, requestsPerDay, FIXED_CLOCK);
    }

    @Test
    void allowsTheCallWhenTheUpsertReportsARowAffected() {
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(1);

        assertThat(limiter(20).tryConsume(UUID.randomUUID())).isTrue();
    }

    @Test
    void rejectsTheCallWhenTheUpsertAffectsNoRows() {
        // 0 rows means the ON CONFLICT branch's "call_count < :limit" guard blocked the
        // increment - the user is already at their cap for the day.
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(0);

        assertThat(limiter(20).tryConsume(UUID.randomUUID())).isFalse();
    }

    @Test
    void consumesAgainstTheCurrentDateAndTheConfiguredLimit() {
        when(jdbc.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(1);
        UUID userId = UUID.randomUUID();

        limiter(20).tryConsume(userId);

        ArgumentCaptor<MapSqlParameterSource> params = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbc).update(anyString(), params.capture());
        assertThat(params.getValue().getValue("userId")).isEqualTo(userId);
        assertThat(params.getValue().getValue("usageDate")).isEqualTo(LocalDate.of(2026, 9, 7));
        assertThat(params.getValue().getValue("limit")).isEqualTo(20);
    }

    @Test
    void aZeroLimitRejectsWithoutTouchingTheDatabase() {
        // The upsert's fresh-insert branch has no conflicting row to test "call_count < 0"
        // against, so without this guard a limit of 0 would still let one call through.
        assertThat(limiter(0).tryConsume(UUID.randomUUID())).isFalse();

        verify(jdbc, org.mockito.Mockito.never()).update(anyString(), any(MapSqlParameterSource.class));
    }

    @Test
    void remainingSubtractsTodaysStoredCountFromTheLimit() {
        when(jdbc.queryForList(anyString(), any(MapSqlParameterSource.class), eq(Integer.class)))
                .thenReturn(List.of(3));

        assertThat(limiter(20).remaining(UUID.randomUUID())).isEqualTo(17);
    }

    @Test
    void remainingIsTheFullLimitWhenTheUserHasNoRowForToday() {
        when(jdbc.queryForList(anyString(), any(MapSqlParameterSource.class), eq(Integer.class)))
                .thenReturn(List.of());

        assertThat(limiter(20).remaining(UUID.randomUUID())).isEqualTo(20);
    }

    @Test
    void remainingNeverGoesNegativeIfTheLimitWasLoweredAfterUse() {
        // A deploy that lowers the configured cap can leave a stored count above it; the UI
        // should show "0 left", not a negative number.
        when(jdbc.queryForList(anyString(), any(MapSqlParameterSource.class), eq(Integer.class)))
                .thenReturn(List.of(25));

        assertThat(limiter(20).remaining(UUID.randomUUID())).isZero();
    }

    @Test
    void getLimitReturnsTheConfiguredDailyLimit() {
        assertThat(limiter(7).getLimit()).isEqualTo(7);
    }
}
