import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, StatusBadge } from "./Badge";

describe("Badge", () => {
  test("renders the given label", () => {
    render(<Badge label="Cached" color="#7c3aed" />);
    expect(screen.getByText("Cached")).toBeInTheDocument();
  });

  test("applies the given color as text color", () => {
    render(<Badge label="Cached" color="#7c3aed" />);
    expect(screen.getByText("Cached")).toHaveStyle({ color: "#7c3aed" });
  });
});

describe("StatusBadge", () => {
  test("renders the humanized label for a given status", () => {
    render(<StatusBadge status="PHONE_SCREEN" />);
    expect(screen.getByText("Phone Screen")).toBeInTheDocument();
  });

  test("renders the fixed status-good color for OFFER", () => {
    render(<StatusBadge status="OFFER" />);
    expect(screen.getByText("Offer")).toHaveStyle({ color: "#059669" });
  });

  test("renders the fixed status-critical color for REJECTED", () => {
    render(<StatusBadge status="REJECTED" />);
    expect(screen.getByText("Rejected")).toHaveStyle({ color: "#e11d48" });
  });
});
