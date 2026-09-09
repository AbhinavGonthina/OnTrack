import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportProblemButton } from "./ReportProblemButton";
import { useAuth } from "../context/AuthContext";
import { usePathname } from "next/navigation";
import { ApiError, submitFeedback } from "../lib/api";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, submitFeedback: vi.fn() };
});

describe("ReportProblemButton", () => {
  function mockAuthed() {
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(usePathname).mockReturnValue("/dashboard");
  }

  test("opens the modal and submits feedback with the message and current page", async () => {
    mockAuthed();
    vi.mocked(submitFeedback).mockResolvedValue({ message: "Thanks for the feedback!" });
    const user = userEvent.setup();
    render(<ReportProblemButton />);

    await user.click(screen.getByTitle("Report a problem"));
    await user.type(screen.getByPlaceholderText("Describe the problem…"), "The delete button 404s");
    await user.click(screen.getByText("Send feedback"));

    expect(submitFeedback).toHaveBeenCalledWith("t", "The delete button 404s", "/dashboard");
    await waitFor(() => expect(screen.getByText(/Thanks, we'll take a look\./)).toBeInTheDocument());
  });

  test("shows an error message if submitting feedback fails", async () => {
    mockAuthed();
    vi.mocked(submitFeedback).mockRejectedValue(
      new ApiError(502, "Couldn't send the email. Please try again shortly."),
    );
    const user = userEvent.setup();
    render(<ReportProblemButton />);

    await user.click(screen.getByTitle("Report a problem"));
    await user.type(screen.getByPlaceholderText("Describe the problem…"), "Something's broken");
    await user.click(screen.getByText("Send feedback"));

    await waitFor(() =>
      expect(screen.getByText("Couldn't send the email. Please try again shortly.")).toBeInTheDocument(),
    );
  });

  test("closes the modal when the close button is clicked", async () => {
    mockAuthed();
    const user = userEvent.setup();
    render(<ReportProblemButton />);

    await user.click(screen.getByTitle("Report a problem"));
    expect(screen.getByText("Report a problem", { selector: "h2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "" }));

    expect(screen.queryByText("Report a problem", { selector: "h2" })).not.toBeInTheDocument();
  });

  test("renders the dashboard quick-action variant with its own label", async () => {
    mockAuthed();
    const user = userEvent.setup();
    render(<ReportProblemButton variant="action" />);

    expect(screen.getByText("Report a problem")).toBeInTheDocument();
    await user.click(screen.getByText("Report a problem"));

    expect(screen.getByPlaceholderText("Describe the problem…")).toBeInTheDocument();
  });
});
