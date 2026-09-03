package com.ontrack.backend.exception;

public class InvalidResumeFileException extends RuntimeException {
    public InvalidResumeFileException(String message) {
        super(message);
    }
}
