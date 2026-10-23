import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrowserExtensionCard } from "./BrowserExtensionCard";

describe("BrowserExtensionCard", () => {
  it("says what the extension does", () => {
    render(<BrowserExtensionCard />);

    expect(
      screen.getByRole("heading", { name: "Browser extension" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Log a job straight from its posting/)).toBeInTheDocument();
  });

  it("gives the three install steps in order", () => {
    render(<BrowserExtensionCard />);

    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent(/Download/);
    expect(steps[1]).toHaveTextContent(/Developer mode/);
    expect(steps[2]).toHaveTextContent(/Load unpacked/);
  });

  it("links to the extension folder and its README on GitHub", () => {
    render(<BrowserExtensionCard />);

    expect(screen.getByRole("link", { name: /extension folder/i })).toHaveAttribute(
      "href",
      "https://github.com/AbhinavGonthina/OnTrack/tree/main/extension",
    );
    expect(
      screen.getByRole("link", { name: /Full setup instructions/i }),
    ).toHaveAttribute(
      "href",
      "https://github.com/AbhinavGonthina/OnTrack/blob/main/extension/README.md",
    );
  });

  it("opens external links safely in a new tab", () => {
    render(<BrowserExtensionCard />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    }
  });
});
