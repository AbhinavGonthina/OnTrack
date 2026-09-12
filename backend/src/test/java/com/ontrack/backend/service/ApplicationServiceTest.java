package com.ontrack.backend.service;

import com.ontrack.backend.dto.ApplicationDetailResponse;
import com.ontrack.backend.dto.ApplicationRequest;
import com.ontrack.backend.dto.ApplicationResponse;
import com.ontrack.backend.dto.StatusEventRequest;
import com.ontrack.backend.entity.Application;
import com.ontrack.backend.entity.StatusEvent;
import com.ontrack.backend.entity.User;
import com.ontrack.backend.enums.ApplicationStatus;
import com.ontrack.backend.enums.InterviewFormat;
import com.ontrack.backend.enums.InterviewType;
import com.ontrack.backend.exception.ApplicationLimitExceededException;
import com.ontrack.backend.exception.ApplicationNotFoundException;
import com.ontrack.backend.exception.InvalidStatusEventException;
import com.ontrack.backend.exception.StatusEventNotFoundException;
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
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId)).thenReturn(List.of());

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.OA, null, null, LocalDate.now());
        ApplicationResponse response = applicationService.addStatusEvent(user.getId(), appId, request);

        assertThat(response.currentStatus()).isEqualTo(ApplicationStatus.OA);
        verify(statusEventRepository).save(any());
    }

    @Test
    void addStatusEventAppliedThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.APPLIED).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.APPLIED, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventRepeatingTheSameNonInterviewStageThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OA).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.OA, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventDatedBeforeAnEarlierStageThrows() {
        UUID appId = UUID.randomUUID();
        Application application =
                Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.PHONE_SCREEN).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        com.ontrack.backend.entity.StatusEvent phoneScreenEvent = com.ontrack.backend.entity.StatusEvent.builder()
                .status(ApplicationStatus.PHONE_SCREEN)
                .eventDate(LocalDate.of(2026, 1, 10))
                .build();
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId))
                .thenReturn(List.of(phoneScreenEvent));

        StatusEventRequest request = new StatusEventRequest(
                ApplicationStatus.INTERVIEW, InterviewType.TECHNICAL, InterviewFormat.ONLINE,
                LocalDate.of(2026, 1, 5));

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventDatedOnOrAfterEveryEarlierStageIsAllowed() {
        UUID appId = UUID.randomUUID();
        Application application =
                Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.PHONE_SCREEN).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(statusEventRepository.countByApplicationIdAndStatus(appId, ApplicationStatus.INTERVIEW)).thenReturn(0L);
        com.ontrack.backend.entity.StatusEvent phoneScreenEvent = com.ontrack.backend.entity.StatusEvent.builder()
                .status(ApplicationStatus.PHONE_SCREEN)
                .eventDate(LocalDate.of(2026, 1, 10))
                .build();
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId))
                .thenReturn(List.of(phoneScreenEvent));

        StatusEventRequest request = new StatusEventRequest(
                ApplicationStatus.INTERVIEW, InterviewType.TECHNICAL, InterviewFormat.ONLINE,
                LocalDate.of(2026, 1, 10));
        ApplicationResponse response = applicationService.addStatusEvent(user.getId(), appId, request);

        assertThat(response.currentStatus()).isEqualTo(ApplicationStatus.INTERVIEW);
    }

    @Test
    // A rejection no longer carries its own "from" stage: the event preceding it already is
    // one, which is what computeSankeyLinks reads via LAG(). Storing it separately let the two
    // disagree, and the form's APPLIED default meant it often did.
    void addStatusEventRejectedNeedsNoStage() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OA).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.REJECTED, null, null, LocalDate.now());

        applicationService.addStatusEvent(user.getId(), appId, request);

        assertThat(application.getCurrentStatus()).isEqualTo(ApplicationStatus.REJECTED);
    }

    @Test
    void addStatusEventMovingBackwardThrows() {
        UUID appId = UUID.randomUUID();
        Application application =
                Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.PHONE_SCREEN).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.OA, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventSkippingAheadIsAllowed() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.APPLIED).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(statusEventRepository.countByApplicationIdAndStatus(appId, ApplicationStatus.INTERVIEW)).thenReturn(0L);
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId)).thenReturn(List.of());

        StatusEventRequest request = new StatusEventRequest(
                ApplicationStatus.INTERVIEW, InterviewType.TECHNICAL, InterviewFormat.ONLINE, LocalDate.now());
        ApplicationResponse response = applicationService.addStatusEvent(user.getId(), appId, request);

        assertThat(response.currentStatus()).isEqualTo(ApplicationStatus.INTERVIEW);
    }

    @Test
    void addStatusEventOnceOfferedThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OFFER).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.OA, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventOnceRejectedThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.REJECTED).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.OA, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventInterviewWithoutTypeOrFormatThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OA).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.INTERVIEW, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventNonInterviewWithTypeThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.APPLIED).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request =
                new StatusEventRequest(ApplicationStatus.OA, InterviewType.TECHNICAL, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventSecondInterviewRoundIsNumberedTwo() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.INTERVIEW).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(statusEventRepository.countByApplicationIdAndStatus(appId, ApplicationStatus.INTERVIEW)).thenReturn(1L);
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId)).thenReturn(List.of());

        StatusEventRequest request = new StatusEventRequest(
                ApplicationStatus.INTERVIEW, InterviewType.BEHAVIORAL, InterviewFormat.IN_PERSON, LocalDate.now());
        applicationService.addStatusEvent(user.getId(), appId, request);

        org.mockito.ArgumentCaptor<com.ontrack.backend.entity.StatusEvent> captor =
                org.mockito.ArgumentCaptor.forClass(com.ontrack.backend.entity.StatusEvent.class);
        verify(statusEventRepository).save(captor.capture());
        assertThat(captor.getValue().getInterviewRound()).isEqualTo(2);
    }

    @Test
    void deleteStatusEventThrowsWhenApplicationNotOwned() {
        UUID appId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.deleteStatusEvent(user.getId(), appId, eventId))
                .isInstanceOf(ApplicationNotFoundException.class);
    }

    @Test
    void deleteStatusEventThrowsWhenEventNotFound() {
        UUID appId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OA).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(statusEventRepository.findByIdAndApplicationId(eventId, appId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.deleteStatusEvent(user.getId(), appId, eventId))
                .isInstanceOf(StatusEventNotFoundException.class);
    }

    @Test
    void deleteStatusEventThrowsWhenDeletingApplied() {
        UUID appId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OA).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        StatusEvent appliedEvent = StatusEvent.builder().id(eventId).status(ApplicationStatus.APPLIED).build();
        when(statusEventRepository.findByIdAndApplicationId(eventId, appId)).thenReturn(Optional.of(appliedEvent));

        assertThatThrownBy(() -> applicationService.deleteStatusEvent(user.getId(), appId, eventId))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void deleteStatusEventRecomputesCurrentStatusFromRemainingEvents() {
        UUID appId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        Application application =
                Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.PHONE_SCREEN).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        StatusEvent phoneScreenEvent = StatusEvent.builder()
                .id(eventId)
                .status(ApplicationStatus.PHONE_SCREEN)
                .eventDate(LocalDate.of(2026, 1, 10))
                .build();
        when(statusEventRepository.findByIdAndApplicationId(eventId, appId)).thenReturn(Optional.of(phoneScreenEvent));
        StatusEvent oaEvent = StatusEvent.builder()
                .status(ApplicationStatus.OA)
                .eventDate(LocalDate.of(2026, 1, 5))
                .build();
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId))
                .thenReturn(List.of(oaEvent));

        ApplicationResponse response = applicationService.deleteStatusEvent(user.getId(), appId, eventId);

        assertThat(response.currentStatus()).isEqualTo(ApplicationStatus.OA);
        verify(statusEventRepository).delete(phoneScreenEvent);
    }

    @Test
    void deleteStatusEventRenumbersRemainingInterviewRounds() {
        UUID appId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.INTERVIEW).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        StatusEvent roundTwo = StatusEvent.builder()
                .id(eventId)
                .status(ApplicationStatus.INTERVIEW)
                .interviewRound(2)
                .eventDate(LocalDate.of(2026, 1, 10))
                .build();
        when(statusEventRepository.findByIdAndApplicationId(eventId, appId)).thenReturn(Optional.of(roundTwo));
        StatusEvent roundThree = StatusEvent.builder()
                .status(ApplicationStatus.INTERVIEW)
                .interviewRound(3)
                .eventDate(LocalDate.of(2026, 1, 15))
                .build();
        when(statusEventRepository.findByApplicationIdAndStatusOrderByEventDateAscCreatedAtAsc(
                appId, ApplicationStatus.INTERVIEW)).thenReturn(List.of(roundThree));
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId))
                .thenReturn(List.of(roundThree));

        applicationService.deleteStatusEvent(user.getId(), appId, eventId);

        assertThat(roundThree.getInterviewRound()).isEqualTo(1);
        verify(statusEventRepository).saveAll(List.of(roundThree));
    }

    @Test
    void addStatusEventAcceptedWithoutAnOfferThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.INTERVIEW).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.ACCEPTED, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventDeclinedWithoutAnOfferThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.APPLIED).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.DECLINED, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventOfferCannotMoveToRejectedThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OFFER).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request =
                new StatusEventRequest(ApplicationStatus.REJECTED, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventAcceptedAfterOfferSucceeds() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OFFER).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId)).thenReturn(List.of());

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.ACCEPTED, null, null, LocalDate.now());
        ApplicationResponse response = applicationService.addStatusEvent(user.getId(), appId, request);

        assertThat(response.currentStatus()).isEqualTo(ApplicationStatus.ACCEPTED);
    }

    @Test
    void addStatusEventDeclinedAfterOfferSucceeds() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.OFFER).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));
        when(applicationRepository.save(any(Application.class))).thenAnswer(inv -> inv.getArgument(0));
        when(statusEventRepository.findByApplicationIdOrderByEventDateAscCreatedAtAsc(appId)).thenReturn(List.of());

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.DECLINED, null, null, LocalDate.now());
        ApplicationResponse response = applicationService.addStatusEvent(user.getId(), appId, request);

        assertThat(response.currentStatus()).isEqualTo(ApplicationStatus.DECLINED);
    }

    @Test
    void addStatusEventOnceAcceptedThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.ACCEPTED).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.DECLINED, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }

    @Test
    void addStatusEventOnceDeclinedThrows() {
        UUID appId = UUID.randomUUID();
        Application application = Application.builder().id(appId).user(user).currentStatus(ApplicationStatus.DECLINED).build();
        when(applicationRepository.findByIdAndUserId(appId, user.getId())).thenReturn(Optional.of(application));

        StatusEventRequest request = new StatusEventRequest(ApplicationStatus.ACCEPTED, null, null, LocalDate.now());

        assertThatThrownBy(() -> applicationService.addStatusEvent(user.getId(), appId, request))
                .isInstanceOf(InvalidStatusEventException.class);
    }
}
