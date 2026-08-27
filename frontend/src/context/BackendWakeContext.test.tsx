import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackendWakeProvider, useBackendWake } from "./BackendWakeContext";

vi.mock("../lib/api", () => ({
  checkHealth: vi.fn(),
}));

import { checkHealth } from "../lib/api";

function Consumer() {
  const { status, isSlow, startWaking, waitUntilAwake } = useBackendWake();
  const [waited, setWaited] = useState(false);
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="slow">{String(isSlow)}</p>
      <p data-testid="waited">{String(waited)}</p>
      <button onClick={startWaking}>Start</button>
      <button
        onClick={() => {
          waitUntilAwake().then(() => setWaited(true));
        }}
      >
        Wait
      </button>
    </div>
  );
}

describe("BackendWakeContext", () => {
  beforeEach(() => {
    vi.mocked(checkHealth).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("starts idle, moves to waking then awake once the health check succeeds", async () => {
    vi.mocked(checkHealth).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <BackendWakeProvider>
        <Consumer />
      </BackendWakeProvider>,
    );

    expect(screen.getByTestId("status")).toHaveTextContent("idle");

    await user.click(screen.getByText("Start"));

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awake"));
  });

  test("waitUntilAwake resolves once the backend is awake", async () => {
    vi.mocked(checkHealth).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <BackendWakeProvider>
        <Consumer />
      </BackendWakeProvider>,
    );

    await user.click(screen.getByText("Wait"));

    await waitFor(() => expect(screen.getByTestId("waited")).toHaveTextContent("true"));
  });

  test("marks isSlow true once waking has taken longer than the slow threshold", async () => {
    vi.useFakeTimers();
    vi.mocked(checkHealth).mockRejectedValue(new Error("still sleeping"));
    render(
      <BackendWakeProvider>
        <Consumer />
      </BackendWakeProvider>,
    );

    fireEvent.click(screen.getByText("Start"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31000);
    });

    expect(screen.getByTestId("slow")).toHaveTextContent("true");
    expect(screen.getByTestId("status")).toHaveTextContent("waking");
  });

  test("startWaking is idempotent - calling it twice does not start a second poll loop", async () => {
    vi.mocked(checkHealth).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <BackendWakeProvider>
        <Consumer />
      </BackendWakeProvider>,
    );

    await user.click(screen.getByText("Start"));
    await user.click(screen.getByText("Start"));

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("awake"));
    expect(checkHealth).toHaveBeenCalledTimes(1);
  });
});
