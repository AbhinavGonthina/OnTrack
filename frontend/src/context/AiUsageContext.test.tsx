import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiUsageProvider, useAiUsage } from "./AiUsageContext";
import { useAuth } from "./AuthContext";
import { getAiUsage } from "../lib/api";

vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  getAiUsage: vi.fn(),
}));

function Consumer() {
  const { aiUsage, refresh } = useAiUsage();
  return (
    <div>
      <p data-testid="usage">{aiUsage ? `${aiUsage.remaining}/${aiUsage.limit}` : "none"}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

describe("AiUsageContext", () => {
  afterEach(() => {
    vi.mocked(useAuth).mockReset();
    vi.mocked(getAiUsage).mockReset();
  });

  test("fetches usage on mount when a token is present", async () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "a-token",
      user: null,
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getAiUsage).mockResolvedValue({ remaining: 14, limit: 20 });

    render(
      <AiUsageProvider>
        <Consumer />
      </AiUsageProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("usage")).toHaveTextContent("14/20"));
  });

  test("stays null with no token, and doesn't call the API", () => {
    vi.mocked(useAuth).mockReturnValue({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <AiUsageProvider>
        <Consumer />
      </AiUsageProvider>,
    );

    expect(screen.getByTestId("usage")).toHaveTextContent("none");
    expect(getAiUsage).not.toHaveBeenCalled();
  });

  test("refresh re-fetches and updates the count", async () => {
    vi.mocked(useAuth).mockReturnValue({
      token: "a-token",
      user: null,
      isAuthenticated: true,
      isInitializing: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(getAiUsage).mockResolvedValueOnce({ remaining: 14, limit: 20 }).mockResolvedValueOnce({ remaining: 13, limit: 20 });
    const user = userEvent.setup();

    render(
      <AiUsageProvider>
        <Consumer />
      </AiUsageProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("usage")).toHaveTextContent("14/20"));
    await user.click(screen.getByText("Refresh"));
    await waitFor(() => expect(screen.getByTestId("usage")).toHaveTextContent("13/20"));
  });

  test("useAiUsage throws when used outside a provider", () => {
    function BareConsumer() {
      useAiUsage();
      return null;
    }
    expect(() => render(<BareConsumer />)).toThrow("useAiUsage must be used within an AiUsageProvider");
  });
});
