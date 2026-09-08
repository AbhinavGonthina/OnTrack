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

function mockSystemTheme(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: prefersDark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

function renderPreview() {
  render(
    <ThemeProvider>
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
    mockSystemTheme(true);
    renderPreview();

    const images = await screen.findAllByRole("img");
    expect(images).toHaveLength(3);
    expect(screen.getByAltText(/OnTrack dashboard/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Resume strength scored 95/i)).toBeInTheDocument();
    expect(screen.getByAltText(/fit scored 88/i)).toBeInTheDocument();
  });

  test("uses the dark variant of every layer when the system prefers dark", async () => {
    mockSystemTheme(true);
    renderPreview();

    const images = await screen.findAllByRole("img");
    await waitFor(() => {
      for (const img of images) {
        expect(img.getAttribute("src")).toContain("-dark.png");
      }
    });
  });

  test("swaps every layer to its light variant once the system prefers light", async () => {
    mockSystemTheme(false);
    renderPreview();

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
