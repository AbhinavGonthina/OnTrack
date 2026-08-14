package com.ontrack.backend.service;

import com.ontrack.backend.dto.UserResponse;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserResponse getProfile(User user) {
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateResume(User user, String resumeText) {
        user.setResumeText(resumeText);
        user = userRepository.save(user);
        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getResumeText(), user.getCreatedAt());
    }
}
