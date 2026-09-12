package com.ontrack.backend.controller;

import com.ontrack.backend.dto.FitAnalysisResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.service.FitAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class FitAnalysisController {

    private final FitAnalysisService fitAnalysisService;

    public FitAnalysisController(FitAnalysisService fitAnalysisService) {
        this.fitAnalysisService = fitAnalysisService;
    }

    /**
     * Read-only: returns the stored analysis for this application's current resume and job
     * description, or 204 when there isn't one. Safe to call on page load because it can never
     * reach Gemini or spend budget.
     */
    @GetMapping("/api/applications/{id}/fit-analysis")
    public ResponseEntity<FitAnalysisResponse> cached(
            @AuthenticationPrincipal User user, @PathVariable("id") UUID applicationId) {
        return fitAnalysisService.findCached(user, applicationId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /**
     * @param force set by an explicit "Re-analyze" to recompute even when the cache matches.
     *              Defaults to false, so an accidental double-click costs nothing.
     */
    @PostMapping("/api/applications/{id}/fit-analysis")
    public FitAnalysisResponse analyze(
            @AuthenticationPrincipal User user,
            @PathVariable("id") UUID applicationId,
            @RequestParam(name = "force", defaultValue = "false") boolean force) {
        return fitAnalysisService.getOrCreate(user, applicationId, force);
    }
}
