package com.ontrack.backend.exception;

public class DemoReadOnlyException extends RuntimeException {
    public DemoReadOnlyException() {
        super("Demo data is read-only. Sign up for a free account to save your own applications.");
    }
}
