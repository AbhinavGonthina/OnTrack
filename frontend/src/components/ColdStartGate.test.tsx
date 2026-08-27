import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ColdStartGate } from "./ColdStartGate";
import { useBackendWake } from "../context/BackendWakeContext";

vi.mock("../context/BackendWakeContext", () => ({
  useBackendWake: vi.fn(),
}));

describe("ColdStartGate", () => {
  test("calls startWaking on mount", () => {
    const startWaking = vi.fn();
    vi.mocked(useBackendWake).mockReturnValue({
      status: "waking",
      isSlow: false,
      startWaking,
      waitUntilAwake: vi.fn(),
    });

    render(
      <ColdStartGate>
        <p>Protected content</p>
      </ColdStartGate>,
    );

    expect(startWaking).toHaveBeenCalledTimes(1);
  });

  test("shows the waking-up notice instead of children while not awake", () => {
    vi.mocked(useBackendWake).mockReturnValue({
      status: "waking",
      isSlow: false,
      startWaking: vi.fn(),
      waitUntilAwake: vi.fn(),
    });

    render(
      <ColdStartGate>
        <p>Protected content</p>
      </ColdStartGate>,
    );

    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByText(/Waking up the server/)).toBeInTheDocument();
  });

  test("renders children once the backend is awake", () => {
    vi.mocked(useBackendWake).mockReturnValue({
      status: "awake",
      isSlow: false,
      startWaking: vi.fn(),
      waitUntilAwake: vi.fn(),
    });

    render(
      <ColdStartGate>
        <p>Protected content</p>
      </ColdStartGate>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText(/Waking up the server/)).not.toBeInTheDocument();
  });
});
