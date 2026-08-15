package com.ontrack.backend.dto;

import java.util.List;

public record StatsResponse(
        int totalApplications,
        double responseRate,
        double oaRate,
        double onsiteRate,
        double offerRate,
        Double avgDaysToFirstResponse,
        List<SankeyLink> sankeyLinks
) {
}
