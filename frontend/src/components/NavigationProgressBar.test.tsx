import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { usePathname, useSearchParams } from "next/navigation";
import { NavigationProgressBar, startNavigationProgress } from "./NavigationProgressBar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

describe("NavigationProgressBar", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/current");
    vi.mocked(usePathname).mockReturnValue("/current");
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>);
  });

  test("renders nothing until a navigation is triggered", () => {
    render(<NavigationProgressBar />);
    expect(screen.queryByTestId("navigation-progress-bar")).not.toBeInTheDocument();
  });

  test("shows the bar when an internal link to a different page is clicked, hides it once the route changes", async () => {
    const { rerender } = render(<NavigationProgressBar />);

    const link = document.createElement("a");
    link.href = "/other";
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await waitFor(() => expect(screen.getByTestId("navigation-progress-bar")).toBeInTheDocument());

    vi.mocked(usePathname).mockReturnValue("/other");
    rerender(<NavigationProgressBar />);

    await waitFor(() => expect(screen.queryByTestId("navigation-progress-bar")).not.toBeInTheDocument());

    document.body.removeChild(link);
  });

  test("ignores clicks on links to the current page", async () => {
    render(<NavigationProgressBar />);

    const link = document.createElement("a");
    link.href = "/current";
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.queryByTestId("navigation-progress-bar")).not.toBeInTheDocument();

    document.body.removeChild(link);
  });

  test("shows the bar when startNavigationProgress() is called, e.g. before a router.push() redirect", async () => {
    render(<NavigationProgressBar />);

    startNavigationProgress();

    await waitFor(() => expect(screen.getByTestId("navigation-progress-bar")).toBeInTheDocument());
  });

  test("ignores clicks on external links", async () => {
    render(<NavigationProgressBar />);

    const link = document.createElement("a");
    link.href = "https://example.com/somewhere";
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.queryByTestId("navigation-progress-bar")).not.toBeInTheDocument();

    document.body.removeChild(link);
  });
});
