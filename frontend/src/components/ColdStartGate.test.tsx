import { afterEach, describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ColdStartGate } from "./ColdStartGate";
import { useBackendWake } from "../context/BackendWakeContext";

vi.mock("../context/BackendWakeContext", () => ({
  useBackendWake: vi.fn(),
}));

function mockWake(status: "idle" | "waking" | "awake", startWaking = vi.fn()) {
  vi.mocked(useBackendWake).mockReturnValue({
    status,
    isSlow: false,
    startWaking,
    waitUntilAwake: vi.fn(),
  });
  return startWaking;
}

/** The gate's stages are purely time-based, so every assertion past the first needs the clock. */
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ColdStartGate", () => {
  test("calls startWaking on mount", () => {
    const startWaking = mockWake("waking");

    render(
      <ColdStartGate>
        <p>Protected content</p>
      </ColdStartGate>,
    );

    expect(startWaking).toHaveBeenCalledTimes(1);
  });

  // The whole point of the staging: the health check usually answers in ~200ms now, and flashing
  // "Waking up the server" plus a trivia quiz at every visitor advertises a problem that isn't
  // happening.
  test("shows nothing at all while a warm health check is still in flight", () => {
    vi.useFakeTimers();
    mockWake("waking");

    render(
      <ColdStartGate>
        <p>Protected content</p>
      </ColdStartGate>,
    );

    advance(300);
    expect(screen.queryByText(/Waking up the server/)).not.toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  test("falls back to a plain spinner once the wait is noticeable", () => {
    vi.useFakeTimers();
    mockWake("waking");

    render(
      <ColdStartGate>
        <p>Protected content</p>
      </ColdStartGate>,
    );

    advance(1000);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText(/Waking up the server/)).not.toBeInTheDocument();
  });

  test("shows the full waking-up notice only once it is genuinely a cold boot", () => {
    vi.useFakeTimers();
    mockWake("waking");

    render(
      <ColdStartGate>
        <p>Protected content</p>
      </ColdStartGate>,
    );

    advance(3500);
    expect(screen.getByText(/Waking up the server/)).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  test("renders children once the backend is awake", () => {
    mockWake("awake");

    render(
      <ColdStartGate>
        <p>Protected content</p>
      </ColdStartGate>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText(/Waking up the server/)).not.toBeInTheDocument();
  });
});
