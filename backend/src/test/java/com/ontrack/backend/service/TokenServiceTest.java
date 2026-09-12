package com.ontrack.backend.service;

import com.ontrack.backend.entity.AuthToken;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.TokenType;
import com.ontrack.backend.exception.InvalidOrExpiredTokenException;
import com.ontrack.backend.repository.AuthTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TokenServiceTest {

    @Mock
    private AuthTokenRepository authTokenRepository;

    private TokenService tokenService;

    @BeforeEach
    void setUp() {
        tokenService = new TokenService(authTokenRepository, 24, 30);
    }

    @Test
    void issueSavesATokenWhoseStoredFormIsAHashOfTheRawValue() {
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();

        String rawToken = tokenService.issue(user, TokenType.EMAIL_VERIFICATION);

        ArgumentCaptor<AuthToken> captor = ArgumentCaptor.forClass(AuthToken.class);
        verify(authTokenRepository).save(captor.capture());
        AuthToken saved = captor.getValue();

        assertThat(rawToken).isNotBlank();
        assertThat(saved.getTokenHash()).isNotEqualTo(rawToken);
        assertThat(saved.getTokenType()).isEqualTo(TokenType.EMAIL_VERIFICATION);
        assertThat(saved.getUser()).isEqualTo(user);
        assertThat(saved.getExpiresAt()).isAfter(Instant.now());
    }

    @Test
    void consumeReturnsTheOwningUserWhenTokenIsValid() {
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
        AuthToken token = AuthToken.builder().user(user).tokenType(TokenType.PASSWORD_RESET).build();

        when(authTokenRepository.consumeIfValid(any(), eq(TokenType.PASSWORD_RESET), any())).thenReturn(1);
        when(authTokenRepository.findByTokenHashAndTokenType(any(), eq(TokenType.PASSWORD_RESET)))
                .thenReturn(Optional.of(token));

        User result = tokenService.consume("raw-token", TokenType.PASSWORD_RESET);

        assertThat(result).isEqualTo(user);
    }

    // Only one live link per type at a time, and this one matters for security rather than
    // tidiness: two people can have a signup outstanding on the same unverified address, and
    // their verification emails look identical in the recipient's inbox. Leaving both live would
    // make the recipient choose blind, and choosing a stranger's would activate the account with
    // the stranger's password.
    @Test
    void issuingATokenInvalidatesThePriorOnesOfThatType() {
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();

        tokenService.issue(user, TokenType.EMAIL_VERIFICATION);

        verify(authTokenRepository).deleteByUserIdAndTokenType(user.getId(), TokenType.EMAIL_VERIFICATION);
    }

    @Test
    void issuingAPasswordResetTokenInvalidatesThePriorOnes() {
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();

        tokenService.issue(user, TokenType.PASSWORD_RESET);

        verify(authTokenRepository).deleteByUserIdAndTokenType(user.getId(), TokenType.PASSWORD_RESET);
    }

    @Test
    void consumeThrowsWhenTokenIsUnknownExpiredOrAlreadyConsumed() {
        when(authTokenRepository.consumeIfValid(any(), eq(TokenType.PASSWORD_RESET), any())).thenReturn(0);

        assertThatThrownBy(() -> tokenService.consume("raw-token", TokenType.PASSWORD_RESET))
                .isInstanceOf(InvalidOrExpiredTokenException.class);
    }
}
