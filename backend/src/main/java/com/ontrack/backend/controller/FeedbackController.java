package com.ontrack.backend.controller;

import com.ontrack.backend.dto.FeedbackRequest;
import com.ontrack.backend.dto.MessageResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping("/api/feedback")
    public MessageResponse submit(@AuthenticationPrincipal User user, @Valid @RequestBody FeedbackRequest request) {
        return feedbackService.submit(user, request);
    }
}
