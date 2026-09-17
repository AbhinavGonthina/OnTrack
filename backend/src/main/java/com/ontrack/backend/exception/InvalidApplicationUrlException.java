package com.ontrack.backend.exception;

/**
 * Thrown when an application link cannot be stored as given.
 *
 * <p>Separate from generic validation because the reason is worth stating: the value is rendered
 * as a clickable anchor, so only http and https are accepted. Anything else would let a saved
 * link execute script when its own author clicked it.
 */
public class InvalidApplicationUrlException extends RuntimeException {

    public InvalidApplicationUrlException() {
        super("Enter a valid http or https link to the job posting");
    }
}
