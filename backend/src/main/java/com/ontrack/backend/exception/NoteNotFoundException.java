package com.ontrack.backend.exception;

import java.util.UUID;

public class NoteNotFoundException extends RuntimeException {
    public NoteNotFoundException(UUID id) {
        super("No note found with id " + id);
    }
}
