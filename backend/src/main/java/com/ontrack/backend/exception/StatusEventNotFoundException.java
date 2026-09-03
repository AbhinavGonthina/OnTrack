package com.ontrack.backend.exception;

import java.util.UUID;

public class StatusEventNotFoundException extends RuntimeException {
    public StatusEventNotFoundException(UUID id) {
        super("No status event found with id " + id);
    }
}
