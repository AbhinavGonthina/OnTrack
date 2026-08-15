package com.ontrack.backend.service;

import com.ontrack.backend.dto.StatsResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock
    private NamedParameterJdbcTemplate jdbc;

    @Test
    void returnsZeroedStatsWithoutRunningFurtherQueriesWhenUserHasNoApplications() {
        StatsService statsService = new StatsService(jdbc);
        when(jdbc.queryForObject(anyString(), any(SqlParameterSource.class), eq(Integer.class)))
                .thenReturn(0);

        StatsResponse response = statsService.computeStats(UUID.randomUUID());

        assertThat(response.totalApplications()).isEqualTo(0);
        assertThat(response.responseRate()).isEqualTo(0.0);
        assertThat(response.oaRate()).isEqualTo(0.0);
        assertThat(response.onsiteRate()).isEqualTo(0.0);
        assertThat(response.offerRate()).isEqualTo(0.0);
        assertThat(response.avgDaysToFirstResponse()).isNull();
        assertThat(response.sankeyLinks()).isEmpty();

        // Only the total-count query should have run - no wasted funnel/sankey queries.
        verify(jdbc, never()).query(anyString(), any(SqlParameterSource.class), any(org.springframework.jdbc.core.RowMapper.class));
    }
}
