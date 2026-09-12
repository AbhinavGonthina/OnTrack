package com.ontrack.backend.service;

import com.ontrack.backend.dto.AuthResponse;
import com.ontrack.backend.dto.LoginRequest;
import com.ontrack.backend.dto.MessageResponse;
import com.ontrack.backend.dto.SignupRequest;
import com.ontrack.backend.email.EmailDeliveryException;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private static final MessageResponse VERIFICATION_SENT_IF_ELIGIBLE =
            new MessageResponse("If that email exists and isn't verified yet, a verification link has been sent.");
    private static final MessageResponse RESET_SENT_IF_EXISTS =
            new MessageResponse("If an account with that email exists, a password reset link has been sent.");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenService tokenService;
    private final EmailService emailService;
    private final EmailRateLimiter emailRateLimiter;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            TokenService tokenService,
            EmailService emailService,
            EmailRateLimiter emailRateLimiter) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenService = tokenService;
        this.emailService = emailService;
        this.emailRateLimiter = emailRateLimiter;
    }

    @Transactional
    public MessageResponse signup(SignupRequest request) {
        User existing = userRepository.findByEmail(request.email()).orElse(null);
        if (existing != null) {
            if (existing.isEmailVerified()) {
                throw new EmailAlreadyExistsException(request.email());
            }
            return resendVerificationForUnverifiedSignup(existing, request.password());
        }
        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .emailVerified(false)
                .build();
        User savedUser = userRepository.save(user);

        String rawToken = tokenService.issue(savedUser, TokenType.EMAIL_VERIFICATION);
        // The account and token are already committed at this point - a failed send shouldn't
        // strand the user with an existing-but-unusable account they can't re-signup with.
        // "Resend verification email" is the recovery path once delivery is working again.
        trySend(() -> emailService.sendVerificationEmail(savedUser.getEmail(), rawToken));

        return new MessageResponse("Account created. Check your email to verify your address before logging in.");
    }

    /**
     * Signing up again with an address that exists but was never verified re-sends the link
     * instead of failing. Rejecting it stranded people: the account can't be logged into, and
     * "already exists" gives no hint that the recovery path is the resend-verification screen.
     *
     * <p>Rate limited per email by the same limiter the resend and forgot-password endpoints
     * use, so this can't be hit in a loop to flood someone's inbox.
     *
     * <p>The newest attempt wins outright: it takes over the password, and issuing its token
     * invalidates every earlier verification link. That ordering is deliberate. Anyone can start
     * a signup for an address they don't own, and the resulting emails are indistinguishable in
     * the real owner's inbox, so leaving both links live would make the owner choose blind and
     * let a stranger's link activate the account with a stranger's password. Because the link is
     * only ever delivered to the address itself, "most recent attempt" is the closest available
     * proxy for "the person actually reading this mailbox", and the loser is left with a dead
     * link rather than a foothold.
     */
    private MessageResponse resendVerificationForUnverifiedSignup(User user, String password) {
        if (!emailRateLimiter.tryConsume(user.getEmail())) {
            throw new EmailRateLimitExceededException();
        }
        user.setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(user);

        String rawToken = tokenService.issue(user, TokenType.EMAIL_VERIFICATION);
        trySend(() -> emailService.sendVerificationEmail(user.getEmail(), rawToken));

        return new MessageResponse("Account created. Check your email to verify your address before logging in.");
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(InvalidCredentialsException::new);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }
        if (!user.isEmailVerified()) {
            throw new EmailNotVerifiedException();
        }
        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }

    @Transactional
    public MessageResponse verifyEmail(String rawToken) {
        User user = tokenService.consume(rawToken, TokenType.EMAIL_VERIFICATION);

        // Already verified means this link is a straggler, most likely because a password reset
        // verified the account out from under it (resetPassword sets emailVerified too). Report
        // it rather than silently succeeding, and return no session either way: verifyEmail must
        // never be a way into an account, only a way to activate one.
        if (user.isEmailVerified()) {
            throw new EmailAlreadyVerifiedException();
        }

        user.setEmailVerified(true);
        userRepository.save(user);
        return new MessageResponse("Email verified. You can now log in.");
    }

    public MessageResponse resendVerification(String email) {
        if (!emailRateLimiter.tryConsume(email)) {
            throw new EmailRateLimitExceededException();
        }
        userRepository.findByEmail(email)
                .filter(user -> !user.isEmailVerified())
                .ifPresent(user -> {
                    String rawToken = tokenService.issue(user, TokenType.EMAIL_VERIFICATION);
                    trySend(() -> emailService.sendVerificationEmail(user.getEmail(), rawToken));
                });
        return VERIFICATION_SENT_IF_ELIGIBLE;
    }

    public MessageResponse forgotPassword(String email) {
        if (!emailRateLimiter.tryConsume(email)) {
            throw new EmailRateLimitExceededException();
        }
        userRepository.findByEmail(email)
                .ifPresent(user -> {
                    String rawToken = tokenService.issue(user, TokenType.PASSWORD_RESET);
                    trySend(() -> emailService.sendPasswordResetEmail(user.getEmail(), rawToken));
                });
        return RESET_SENT_IF_EXISTS;
    }

    @Transactional
    public MessageResponse resetPassword(String rawToken, String newPassword) {
        User user = tokenService.consume(rawToken, TokenType.PASSWORD_RESET);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        // Completing a password reset already proves control of the mailbox - the reset link
        // was emailed to it, same trust model as the original verification link - so an
        // unverified account no longer needs a separate verification step afterward. Without
        // this, a user who never finished verifying (e.g. the original email never arrived)
        // would reset their password successfully and then still be blocked at login with a
        // confusing "please verify your email" they have no way to act on differently.
        user.setEmailVerified(true);
        userRepository.save(user);
        return new MessageResponse("Password reset. You can now log in with your new password.");
    }

    /** Email delivery failures are logged, not surfaced - the token/account state is already saved regardless. */
    private void trySend(Runnable send) {
        try {
            send.run();
        } catch (EmailDeliveryException e) {
            log.warn("Email delivery failed: {}", e.getMessage());
        }
    }
}
