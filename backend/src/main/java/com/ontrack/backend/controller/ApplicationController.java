package com.ontrack.backend.controller;

import com.ontrack.backend.dto.ApplicationDetailResponse;
import com.ontrack.backend.dto.ApplicationRequest;
import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.dto.StatusEventRequest;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.service.ApplicationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    public List<ApplicationResponse> list(@AuthenticationPrincipal User user) {
        return applicationService.listForUser(user.getId());
    }

    @PostMapping
    public ResponseEntity<ApplicationResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody ApplicationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.create(user, request));
    }

    @GetMapping("/{id}")
    public ApplicationDetailResponse detail(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return applicationService.getDetail(user.getId(), id);
    }

    @PutMapping("/{id}")
    public ApplicationResponse update(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationRequest request) {
        return applicationService.update(user.getId(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        applicationService.delete(user.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/status")
    public ApplicationResponse addStatusEvent(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody StatusEventRequest request) {
        return applicationService.addStatusEvent(user.getId(), id, request);
    }
}
