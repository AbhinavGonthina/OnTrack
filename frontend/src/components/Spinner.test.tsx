import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  test("renders the given label", () => {
    render(<Spinner label="Loading…" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  test("renders the spin icon", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
