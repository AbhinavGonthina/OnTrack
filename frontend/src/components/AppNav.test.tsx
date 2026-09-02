import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppNav } from "./AppNav";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { usePathname, useRouter } from "next/navigation";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../context/ThemeContext", () => ({
  useTheme: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

describe("AppNav", () => {
  test("renders nothing when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: null,
      user: null,
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/login");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<AppNav />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing while still on the login page even once authenticated, before the redirect to /dashboard commits", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/login");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<AppNav />);

    expect(container).toBeEmptyDOMElement();
  });

  test("shows the avatar initial and highlights the active route when authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/applications");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    render(<AppNav />);

    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("Applications")).toHaveClass("border-brand");
    expect(screen.getByText("Dashboard")).not.toHaveClass("border-brand");
  });

  test("logout clears auth state and navigates to the landing page", async () => {
    const logout = vi.fn();
    const push = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      login: vi.fn(),
      logout,
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);

    const user = userEvent.setup();
    render(<AppNav />);

    await user.click(screen.getByTitle("Log out"));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });
});
