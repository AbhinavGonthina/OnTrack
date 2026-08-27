import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";

function Consumer() {
  const { token, user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="authenticated">{String(isAuthenticated)}</p>
      <p data-testid="token">{token ?? "none"}</p>
      <p data-testid="email">{user?.email ?? "none"}</p>
      <button onClick={() => login("a-token", { id: "1", email: "a@b.com" })}>Log in</button>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

describe("AuthContext", () => {
  test("starts unauthenticated with no token or user", () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
  });

  test("login populates token/user and flips isAuthenticated", async () => {
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

  test("logout clears token/user and flips isAuthenticated back", async () => {
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
  });

  test("useAuth throws when used outside a provider", () => {
    function BareConsumer() {
      useAuth();
      return null;
    }
    expect(() => render(<BareConsumer />)).toThrow("useAuth must be used within an AuthProvider");
  });
});
