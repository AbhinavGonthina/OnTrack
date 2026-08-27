import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

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

describe("ThemeToggle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute("data-theme");
  });

  test("shows a moon (switch to dark) when the system prefers light", async () => {
    mockSystemTheme(false);
    const { container } = render(<ThemeToggle />);

    await waitFor(() => expect(container.querySelector(".lucide-moon")).toBeInTheDocument());
    expect(container.querySelector(".lucide-sun")).not.toBeInTheDocument();
  });

  test("shows a sun (switch to light) when the system prefers dark", async () => {
    mockSystemTheme(true);
    const { container } = render(<ThemeToggle />);

    await waitFor(() => expect(container.querySelector(".lucide-sun")).toBeInTheDocument());
  });

  test("clicking stamps the opposite theme onto the document and swaps the icon", async () => {
    mockSystemTheme(false);
    const user = userEvent.setup();
    const { container } = render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Toggle color theme" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(container.querySelector(".lucide-sun")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Toggle color theme" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(container.querySelector(".lucide-moon")).toBeInTheDocument();
  });
});
