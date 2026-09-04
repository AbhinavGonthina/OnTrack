import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationDetailView } from "./ApplicationDetailView";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useAiUsage } from "../context/AiUsageContext";
import type { ApplicationDetailResponse } from "@/lib/types";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../context/AiUsageContext", () => ({
  useAiUsage: vi.fn(),
}));

const detail: ApplicationDetailResponse = {
  id: "app-1",
  company: "Acme Corp",
  role: "Backend Engineer",
  jobDescriptionText: "Build backend services.",
  dateApplied: "2026-01-01",
  currentStatus: "APPLIED",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  statusEvents: [
    {
      id: "e1",
      status: "APPLIED",
      rejectedFromStage: null,
      interviewRound: null,
      interviewType: null,
      interviewFormat: null,
      eventDate: "2026-01-01",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
  notes: [{ id: "n1", text: "Recruiter reached out.", createdAt: "2026-01-01T00:00:00Z" }],
};

describe("ApplicationDetailView", () => {
  beforeEach(() => {
    // Matches a logged-out demo visitor by default - the handful of tests that specifically
    // exercise the "already signed in" messaging override this themselves.
    vi.mocked(useAuth).mockReturnValue({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useAiUsage).mockReturnValue({ aiUsage: null, refresh: vi.fn() });
  });

  test("renders the header, status badge, and existing timeline/notes", () => {
    render(<ApplicationDetailView detail={detail} readOnly={false} />);

    expect(screen.getByText("Backend Engineer · Acme Corp")).toBeInTheDocument();
    // "Applied" appears twice: the header status badge and the timeline entry.
    expect(screen.getAllByText("Applied")).toHaveLength(2);
    expect(screen.getByText("Recruiter reached out.")).toBeInTheDocument();
  });

  test("readOnly mode shows the sample-application banner and hides write actions", () => {
    render(<ApplicationDetailView detail={detail} readOnly />);

    expect(screen.getByText(/viewing a sample application/)).toBeInTheDocument();
    expect(screen.getByText("Sign up to log your own status updates.")).toBeInTheDocument();
    expect(screen.getByText("Sign up to add your own notes.")).toBeInTheDocument();
    expect(screen.queryByText("Add update")).not.toBeInTheDocument();
  });

  test("readOnly mode points an already-signed-in viewer at the navbar instead of pitching sign-up", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<ApplicationDetailView detail={detail} readOnly />);

    expect(
      screen.getByText("You're viewing a sample application - click Applications in the navbar above to see your own."),
    ).toBeInTheDocument();
    expect(screen.getByText("Open one of your own applications to log status updates.")).toBeInTheDocument();
    expect(screen.getByText("Open one of your own applications to add notes.")).toBeInTheDocument();
    expect(screen.queryByText(/Sign up/)).not.toBeInTheDocument();
  });

  test("submitting a status update calls onAddStatusEvent with the selected status", async () => {
    const onAddStatusEvent = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddStatusEvent={onAddStatusEvent} />);

    await user.selectOptions(screen.getByLabelText("New status"), "OA");
    await user.click(screen.getByText("Add update"));

    expect(onAddStatusEvent).toHaveBeenCalledTimes(1);
    expect(onAddStatusEvent.mock.calls[0][0]).toBe("OA");
    expect(onAddStatusEvent.mock.calls[0][2]).toBeUndefined();
  });

  test("selecting REJECTED reveals the rejected-from field and includes it on submit", async () => {
    const onAddStatusEvent = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddStatusEvent={onAddStatusEvent} />);

    await user.selectOptions(screen.getByLabelText("New status"), "REJECTED");
    expect(screen.getByLabelText("Rejected from")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Rejected from"), "OA");
    await user.click(screen.getByText("Add update"));

    expect(onAddStatusEvent).toHaveBeenCalledWith("REJECTED", expect.any(String), "OA", undefined, undefined);
  });

  test("selecting INTERVIEW reveals type/format fields and includes them on submit", async () => {
    const onAddStatusEvent = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddStatusEvent={onAddStatusEvent} />);

    await user.selectOptions(screen.getByLabelText("New status"), "INTERVIEW");
    expect(screen.getByLabelText("Interview type")).toBeInTheDocument();
    expect(screen.getByLabelText("Format")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Interview type"), "BEHAVIORAL");
    await user.selectOptions(screen.getByLabelText("Format"), "IN_PERSON");
    await user.click(screen.getByText("Add update"));

    expect(onAddStatusEvent).toHaveBeenCalledWith(
      "INTERVIEW",
      expect.any(String),
      undefined,
      "BEHAVIORAL",
      "IN_PERSON",
    );
  });

  test("shows the round number and interview type/format on a logged interview event", () => {
    const detailWithInterview: ApplicationDetailResponse = {
      ...detail,
      statusEvents: [
        ...detail.statusEvents,
        {
          id: "e2",
          status: "INTERVIEW",
          rejectedFromStage: null,
          interviewRound: 2,
          interviewType: "TECHNICAL",
          interviewFormat: "ONLINE",
          eventDate: "2026-01-05",
          createdAt: "2026-01-05T00:00:00Z",
        },
      ],
    };
    render(<ApplicationDetailView detail={detailWithInterview} readOnly={false} />);

    expect(screen.getByText("Interview (Round 2)")).toBeInTheDocument();
    expect(screen.getByText(/Technical.*Online/)).toBeInTheDocument();
  });

  test("submitting an OFFER status shows the offer celebration", async () => {
    const onAddStatusEvent = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddStatusEvent={onAddStatusEvent} />);

    await user.selectOptions(screen.getByLabelText("New status"), "OFFER");
    await user.click(screen.getByText("Add update"));

    await waitFor(() => expect(screen.getByText("Congratulations on your offer!")).toBeInTheDocument());
  });

  test("the New status dropdown only offers Accepted/Declined once the application is at Offer", () => {
    const offeredDetail: ApplicationDetailResponse = { ...detail, currentStatus: "OFFER" };
    render(<ApplicationDetailView detail={offeredDetail} readOnly={false} onAddStatusEvent={vi.fn()} />);

    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Accepted", "Declined"]);
  });

  test("submitting Accepted once at Offer calls onAddStatusEvent", async () => {
    const onAddStatusEvent = vi.fn().mockResolvedValue(undefined);
    const offeredDetail: ApplicationDetailResponse = { ...detail, currentStatus: "OFFER" };
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={offeredDetail} readOnly={false} onAddStatusEvent={onAddStatusEvent} />);

    await user.click(screen.getByText("Add update"));

    expect(onAddStatusEvent.mock.calls[0][0]).toBe("ACCEPTED");
  });

  test("shows an error message if the status update fails", async () => {
    const onAddStatusEvent = vi.fn().mockRejectedValue(new Error("Rate limit exceeded"));
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddStatusEvent={onAddStatusEvent} />);

    await user.click(screen.getByText("Add update"));

    await waitFor(() => expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument());
  });

  // Regression test: rapid re-clicking during a rate limit previously meant every click sent
  // its own independent request, and since the limiter's token bucket refills continuously
  // (not all at once), some of those clicks would slip through as separate, unintended
  // submissions once the bucket recovered. The button must stay disabled for the server's
  // stated wait time so a single failed click can't be turned into several by clicking again.
  test("disables the button for the server's stated wait time after a 429, and blocks a click during it", async () => {
    const onAddStatusEvent = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(429, "Too many requests - please slow down and try again in 2 seconds.", 2))
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddStatusEvent={onAddStatusEvent} />);

    await user.click(screen.getByText("Add update"));

    const cooldownButton = await screen.findByText("Try again in 2s");
    expect(cooldownButton.closest("button")).toBeDisabled();

    // A click while disabled must not queue up and fire once the cooldown clears.
    await user.click(cooldownButton);
    expect(onAddStatusEvent).toHaveBeenCalledTimes(1);
  });

  test("deleting a status event calls onDeleteStatusEvent with its id", async () => {
    const onDeleteStatusEvent = vi.fn().mockResolvedValue(undefined);
    const detailWithInterview: ApplicationDetailResponse = {
      ...detail,
      statusEvents: [
        ...detail.statusEvents,
        {
          id: "e2",
          status: "OA",
          rejectedFromStage: null,
          interviewRound: null,
          interviewType: null,
          interviewFormat: null,
          eventDate: "2026-01-05",
          createdAt: "2026-01-05T00:00:00Z",
        },
      ],
    };
    const user = userEvent.setup();
    render(
      <ApplicationDetailView
        detail={detailWithInterview}
        readOnly={false}
        onDeleteStatusEvent={onDeleteStatusEvent}
      />,
    );

    await user.click(screen.getByText("Delete"));

    expect(onDeleteStatusEvent).toHaveBeenCalledWith("e2");
  });

  test("the Applied stage has no delete option", () => {
    render(<ApplicationDetailView detail={detail} readOnly={false} onDeleteStatusEvent={vi.fn()} />);

    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  test("shows an error message if deleting a status event fails", async () => {
    const onDeleteStatusEvent = vi.fn().mockRejectedValue(new Error("Something went wrong. Please try again."));
    const detailWithInterview: ApplicationDetailResponse = {
      ...detail,
      statusEvents: [
        ...detail.statusEvents,
        {
          id: "e2",
          status: "OA",
          rejectedFromStage: null,
          interviewRound: null,
          interviewType: null,
          interviewFormat: null,
          eventDate: "2026-01-05",
          createdAt: "2026-01-05T00:00:00Z",
        },
      ],
    };
    const user = userEvent.setup();
    render(
      <ApplicationDetailView
        detail={detailWithInterview}
        readOnly={false}
        onDeleteStatusEvent={onDeleteStatusEvent}
      />,
    );

    await user.click(screen.getByText("Delete"));

    await waitFor(() => expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument());
  });

  test("adding a note calls onAddNote with the trimmed text and clears the field", async () => {
    const onAddNote = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddNote={onAddNote} />);

    const textarea = screen.getByPlaceholderText("Add a note…");
    await user.type(textarea, "  Follow up next week.  ");
    await user.click(screen.getByText("Add note"));

    expect(onAddNote).toHaveBeenCalledWith("Follow up next week.");
    await waitFor(() => expect(textarea).toHaveValue(""));
  });

  test("the add-note button stays disabled for blank input", () => {
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddNote={vi.fn()} />);

    expect(screen.getByText("Add note")).toBeDisabled();
  });

  test("deleting a note calls onDeleteNote with its id", async () => {
    const onDeleteNote = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onDeleteNote={onDeleteNote} />);

    await user.click(screen.getByText("Delete"));

    expect(onDeleteNote).toHaveBeenCalledWith("n1");
  });

  test("running fit analysis displays the score, keywords, and bullets", async () => {
    const onRunFitAnalysis = vi.fn().mockResolvedValue({
      id: "f1",
      fitScore: 82,
      missingKeywords: ["Kubernetes"],
      suggestedBullets: ["Highlight container orchestration experience."],
      createdAt: "2026-01-01T00:00:00Z",
      cached: true,
    });
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onRunFitAnalysis={onRunFitAnalysis} />);

    await user.click(screen.getByText("Run fit analysis"));

    await waitFor(() => expect(screen.getByText("82")).toBeInTheDocument());
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("Highlight container orchestration experience.")).toBeInTheDocument();
    expect(screen.getByText("cached")).toBeInTheDocument();
  });

  test("shows an error message if fit analysis fails", async () => {
    const onRunFitAnalysis = vi.fn().mockRejectedValue(new Error("The AI service is temporarily unavailable."));
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onRunFitAnalysis={onRunFitAnalysis} />);

    await user.click(screen.getByText("Run fit analysis"));

    await waitFor(() =>
      expect(screen.getByText("The AI service is temporarily unavailable.")).toBeInTheDocument(),
    );
  });

  test("fit analysis section is hidden when no handler is provided", () => {
    render(<ApplicationDetailView detail={detail} readOnly={false} />);

    expect(screen.getByText("Fit analysis isn't available here.")).toBeInTheDocument();
    expect(screen.queryByText("Run fit analysis")).not.toBeInTheDocument();
  });
});
