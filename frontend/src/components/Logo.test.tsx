import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo } from "./Logo";

describe("Logo", () => {
  test("renders the OnTrack mark", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "OnTrack" })).toBeInTheDocument();
  });
});
