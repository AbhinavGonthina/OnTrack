import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationDetailView } from "./ApplicationDetailView";
import type { ApplicationDetailResponse } from "@/lib/types";

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
    { id: "e1", status: "APPLIED", rejectedFromStage: null, eventDate: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
  ],
  notes: [{ id: "n1", text: "Recruiter reached out.", createdAt: "2026-01-01T00:00:00Z" }],
};

describe("ApplicationDetailView", () => {
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

    expect(onAddStatusEvent).toHaveBeenCalledWith("REJECTED", expect.any(String), "OA");
  });

  test("shows an error message if the status update fails", async () => {
    const onAddStatusEvent = vi.fn().mockRejectedValue(new Error("Rate limit exceeded"));
    const user = userEvent.setup();
    render(<ApplicationDetailView detail={detail} readOnly={false} onAddStatusEvent={onAddStatusEvent} />);

    await user.click(screen.getByText("Add update"));

    await waitFor(() => expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument());
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
