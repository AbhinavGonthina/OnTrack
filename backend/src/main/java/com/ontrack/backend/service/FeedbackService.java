package com.ontrack.backend.service;

import com.ontrack.backend.dto.FeedbackRequest;
import com.ontrack.backend.dto.MessageResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.EmailRateLimitExceededException;
import com.ontrack.backend.ratelimit.EmailRateLimiter;
import org.springframework.stereotype.Service;

@Service
public class FeedbackService {

    private final EmailService emailService;
    private final EmailRateLimiter emailRateLimiter;

    public FeedbackService(EmailService emailService, EmailRateLimiter emailRateLimiter) {
        this.emailService = emailService;
        this.emailRateLimiter = emailRateLimiter;
    }

    public MessageResponse submit(User user, FeedbackRequest request) {
        if (!emailRateLimiter.tryConsume(user.getEmail())) {
            throw new EmailRateLimitExceededException();
        }
        emailService.sendFeedbackEmail(user.getEmail(), request.message(), request.pageUrl());
        return new MessageResponse("Thanks for the feedback!");
    }
}
