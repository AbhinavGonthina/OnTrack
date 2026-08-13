package com.ontrack.backend.service;

import com.ontrack.backend.dto.ApplicationDetailResponse;
import com.ontrack.backend.dto.ApplicationRequest;
import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.dto.StatusEventRequest;
import com.ontrack.backend.entity.Application;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.exception.ApplicationLimitExceededException;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.exception.InvalidStatusEventException;
import com.ontrack.backend.repository.ApplicationRepository;
import com.ontrack.backend.repository.NoteRepository;
import com.ontrack.backend.repository.StatusEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private StatusEventRepository statusEventRepository;

    @Mock
    private NoteRepository noteRepository;

    private ApplicationService applicationService;
    private User user;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(applicationRepository, statusEventRepository, noteRepository);
        user = User.builder().id(UUID.randomUUID()).email("person@example.com").build();
    }

    @Test
    void createSavesApplicationAndInitialStatusEvent() {
        ApplicationRequest request = new ApplicationRequest("Acme", "SWE Intern", "JD text", LocalDate.of(2026, 1, 1));
        when(applicationRepository.countByUserId(user.getId())).thenReturn(0L);
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> {
            Application app = inv.getArgument(0);
            app.setId(UUID.randomUUID());
            return app;
        });

        ApplicationResponse response = applicationService.create(user, request);

        assertThat(response.company()).isEqualTo("Acme");
        assertThat(response.currentStatus()).isEqualTo(ApplicationStatus.APPLIED);
        verify(statusEventRepository).save(any());
    }

    @Test
    void createThrowsWhenAtApplicationLimit() {
        ApplicationRequest request = new ApplicationRequest("Acme", "SWE Intern", "JD", LocalDate.now());
        when(applicationRepository.countByUserId(user.getId())).thenReturn(100L);

        assertThatThrownBy(() -> applicationService.create(user, request))
                .isInstanceOf(ApplicationLimitExceededException.class);
    }

    @Test
    void getDetailThrowsWhenApplicationNotOwned() {
        UUID appId = UUID.randomUUID();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.getDetail(user.getId(), appId))
                .isInstanceOf(ApplicationNotFoundException.class);
    }

    @Test
    void getDetailReturnsEventsAndNotes() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder()
                .id(appId)
                .user(user)
                .company("Acme")
                .role("SWE Intern")
                .dateApplied(LocalDate.now())
                .currentStatus(ApplicationStatus.APPLIED)
                .build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId)).thenReturn(List.of());
        when(noteRepository.findByApplicationIdOrderByCreatedAtDesc(appId)).thenReturn(List.of());

        ApplicationDetailResponse detail = applicationService.getDetail(user.getId(), appId);

        assertThat(detail.id()).isEqualTo(appId);
        assertThat(detail.statusEvents()).isEmpty();
        assertThat(detail.notes()).isEmpty();
    }

    @Test
    void deleteThrowsWhenApplicationNotOwned() {
        UUID appId = UUID.randomUUID();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.delete(user.getId(), appId))
                .isInstanceOf(ApplicationNotFoundException.class);
    }

    @Test
    void addStatusEventUpdatesCurrentStatus() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder()
                .id(appId)
                .user(user)
                .company("Acme")
                .role("SWE Intern")
                .dateApplied(LocalDate.now())
                .currentStatus(ApplicationStatus.APPLIED)
                .build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.OA, null, LocalDate.now());
        ApplicationResponse response = applicationService.addStatusEvent(user.getId(), appId, request);

        assertThat(response.currentStatus()).isEqualTo(ApplicationStatus.OA);
        verify(statusEventRepository).save(any());
    }

    @Test
    void addStatusEventRejectedWithoutStageThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OA).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.REJECTED, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventRejectedWithInvalidStageThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OFFER).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.REJECTED, ApplicationStatus.OFFER, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventNonRejectedWithStageThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.APPLIED).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.OA, ApplicationStatus.APPLIED, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }
}
