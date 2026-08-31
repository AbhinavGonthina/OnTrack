package com.ontrack.backend.exception;

public class EmailRateLimitExceededException extends RuntimeException {
    public EmailRateLimitExceededException() {
        super("Too many requests for this email address. Please try again later.");
    }
}
