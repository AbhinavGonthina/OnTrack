package com.ontrack.backend.service;

import com.ontrack.backend.entity.AuthToken;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.TokenType;
import com.ontrack.backend.exception.InvalidOrExpiredTokenException;
import com.ontrack.backend.repository.AuthTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class TokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AuthTokenRepository authTokenRepository;
    private final long emailVerificationExpiryHours;
    private final long passwordResetExpiryMinutes;

    public TokenService(
            AuthTokenRepository authTokenRepository,
            @Value("${app.auth.email-verification-expiry-hours}") long emailVerificationExpiryHours,
            @Value("${app.auth.password-reset-expiry-minutes}") long passwordResetExpiryMinutes) {
        this.authTokenRepository = authTokenRepository;
        this.emailVerificationExpiryHours = emailVerificationExpiryHours;
        this.passwordResetExpiryMinutes = passwordResetExpiryMinutes;
    }

    /**
     * Invalidates the user's prior un-consumed tokens of this type, then issues and returns a new
     * raw token.
     *
     * <p>Only ever leaving one live link per type is a security property, not just tidiness. Two
     * people can have a signup outstanding on the same unverified address, and their verification
     * emails are indistinguishable in the recipient's inbox. If both links stayed live, the
     * recipient would be picking between them blind, and picking the stranger's would activate
     * the account with the stranger's password. Killing the earlier link means the most recent
     * attempt, which is the one the real mailbox owner just made, is the only one that can work.
     */
    @Transactional
    public String issue(User user, TokenType type) {
        authTokenRepository.deleteByUserIdAndTokenType(user.getId(), type);

        String rawToken = generateRawToken();
        AuthToken token = AuthToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .tokenType(type)
                .expiresAt(expiryFor(type))
                .build();
        authTokenRepository.save(token);
        return rawToken;
    }

    /** Consumes a raw token if it's valid (exists, unconsumed, unexpired) and returns its owner. */
    @Transactional
    public User consume(String rawToken, TokenType type) {
        String tokenHash = hash(rawToken);
        int updated = authTokenRepository.consumeIfValid(tokenHash, type, Instant.now());
        if (updated != 1) {
            throw new InvalidOrExpiredTokenException();
        }
        return authTokenRepository.findByTokenHashAndTokenType(tokenHash, type)
                .orElseThrow(InvalidOrExpiredTokenException::new)
                .getUser();
    }

    private Instant expiryFor(TokenType type) {
        return switch (type) {
            case EMAIL_VERIFICATION -> Instant.now().plusSeconds(emailVerificationExpiryHours * 3600);
            case PASSWORD_RESET -> Instant.now().plusSeconds(passwordResetExpiryMinutes * 60);
        };
    }

    private static String generateRawToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
