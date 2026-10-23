package com.ontrack.backend.dto;

/**
 * Answer to "have I already logged this posting?".
 *
 * <p>A miss is a 200 with a null match rather than a 404. The browser extension asks this on
 * every popup open, and a 404 on the normal path would fill the user's devtools console and
 * the server logs with noise that looks like a fault but is not one.
 */
public record ApplicationLookupResponse(ApplicationResponse match) {
}
