package com.ontrack.backend.controller;

import com.ontrack.backend.dto.StatsResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.service.StatsService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/api/stats")
    public StatsResponse stats(@AuthenticationPrincipal User user) {
        return statsService.computeStats(user.getId());
    }
}
