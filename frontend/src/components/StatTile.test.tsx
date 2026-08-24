import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Briefcase } from "lucide-react";
import { StatTile } from "./StatTile";

describe("StatTile", () => {
  test("renders the label and value", () => {
    render(<StatTile icon={Briefcase} label="Applications" value="12" />);
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
