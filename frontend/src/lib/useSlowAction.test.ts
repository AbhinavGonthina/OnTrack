import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSlowAction } from "./useSlowAction";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSlowAction", () => {
  test("stays false while the action is not running", () => {
    const { result } = renderHook(() => useSlowAction(false, 1000));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current).toBe(false);
  });

  test("stays false for a request that finishes inside the threshold", () => {
    const { result, rerender } = renderHook(({ running }) => useSlowAction(running, 1000), {
      initialProps: { running: true },
    });

    act(() => {
      vi.advanceTimersByTime(900);
    });
    rerender({ running: false });

    expect(result.current).toBe(false);
  });

  test("flips to true once the action outlasts the threshold", () => {
    const { result } = renderHook(() => useSlowAction(true, 1000));

    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1001);
    });

    expect(result.current).toBe(true);
  });

  // Without this, a second upload in the same session would inherit the first one's "slow"
  // state and immediately claim the server is asleep when it is already awake.
  test("resets when the action finishes so the next one starts clean", () => {
    const { result, rerender } = renderHook(({ running }) => useSlowAction(running, 1000), {
      initialProps: { running: true },
    });

    act(() => {
      vi.advanceTimersByTime(1001);
    });
    expect(result.current).toBe(true);

    rerender({ running: false });
    expect(result.current).toBe(false);

    rerender({ running: true });
    expect(result.current).toBe(false);
  });
});
