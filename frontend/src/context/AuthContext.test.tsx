import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import { getSession, logout as logoutRequest } from "../lib/api";

vi.mock("../lib/api", () => ({
  getSession: vi.fn(),
  logout: vi.fn(),
}));

function Consumer() {
  const { token, user, isAuthenticated, isInitializing, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="initializing">{String(isInitializing)}</p>
      <p data-testid="authenticated">{String(isAuthenticated)}</p>
      <p data-testid="token">{token ?? "none"}</p>
      <p data-testid="email">{user?.email ?? "none"}</p>
      <button onClick={() => login("a-token", { id: "1", email: "a@b.com" })}>Log in</button>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

describe("AuthContext", () => {
  afterEach(() => {
    vi.mocked(getSession).mockReset();
    vi.mocked(logoutRequest).mockReset();
  });

  test("starts unauthenticated (and initializing) with no token or user", () => {
    vi.mocked(getSession).mockReturnValue(new Promise(() => {})); // never resolves in this test
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("initializing")).toHaveTextContent("true");
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
  });

  test("restores a session from getSession on mount, then stops initializing", async () => {
    vi.mocked(getSession).mockResolvedValue({ token: "restored-token", userId: "1", email: "restored@b.com" });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("initializing")).toHaveTextContent("false"));
    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("token")).toHaveTextContent("restored-token");
    expect(screen.getByTestId("email")).toHaveTextContent("restored@b.com");
  });

  test("stays logged out (but stops initializing) when there's no valid session", async () => {
    vi.mocked(getSession).mockRejectedValue(new Error("no session"));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("initializing")).toHaveTextContent("false"));
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
  });

  test("login populates token/user and flips isAuthenticated", async () => {
    vi.mocked(getSession).mockRejectedValue(new Error("no session"));
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await user.click(screen.getByText("Log in"));

    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("token")).toHaveTextContent("a-token");
    expect(screen.getByTestId("email")).toHaveTextContent("a@b.com");
  });

  test("logout clears token/user, flips isAuthenticated back, and tells the backend", async () => {
    vi.mocked(getSession).mockRejectedValue(new Error("no session"));
    vi.mocked(logoutRequest).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await user.click(screen.getByText("Log in"));
    await user.click(screen.getByText("Log out"));

    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(logoutRequest).toHaveBeenCalledTimes(1);
  });

  test("useAuth throws when used outside a provider", () => {
    function BareConsumer() {
      useAuth();
      return null;
    }
    expect(() => render(<BareConsumer />)).toThrow("useAuth must be used within an AuthProvider");
  });
});
