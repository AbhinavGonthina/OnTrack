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
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/login");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<AppNav />);

    expect(container).toBeEmptyDOMElement();
  });

  test("shows a lightweight public nav on the demo pages when not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/demo");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    render(<AppNav />);

    expect(screen.getByText("OnTrack").closest("a")).toHaveAttribute("href", "/");
    expect(screen.getByText("Log In")).toHaveAttribute("href", "/login");
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Log out")).not.toBeInTheDocument();
  });

  test("shows the full authenticated nav on the demo pages when already signed in", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/demo");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    render(<AppNav />);

    // getAllByText, not getByText: the nav links render twice by design - see the
    // "renders the nav links twice" test below.
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getByTitle("Log out")).toBeInTheDocument();
  });

  test("renders nothing on the landing page even when authenticated - navigating back there isn't a sign-out", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<AppNav />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing while still on the login page even once authenticated, before the redirect to /dashboard commits", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      isInitializing: false,
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
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/applications");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    render(<AppNav />);

    expect(screen.getByText("P")).toBeInTheDocument();
    // Both the desktop and the mobile copy of each link must agree on the active route.
    for (const link of screen.getAllByText("Applications")) {
      expect(link).toHaveClass("border-brand");
    }
    for (const link of screen.getAllByText("Dashboard")) {
      expect(link).not.toHaveClass("border-brand");
    }
    expect(screen.getByText("OnTrack").closest("a")).toHaveAttribute("href", "/");
  });

  // The desktop copy is absolutely centered (so the active tab lines up with the page's
  // own vertical grid) which takes it out of flow; on a phone that made it render on top
  // of the logo and the right-hand controls. The two copies are hidden at opposite
  // breakpoints, so exactly one is ever visible - and only one reaches assistive tech,
  // since the other is display:none rather than merely transparent.
  test("renders the nav links twice - an md+ centered copy and a narrow-screen second row", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useTheme).mockReturnValue({ theme: "light", toggleTheme: vi.fn() });
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    render(<AppNav />);

    const copies = screen.getAllByText("Dashboard");
    expect(copies).toHaveLength(2);

    const rows = copies.map((link) => link.parentElement);
    expect(rows.some((row) => row?.className.includes("hidden") && row?.className.includes("md:flex"))).toBe(true);
    expect(rows.some((row) => row?.className.includes("md:hidden"))).toBe(true);
  });

  test("logout clears auth state and navigates to the landing page", async () => {
    const logout = vi.fn();
    const push = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      token: "t",
      user: { id: "1", email: "person@example.com" },
      isAuthenticated: true,
      isInitializing: false,
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
