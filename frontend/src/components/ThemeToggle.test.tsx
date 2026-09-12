import { afterEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider } from "../context/ThemeContext";
import { THEME_COOKIE } from "../lib/theme";

function renderToggle(initialTheme: "light" | "dark") {
  return render(
    <ThemeProvider initialTheme={initialTheme}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

function themeCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${THEME_COOKIE}=`))
    ?.split("=")[1];
}

describe("ThemeToggle", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
  });

  // The icon advertises the destination, not the current state.
  test("shows a moon to offer dark while on light", () => {
    const { container } = renderToggle("light");

    expect(container.querySelector(".lucide-moon")).toBeInTheDocument();
    expect(container.querySelector(".lucide-sun")).not.toBeInTheDocument();
  });

  test("shows a sun to offer light while on dark", () => {
    const { container } = renderToggle("dark");

    expect(container.querySelector(".lucide-sun")).toBeInTheDocument();
    expect(container.querySelector(".lucide-moon")).not.toBeInTheDocument();
  });

  // The attribute has to change on click rather than waiting for the next server render, or the
  // toggle would appear to do nothing until a refresh.
  test("stamps the opposite theme onto the document immediately and swaps the icon", async () => {
    const user = userEvent.setup();
    const { container } = renderToggle("light");

    await user.click(screen.getByRole("button", { name: "Toggle color theme" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(container.querySelector(".lucide-sun")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Toggle color theme" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(container.querySelector(".lucide-moon")).toBeInTheDocument();
  });

  // The whole point: without the cookie the choice dies on refresh, and localStorage is ruled
  // out by SPEC.md.
  test("writes the choice to a cookie so it survives a refresh", async () => {
    const user = userEvent.setup();
    renderToggle("dark");

    await user.click(screen.getByRole("button", { name: "Toggle color theme" }));
    expect(themeCookie()).toBe("light");

    await user.click(screen.getByRole("button", { name: "Toggle color theme" }));
    expect(themeCookie()).toBe("dark");
  });
});
