package com.ontrack.backend.service;

import com.ontrack.backend.dto.AuthResponse;
import com.ontrack.backend.dto.LoginRequest;
import com.ontrack.backend.dto.SignupRequest;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.exception.EmailAlreadyExistsException;
import com.ontrack.backend.exception.InvalidCredentialsException;
import com.ontrack.backend.repository.UserRepository;
import com.ontrack.backend.security.JwtService;
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

    private AuthService authService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    void signupCreatesUserAndReturnsToken() {
        SignupRequest request = new SignupRequest("new@example.com", "password123");
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        when(jwtService.generateToken(any(UUID.class), anyString())).thenReturn("fake-jwt");

        AuthResponse response = authService.signup(request);

        assertThat(response.token()).isEqualTo("fake-jwt");
        assertThat(response.email()).isEqualTo("new@example.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void signupWithExistingEmailThrows() {
        SignupRequest request = new SignupRequest("taken@example.com", "password123");
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    void loginWithCorrectPasswordReturnsToken() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("person@example.com")
                .passwordHash("hashed-password")
                .build();
        LoginRequest request = new LoginRequest("person@example.com", "password123");
        when(userRepository.findByEmail("person@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-password")).thenReturn(true);
        when(jwtService.generateToken(user.getId(), user.getEmail())).thenReturn("fake-jwt");

        AuthResponse response = authService.login(request);

        assertThat(response.token()).isEqualTo("fake-jwt");
    }

    @Test
    void loginWithWrongPasswordThrows() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("person@example.com")
                .passwordHash("hashed-password")
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
}
