import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserAccountButton } from "./UserAccountButton";
import { useAuth } from "../context/AuthContext";
import { ApiError, forgotPassword } from "../lib/api";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, forgotPassword: vi.fn() };
});

function mockAuthed() {
  vi.mocked(useAuth).mockReturnValue({
    token: "t",
    user: { id: "1", email: "person@example.com" },
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

describe("UserAccountButton", () => {
  test("renders nothing when there is no logged-in user", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = render(<UserAccountButton />);

    expect(container).toBeEmptyDOMElement();
  });

  test("clicking the avatar opens a popup showing the account email", async () => {
    mockAuthed();
    const user = userEvent.setup();
    render(<UserAccountButton />);

    await user.click(screen.getByTitle("person@example.com"));

    expect(screen.getByText("Your account")).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
  });

  test("clicking Reset password sends a reset-link email and shows a confirmation, not a live password change", async () => {
    mockAuthed();
    vi.mocked(forgotPassword).mockResolvedValue({ message: "Sent" });
    const user = userEvent.setup();
    render(<UserAccountButton />);

    await user.click(screen.getByTitle("person@example.com"));
    await user.click(screen.getByRole("button", { name: /Reset password/ }));

    expect(forgotPassword).toHaveBeenCalledWith("person@example.com");
    await waitFor(() =>
      expect(screen.getByText("Check your email for a link to reset your password.")).toBeInTheDocument(),
    );
    // The button itself never asks for or changes a password directly.
    expect(screen.queryByPlaceholderText(/password/i)).not.toBeInTheDocument();
  });

  test("shows an error message if sending the reset link fails", async () => {
    mockAuthed();
    vi.mocked(forgotPassword).mockRejectedValue(new ApiError(502, "Couldn't send the email. Please try again shortly."));
    const user = userEvent.setup();
    render(<UserAccountButton />);

    await user.click(screen.getByTitle("person@example.com"));
    await user.click(screen.getByRole("button", { name: /Reset password/ }));

    await waitFor(() =>
      expect(screen.getByText("Couldn't send the email. Please try again shortly.")).toBeInTheDocument(),
    );
  });

  test("closes the popup when the close button is clicked", async () => {
    mockAuthed();
    const user = userEvent.setup();
    render(<UserAccountButton />);

    await user.click(screen.getByTitle("person@example.com"));
    expect(screen.getByText("Your account")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "" }));

    expect(screen.queryByText("Your account")).not.toBeInTheDocument();
  });
});
