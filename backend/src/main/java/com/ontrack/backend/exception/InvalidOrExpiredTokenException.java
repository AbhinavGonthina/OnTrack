package com.ontrack.backend.exception;

public class InvalidOrExpiredTokenException extends RuntimeException {
    public InvalidOrExpiredTokenException() {
        super("This link is invalid or has expired");
    }
}
