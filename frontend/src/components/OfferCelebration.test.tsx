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

  // The auto-dismiss is pushed out of reach rather than faked. On the real 5s timer this test
  // raced the component: under parallel load a click could take longer than 5s, the timer fired
  // too, and onDone was called twice. Fake timers are not the fix here, they hang the confetti
  // animation and the portal, so the clock stays real and the timeout is simply never reached.
  test("calls onDone when the close button is clicked", async () => {
    const onDone = vi.fn();
    const user = userEvent.setup();
    render(<OfferCelebration onDone={onDone} autoDismissMs={10 * 60 * 1000} />);

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
