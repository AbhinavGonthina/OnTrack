package com.ontrack.backend.controller;

import com.ontrack.backend.dto.ApplicationDetailResponse;
import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.dto.FitAnalysisResponse;
import com.ontrack.backend.dto.StatsResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.DemoReadOnlyException;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.service.ApplicationService;
import com.ontrack.backend.service.FitAnalysisService;
import com.ontrack.backend.service.StatsService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Public, unauthenticated, read-only access to a fixed seeded demo account
 * (see V2__seed_demo_data.sql). GET endpoints delegate straight to the same
 * services authenticated users go through - demo mode is just a fixed user,
 * not a separate code path. Write attempts return a friendly 403 instead of
 * silently doing nothing, per the read-only-demo decision in SPEC.md.
 */
@RestController
@RequestMapping("/api/demo")
public class DemoController {

    private static final String DEMO_USER_EMAIL = "demo@ontrack.app";

    private final UserRepository userRepository;
    private final ApplicationService applicationService;
    private final FitAnalysisService fitAnalysisService;
    private final StatsService statsService;

    public DemoController(
            UserRepository userRepository,
            ApplicationService applicationService,
            FitAnalysisService fitAnalysisService,
            StatsService statsService) {
        this.userRepository = userRepository;
        this.applicationService = applicationService;
        this.fitAnalysisService = fitAnalysisService;
        this.statsService = statsService;
    }

    @GetMapping("/applications")
    public List<ApplicationResponse> listApplications() {
        return applicationService.listForUser(demoUser().getId());
    }

    @GetMapping("/applications/{id}")
    public ApplicationDetailResponse applicationDetail(@PathVariable UUID id) {
        return applicationService.getDetail(demoUser().getId(), id);
    }

    @GetMapping("/applications/{id}/fit-analysis")
    public FitAnalysisResponse fitAnalysis(@PathVariable UUID id) {
        // Always a cache hit against the seeded FitAnalysis rows - never calls Gemini.
        return fitAnalysisService.getOrCreate(demoUser(), id);
    }

    @GetMapping("/stats")
    public StatsResponse stats() {
        return statsService.computeStats(demoUser().getId());
    }

    @PostMapping("/applications")
    public void create() {
        throw new DemoReadOnlyException();
    }

    @PutMapping("/applications/{id}")
    public void update(@PathVariable UUID id) {
        throw new DemoReadOnlyException();
    }

    @DeleteMapping("/applications/{id}")
    public void delete(@PathVariable UUID id) {
        throw new DemoReadOnlyException();
    }

    @PostMapping("/applications/{id}/status")
    public void addStatusEvent(@PathVariable UUID id) {
        throw new DemoReadOnlyException();
    }

    @PostMapping("/applications/{id}/notes")
    public void addNote(@PathVariable UUID id) {
        throw new DemoReadOnlyException();
    }

    @DeleteMapping("/notes/{id}")
    public void deleteNote(@PathVariable UUID id) {
        throw new DemoReadOnlyException();
    }

    private User demoUser() {
        return userRepository.findByEmail(DEMO_USER_EMAIL)
                .orElseThrow(() -> new IllegalStateException(
                        "Demo user not seeded. Check that V2__seed_demo_data.sql ran."));
    }
}
