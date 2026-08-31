package com.ontrack.backend.repository;

import com.ontrack.backend.entity.AuthToken;
import com.ontrack.backend.enums.TokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface AuthTokenRepository extends JpaRepository<AuthToken, UUID> {

    Optional<AuthToken> findByTokenHashAndTokenType(String tokenHash, TokenType tokenType);

    void deleteByUserIdAndTokenType(UUID userId, TokenType tokenType);

    /**
     * Atomically marks a token consumed only if it's still unconsumed and unexpired, so two
     * concurrent requests with the same raw token can't both succeed - the DB's row-level
     * locking on this UPDATE serializes them, and only one affects a row.
     */
    @Modifying
    @Query("""
            UPDATE AuthToken t SET t.consumedAt = :now
            WHERE t.tokenHash = :tokenHash AND t.tokenType = :tokenType
            AND t.consumedAt IS NULL AND t.expiresAt > :now
            """)
    int consumeIfValid(
            @Param("tokenHash") String tokenHash,
            @Param("tokenType") TokenType tokenType,
            @Param("now") Instant now);
}
