import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ProductPreview } from "./ProductPreview";
import { ThemeProvider } from "../context/ThemeContext";

// jsdom has no IntersectionObserver; motion's whileInView needs one to mount.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function renderPreview(initialTheme: "light" | "dark" = "dark") {
  render(
    <ThemeProvider initialTheme={initialTheme}>
      <ProductPreview />
    </ThemeProvider>,
  );
}

describe("ProductPreview", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-theme");
  });

  test("layers all three feature screenshots, each with a descriptive alt", async () => {
    renderPreview("dark");

    const images = await screen.findAllByRole("img");
    expect(images).toHaveLength(3);
    expect(screen.getByAltText(/OnTrack dashboard/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Resume strength scored 95/i)).toBeInTheDocument();
    expect(screen.getByAltText(/fit scored 88/i)).toBeInTheDocument();
  });

  test("uses the dark variant of every layer on the dark theme", async () => {
    renderPreview("dark");

    const images = await screen.findAllByRole("img");
    await waitFor(() => {
      for (const img of images) {
        expect(img.getAttribute("src")).toContain("-dark.png");
      }
    });
  });

  test("swaps every layer to its light variant on the light theme", async () => {
    renderPreview("light");

    const images = await screen.findAllByRole("img");
    await waitFor(() => {
      for (const img of images) {
        expect(img.getAttribute("src")).toContain("-light.png");
      }
    });
    // Every layer must swap, not just the dashboard behind them.
    const srcs = images.map((i) => i.getAttribute("src") ?? "");
    expect(srcs.some((s) => s.includes("dashboard-light"))).toBe(true);
    expect(srcs.some((s) => s.includes("strength-card-light"))).toBe(true);
    expect(srcs.some((s) => s.includes("fit-card-light"))).toBe(true);
  });
});
