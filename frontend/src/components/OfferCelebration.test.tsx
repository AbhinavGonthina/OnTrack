import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferCelebration } from "./OfferCelebration";

describe("OfferCelebration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("shows the congratulations message", () => {
    render(<OfferCelebration onDone={vi.fn()} />);

    expect(screen.getByText("Congratulations on your offer!")).toBeInTheDocument();
  });

  test("calls onDone when the close button is clicked", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<OfferCelebration onDone={onDone} />);

    await user.click(screen.getByRole("button"));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test("calls onDone automatically after a few seconds", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<OfferCelebration onDone={onDone} />);

    vi.advanceTimersByTime(5000);

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
