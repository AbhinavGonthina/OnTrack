package com.ontrack.backend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * The cache key for every AI result in the app: a SHA-256 of the exact input text.
 *
 * <p>Shared rather than duplicated because V2 seeds demo fit analyses with hashes computed in
 * Postgres via {@code pgcrypto.digest()} to match this exactly. If two copies of this logic ever
 * drifted, the demo would stop hitting its pre-seeded cache and start making live Gemini calls,
 * which is the one thing demo mode must never do.
 */
public final class InputHasher {

    private InputHasher() {
    }

    public static String sha256Hex(String input) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
