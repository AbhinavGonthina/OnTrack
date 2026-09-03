export type ResumeBlock =
  | { type: "heading"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string };

/** Splits normalized resume text into headings/bullets/paragraphs for the Formatted
 * Preview tab. Deliberately plain-text-only (no markdown bold/italic/HTML parsing) -
 * this only ever renders text the app itself produced (typed or Gemini-normalized),
 * so there's no need for a full markdown parser or any dangerouslySetInnerHTML. */
export function parseResumeBlocks(text: string): ResumeBlock[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.startsWith("#")) {
        return { type: "heading", text: line.replace(/^#+\s*/, "") };
      }
      if (line.startsWith("-") || line.startsWith("*")) {
        return { type: "bullet", text: line.replace(/^[-*]\s*/, "") };
      }
      return { type: "paragraph", text: line };
    });
}
