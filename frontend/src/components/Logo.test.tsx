import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  test("renders the OT monogram", () => {
    render(<Logo />);
    expect(screen.getByText("OT")).toBeInTheDocument();
  });
});
