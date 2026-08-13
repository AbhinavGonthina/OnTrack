package com.ontrack.backend.exception;

public class InvalidStatusEventException extends RuntimeException {
    public InvalidStatusEventException(String message) {
        super(message);
    }
}
