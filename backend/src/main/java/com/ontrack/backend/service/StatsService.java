package com.ontrack.backend.service;

import com.ontrack.backend.dto.SankeyLink;
import com.ontrack.backend.dto.StatsResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Computed via raw SQL (NamedParameterJdbcTemplate) rather than JPQL - the
 * Sankey link computation needs a LAG() window function to compare each
 * StatusEvent to the previous one per application, which JPQL doesn't
 * support. This is the analytics centerpiece of the app: everything here is
 * derived server-side from the append-only StatusEvent history.
 */
@Service
public class StatsService {

    private final NamedParameterJdbcTemplate jdbc;

    public StatsService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public StatsResponse computeStats(UUID userId) {
        MapSqlParameterSource params = new MapSqlParameterSource("userId", userId);

        int total = countTotalApplications(params);
        if (total == 0) {
            return new StatsResponse(0, 0.0, 0.0, 0.0, 0.0, null, List.of());
        }

        FunnelCounts funnel = computeFunnelCounts(params);
        Double avgDays = computeAvgDaysToFirstResponse(params);
        List<SankeyLink> links = computeSankeyLinks(params);

        return new StatsResponse(
                total,
                percentage(funnel.responded(), total),
                percentage(funnel.reachedOa(), total),
                percentage(funnel.reachedOnsite(), total),
                percentage(funnel.reachedOffer(), total),
                avgDays,
                links
        );
    }

    private int countTotalApplications(MapSqlParameterSource params) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM applications WHERE user_id = :userId",
                params, Integer.class);
        return count == null ? 0 : count;
    }

    private record FunnelCounts(int responded, int reachedOa, int reachedOnsite, int reachedOffer) {
    }

    /**
     * "Responded" = at least one event other than the initial APPLIED - i.e.
     * something happened (progressed OR got rejected), as opposed to sitting
     * untouched. Each subsequent tier checks for progress to that stage or
     * later, regardless of eventual outcome.
     */
    private FunnelCounts computeFunnelCounts(MapSqlParameterSource params) {
        String sql = """
                SELECT
                    COUNT(*) FILTER (WHERE has_response) AS responded,
                    COUNT(*) FILTER (WHERE reached_oa) AS reached_oa,
                    COUNT(*) FILTER (WHERE reached_onsite) AS reached_onsite,
                    COUNT(*) FILTER (WHERE reached_offer) AS reached_offer
                FROM (
                    SELECT
                        a.id,
                        EXISTS (SELECT 1 FROM status_events se WHERE se.application_id = a.id AND se.status <> 'APPLIED') AS has_response,
                        EXISTS (SELECT 1 FROM status_events se WHERE se.application_id = a.id AND se.status IN ('OA','PHONE_SCREEN','ONSITE_FINAL','OFFER')) AS reached_oa,
                        EXISTS (SELECT 1 FROM status_events se WHERE se.application_id = a.id AND se.status IN ('ONSITE_FINAL','OFFER')) AS reached_onsite,
                        EXISTS (SELECT 1 FROM status_events se WHERE se.application_id = a.id AND se.status = 'OFFER') AS reached_offer
                    FROM applications a
                    WHERE a.user_id = :userId
                ) sub
                """;
        FunnelCounts result = jdbc.queryForObject(sql, params, (rs, rowNum) -> new FunnelCounts(
                rs.getInt("responded"),
                rs.getInt("reached_oa"),
                rs.getInt("reached_onsite"),
                rs.getInt("reached_offer")
        ));
        return result == null ? new FunnelCounts(0, 0, 0, 0) : result;
    }

    private Double computeAvgDaysToFirstResponse(MapSqlParameterSource params) {
        String sql = """
                SELECT AVG(first_response_date - applied_date) AS avg_days
                FROM (
                    SELECT
                        a.id,
                        MIN(se.event_date) FILTER (WHERE se.status = 'APPLIED') AS applied_date,
                        MIN(se.event_date) FILTER (WHERE se.status <> 'APPLIED') AS first_response_date
                    FROM applications a
                    JOIN status_events se ON se.application_id = a.id
                    WHERE a.user_id = :userId
                    GROUP BY a.id
                ) sub
                WHERE first_response_date IS NOT NULL
                """;
        return jdbc.queryForObject(sql, params, Double.class);
    }

    /**
     * One link per observed transition between consecutive StatusEvents for
     * the same application (via LAG()), so this naturally captures both
     * forward progress (e.g. OA -> PHONE_SCREEN) and rejections
     * (e.g. OA -> REJECTED_OA) in one uniform pass, without needing to treat
     * rejected_from_stage as a special case.
     */
    private List<SankeyLink> computeSankeyLinks(MapSqlParameterSource params) {
        String sql = """
                WITH ordered AS (
                    SELECT
                        se.status,
                        LAG(se.status) OVER (PARTITION BY se.application_id ORDER BY se.event_date, se.created_at) AS prev_status
                    FROM status_events se
                    JOIN applications a ON a.id = se.application_id
                    WHERE a.user_id = :userId
                )
                SELECT
                    prev_status AS source,
                    CASE WHEN status = 'REJECTED' THEN 'REJECTED_' || prev_status ELSE status END AS target,
                    COUNT(*) AS value
                FROM ordered
                WHERE prev_status IS NOT NULL
                GROUP BY prev_status, status
                ORDER BY prev_status, status
                """;
        return jdbc.query(sql, params, (rs, rowNum) -> new SankeyLink(
                rs.getString("source"),
                rs.getString("target"),
                rs.getLong("value")
        ));
    }

    private double percentage(int count, int total) {
        return Math.round((count * 1000.0) / total) / 10.0;
    }
}
