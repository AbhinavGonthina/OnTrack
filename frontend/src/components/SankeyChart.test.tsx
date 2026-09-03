import { beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "@testing-library/react";
import { SankeyChart } from "./SankeyChart";
import { useTheme } from "../context/ThemeContext";
import type { SankeyLink } from "@/lib/types";

vi.mock("../context/ThemeContext", () => ({
  useTheme: vi.fn(),
}));

describe("SankeyChart", () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({ theme: "dark", toggleTheme: vi.fn() });
  });

  test("renders a normal forward-only funnel without throwing", () => {
    const links: SankeyLink[] = [
      { source: "APPLIED", target: "OA", value: 3 },
      { source: "OA", target: "OFFER", value: 1 },
      { source: "OA", target: "REJECTED_OA", value: 2 },
    ];

    expect(() => render(<SankeyChart links={links} />)).not.toThrow();
  });
});
