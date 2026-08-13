import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  test("renders its children", () => {
    render(<Button>Try Demo</Button>);
    expect(screen.getByRole("button", { name: "Try Demo" })).toBeInTheDocument();
  });

  test("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Sign Up</Button>);

    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("does not call onClick when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Sign Up
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  test("applies the secondary variant class", () => {
    render(<Button variant="secondary">Log In</Button>);
    expect(screen.getByRole("button", { name: "Log In" })).toHaveClass("border");
  });
});
