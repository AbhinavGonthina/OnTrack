package com.ontrack.backend.service;

import com.ontrack.backend.dto.UserResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserService userService;
    private User user;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
        user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
    }

    @Test
    void getProfileReturnsCurrentUserFields() {
        UserResponse response = userService.getProfile(user);

        assertThat(response.id()).isEqualTo(user.getId());
        assertThat(response.email()).isEqualTo("person@example.com");
    }

    @Test
    void updateResumeSavesAndReturnsNewText() {
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserResponse response = userService.updateResume(user, "Experienced backend engineer...");

        assertThat(response.resumeText()).isEqualTo("Experienced backend engineer...");
    }
}
