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

describe("ProductPreview", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-theme");
  });

  test("shows the dashboard screenshot with a descriptive alt", async () => {
    mockSystemTheme(true);
    render(
      <ThemeProvider>
        <ProductPreview />
      </ThemeProvider>,
    );

    const img = await screen.findByAltText(/OnTrack dashboard/i);
    await waitFor(() => expect(img.getAttribute("src")).toContain("dashboard-dark.png"));
  });

  test("swaps to the light screenshot once the system prefers light", async () => {
    mockSystemTheme(false);
    render(
      <ThemeProvider>
        <ProductPreview />
      </ThemeProvider>,
    );

    const img = await screen.findByAltText(/OnTrack dashboard/i);
    await waitFor(() => expect(img.getAttribute("src")).toContain("dashboard-light.png"));
  });
});
