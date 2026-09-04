import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiUsageBadge } from "./AiUsageBadge";
import { useAiUsage } from "../context/AiUsageContext";

vi.mock("../context/AiUsageContext", () => ({
  useAiUsage: vi.fn(),
}));

describe("AiUsageBadge", () => {
  test("renders nothing when usage data isn't available yet", () => {
    vi.mocked(useAiUsage).mockReturnValue({ aiUsage: null, refresh: vi.fn() });

    const { container } = render(<AiUsageBadge />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders the remaining/limit count when available", () => {
    vi.mocked(useAiUsage).mockReturnValue({ aiUsage: { remaining: 5, limit: 20 }, refresh: vi.fn() });

    render(<AiUsageBadge />);

    expect(screen.getByText("5 / 20 AI calls left today")).toBeInTheDocument();
  });
});
