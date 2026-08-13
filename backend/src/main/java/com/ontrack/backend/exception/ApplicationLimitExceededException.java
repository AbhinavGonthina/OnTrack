package com.ontrack.backend.exception;

public class ApplicationLimitExceededException extends RuntimeException {
    public ApplicationLimitExceededException(int limit) {
        super("You've reached the maximum of " + limit + " applications");
    }
}
