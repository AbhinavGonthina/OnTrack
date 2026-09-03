package com.ontrack.backend.dto;

import java.util.List;

public record StatsResponse(
        int totalApplications,
        double responseRate,
        double oaRate,
        double interviewRate,
        double offerRate,
        Double avgDaysToFirstResponse,
        List<SankeyLink> sankeyLinks
) {
}
