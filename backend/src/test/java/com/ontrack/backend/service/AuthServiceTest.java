package com.ontrack.backend.service;

import com.ontrack.backend.dto.AuthResponse;
import com.ontrack.backend.dto.LoginRequest;
import com.ontrack.backend.dto.MessageResponse;
import com.ontrack.backend.dto.SignupRequest;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.TokenType;
import com.ontrack.backend.exception.EmailAlreadyExistsException;
import com.ontrack.backend.exception.EmailAlreadyVerifiedException;
import com.ontrack.backend.exception.EmailNotVerifiedException;
import com.ontrack.backend.exception.EmailRateLimitExceededException;
import com.ontrack.backend.exception.InvalidCredentialsException;
import com.ontrack.backend.ratelimit.EmailRateLimiter;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private TokenService tokenService;

    @Mock
    private EmailService emailService;

    @Mock
    private EmailRateLimiter emailRateLimiter;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, passwordEncoder, jwtService, tokenService, emailService, emailRateLimiter);
    }

    @Test
    void signupCreatesUnverifiedUserAndSendsVerificationEmailWithoutIssuingAToken() {
        SignupRequest request = new SignupRequest("new@example.com", "password123");
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        when(tokenService.issue(any(User.class), eq(TokenType.EMAIL_VERIFICATION))).thenReturn("raw-token");

        MessageResponse response = authService.signup(request);

        assertThat(response.message()).isNotBlank();
        verify(emailService).sendVerificationEmail("new@example.com", "raw-token");
        verify(jwtService, never()).generateToken(any(UUID.class), anyString());
    }

    @Test
    void signupWithAnAlreadyVerifiedEmailThrows() {
        SignupRequest request = new SignupRequest("taken@example.com", "password123");
        User verified = User.builder()
                .id(UUID.randomUUID())
                .email("taken@example.com")
                .passwordHash("existing-hash")
                .emailVerified(true)
                .build();
        when(userRepository.findByEmail("taken@example.com")).thenReturn(Optional.of(verified));

        assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(EmailAlreadyExistsException.class);
        verify(emailService, never()).sendVerificationEmail(anyString(), anyString());
    }

    // Rejecting a repeat signup on an unverified account strands the user: they can't log in,
    // and "already exists" never points them at the resend screen.
    @Test
    void signupOnAnExistingButUnverifiedEmailResendsTheVerificationLink() {
        SignupRequest request = new SignupRequest("pending@example.com", "newpassword");
        User unverified = User.builder()
                .id(UUID.randomUUID())
                .email("pending@example.com")
                .passwordHash("old-hash")
                .emailVerified(false)
                .build();
        when(userRepository.findByEmail("pending@example.com")).thenReturn(Optional.of(unverified));
        when(emailRateLimiter.tryConsume("pending@example.com")).thenReturn(true);
        when(passwordEncoder.encode("newpassword")).thenReturn("new-hash");
        when(tokenService.issue(any(User.class), eq(TokenType.EMAIL_VERIFICATION))).thenReturn("fresh-token");

        MessageResponse response = authService.signup(request);

        assertThat(response.message()).isNotBlank();
        verify(emailService).sendVerificationEmail("pending@example.com", "fresh-token");
    }

    // The newest attempt takes over the password. Without this the user verifies and then
    // cannot log in with the password they just typed.
    @Test
    void signupOnAnUnverifiedEmailAdoptsTheNewestPassword() {
        SignupRequest request = new SignupRequest("pending@example.com", "newpassword");
        User unverified = User.builder()
                .id(UUID.randomUUID())
                .email("pending@example.com")
                .passwordHash("first-attempt-hash")
                .emailVerified(false)
                .build();
        when(userRepository.findByEmail("pending@example.com")).thenReturn(Optional.of(unverified));
        when(emailRateLimiter.tryConsume("pending@example.com")).thenReturn(true);
        when(passwordEncoder.encode("newpassword")).thenReturn("second-attempt-hash");
        when(tokenService.issue(any(User.class), eq(TokenType.EMAIL_VERIFICATION))).thenReturn("fresh-token");

        authService.signup(request);

        assertThat(unverified.getPasswordHash()).isEqualTo("second-attempt-hash");
        verify(userRepository).save(unverified);
    }

    // A straggling verification link (a password reset can verify the account out from under
    // one) must not be treated as a successful verification. It returns no session and leaves
    // the account untouched, so a link can never be a way *into* an account, only a way to
    // activate one.
    @Test
    void verifyingAnAlreadyVerifiedAccountIsRejectedAndChangesNothing() {
        User alreadyVerified = User.builder()
                .id(UUID.randomUUID())
                .email("contested@example.com")
                .passwordHash("owners-hash")
                .emailVerified(true)
                .build();
        when(tokenService.consume("straggler-link", TokenType.EMAIL_VERIFICATION)).thenReturn(alreadyVerified);

        assertThatThrownBy(() -> authService.verifyEmail("straggler-link"))
                .isInstanceOf(EmailAlreadyVerifiedException.class);

        assertThat(alreadyVerified.getPasswordHash()).isEqualTo("owners-hash");
        verify(userRepository, never()).save(any(User.class));
        verify(jwtService, never()).generateToken(any(UUID.class), anyString());
    }

    @Test
    void loginWithVerifiedEmailAndCorrectPasswordReturnsToken() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("person@example.com")
                .passwordHash("hashed-password")
                .emailVerified(true)
                .build();
        LoginRequest request = new LoginRequest("person@example.com", "password123");
        when(userRepository.findByEmail("person@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-password")).thenReturn(true);
        when(jwtService.generateToken(user.getId(), user.getEmail())).thenReturn("fake-jwt");

        AuthResponse response = authService.login(request);

        assertThat(response.token()).isEqualTo("fake-jwt");
    }

    @Test
    void loginWithUnverifiedEmailThrows() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("person@example.com")
                .passwordHash("hashed-password")
                .emailVerified(false)
                .build();
        LoginRequest request = new LoginRequest("person@example.com", "password123");
        when(userRepository.findByEmail("person@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-password")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(EmailNotVerifiedException.class);
        verify(jwtService, never()).generateToken(any(UUID.class), anyString());
    }

    @Test
    void loginWithWrongPasswordThrows() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("person@example.com")
                .passwordHash("hashed-password")
                .emailVerified(true)
                .build();
        LoginRequest request = new LoginRequest("person@example.com", "wrong-password");
        when(userRepository.findByEmail("person@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "hashed-password")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void loginWithUnknownEmailThrows() {
        LoginRequest request = new LoginRequest("nobody@example.com", "password123");
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void verifyEmailMarksUserVerified() {
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").emailVerified(false).build();
        when(tokenService.consume("raw-token", TokenType.EMAIL_VERIFICATION)).thenReturn(user);

        authService.verifyEmail("raw-token");

        assertThat(user.isEmailVerified()).isTrue();
        verify(userRepository).save(user);
    }

    @Test
    void resendVerificationReturnsSameMessageWhetherEmailExistsOrNot() {
        when(emailRateLimiter.tryConsume(anyString())).thenReturn(true);
        when(userRepository.findByEmail("exists@example.com"))
                .thenReturn(Optional.of(User.builder().email("exists@example.com").emailVerified(false).build()));
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        MessageResponse existsResponse = authService.resendVerification("exists@example.com");
        MessageResponse missingResponse = authService.resendVerification("nobody@example.com");

        assertThat(existsResponse).isEqualTo(missingResponse);
    }

    @Test
    void resendVerificationDoesNothingForAlreadyVerifiedUser() {
        when(emailRateLimiter.tryConsume(anyString())).thenReturn(true);
        when(userRepository.findByEmail("verified@example.com"))
                .thenReturn(Optional.of(User.builder().email("verified@example.com").emailVerified(true).build()));

        authService.resendVerification("verified@example.com");

        verify(tokenService, never()).issue(any(User.class), any(TokenType.class));
    }

    @Test
    void resendVerificationThrowsWhenRateLimited() {
        when(emailRateLimiter.tryConsume(anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.resendVerification("person@example.com"))
                .isInstanceOf(EmailRateLimitExceededException.class);
    }

    @Test
    void forgotPasswordReturnsSameMessageWhetherEmailExistsOrNot() {
        when(emailRateLimiter.tryConsume(anyString())).thenReturn(true);
        when(userRepository.findByEmail("exists@example.com"))
                .thenReturn(Optional.of(User.builder().email("exists@example.com").build()));
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        MessageResponse existsResponse = authService.forgotPassword("exists@example.com");
        MessageResponse missingResponse = authService.forgotPassword("nobody@example.com");

        assertThat(existsResponse).isEqualTo(missingResponse);
    }

    @Test
    void resetPasswordReEncodesAndSavesTheNewPassword() {
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
        when(tokenService.consume("raw-token", TokenType.PASSWORD_RESET)).thenReturn(user);
        when(passwordEncoder.encode("new-password123")).thenReturn("new-hashed-password");

        authService.resetPassword("raw-token", "new-password123");

        assertThat(user.getPasswordHash()).isEqualTo("new-hashed-password");
        verify(userRepository).save(user);
    }

    @Test
    void resetPasswordAlsoVerifiesAPreviouslyUnverifiedAccount() {
        // Completing the reset-password flow already proves control of the mailbox (the reset
        // link was emailed there) - a user who never finished verifying shouldn't reset their
        // password successfully and then still be blocked at login for being unverified.
        User user = User.builder().id(UUID.randomUUID()).email("person@example.com").emailVerified(false).build();
        when(tokenService.consume("raw-token", TokenType.PASSWORD_RESET)).thenReturn(user);
        when(passwordEncoder.encode("new-password123")).thenReturn("new-hashed-password");

        authService.resetPassword("raw-token", "new-password123");

        assertThat(user.isEmailVerified()).isTrue();
    }
}
