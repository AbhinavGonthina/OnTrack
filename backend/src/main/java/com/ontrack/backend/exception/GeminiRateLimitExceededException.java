package com.ontrack.backend.exception;

public class GeminiRateLimitExceededException extends RuntimeException {
    public GeminiRateLimitExceededException() {
        super("Daily AI fit-analysis limit reached. Please try again tomorrow.");
    }
}
