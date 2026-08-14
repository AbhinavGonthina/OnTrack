package com.ontrack.backend.controller;

import com.ontrack.backend.dto.FitAnalysisResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.service.FitAnalysisService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class FitAnalysisController {

    private final FitAnalysisService fitAnalysisService;

    public FitAnalysisController(FitAnalysisService fitAnalysisService) {
        this.fitAnalysisService = fitAnalysisService;
    }

    @PostMapping("/api/applications/{id}/fit-analysis")
    public FitAnalysisResponse analyze(@AuthenticationPrincipal User user, @PathVariable("id") UUID applicationId) {
        return fitAnalysisService.getOrCreate(user, applicationId);
    }
}
