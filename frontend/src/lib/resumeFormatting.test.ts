import { describe, expect, test } from "vitest";
import { parseResumeBlocks } from "./resumeFormatting";

describe("parseResumeBlocks", () => {
  test("parses headings, bullets, and paragraphs", () => {
    const text = "# Experience\n- Built a thing\n* Shipped another thing\nJust a plain line";

    expect(parseResumeBlocks(text)).toEqual([
      { type: "heading", text: "Experience" },
      { type: "bullet", text: "Built a thing" },
      { type: "bullet", text: "Shipped another thing" },
      { type: "paragraph", text: "Just a plain line" },
    ]);
  });

  test("skips blank lines", () => {
    const text = "# Heading\n\n\nParagraph";

    expect(parseResumeBlocks(text)).toEqual([
      { type: "heading", text: "Heading" },
      { type: "paragraph", text: "Paragraph" },
    ]);
  });

  test("returns an empty array for blank input", () => {
    expect(parseResumeBlocks("   \n  \n")).toEqual([]);
  });
});
