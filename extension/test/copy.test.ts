import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { COPY, SOURCE_CAPTION } from "../src/copy";

/**
 * Appendix B: no mid-sentence em dashes or en dashes in anything a user can
 * read. They read as AI-written, and they are easy to reintroduce by accident
 * (an editor's smart punctuation will do it for you), so this is enforced
 * rather than remembered.
 *
 * The check covers the extension's own source and the backend's new
 * user-facing messages.
 */

const EM_DASH = "—";
const EN_DASH = "–";

const SRC = resolve(import.meta.dirname, "../src");
const BACKEND = resolve(import.meta.dirname, "../../backend/src/main/java/com/ontrack/backend");

function walk(dir: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...walk(full, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Only strings and JSX text can reach a user. A dash inside a code comment is
 * invisible to them, so flagging it would be noise that trains people to
 * ignore this test.
 */
function userFacingLines(source: string): Array<{ line: number; text: string }> {
  const lines = source.split(/\r?\n/);
  const offenders: Array<{ line: number; text: string }> = [];

  let inBlockComment = false;
  lines.forEach((text, index) => {
    let line = text;

    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) return;
      line = line.slice(end + 2);
      inBlockComment = false;
    }

    const blockStart = line.indexOf("/*");
    if (blockStart !== -1) {
      const end = line.indexOf("*/", blockStart);
      if (end === -1) {
        line = line.slice(0, blockStart);
        inBlockComment = true;
      } else {
        line = line.slice(0, blockStart) + line.slice(end + 2);
      }
    }

    const lineComment = line.indexOf("//");
    if (lineComment !== -1) line = line.slice(0, lineComment);

    // An explicit, visible opt-out for the handful of places a dash is data
    // rather than copy: the HTML entity table and a regex matching separators
    // in other sites' page titles.
    if (text.includes("copy-check-ignore")) return;

    if (line.includes(EM_DASH) || line.includes(EN_DASH)) {
      offenders.push({ line: index + 1, text: text.trim() });
    }
  });

  return offenders;
}

describe("copy has no em dashes or en dashes", () => {
  it("in the copy module itself", () => {
    const plain = [...Object.values(COPY), ...Object.values(SOURCE_CAPTION)]
      .filter((value): value is string => typeof value === "string");

    // The templated strings get real arguments, because a dash could just as
    // easily hide in one of those.
    const rendered = [
      COPY.useAi(3),
      COPY.useAi(0),
      COPY.characterCount(1234, 20000),
      COPY.errorRateLimited(30),
      COPY.errorRateLimited(undefined),
    ];

    for (const value of [...plain, ...rendered]) {
      expect(value, `"${value}"`).not.toContain(EM_DASH);
      expect(value, `"${value}"`).not.toContain(EN_DASH);
    }
  });

  it("in any extension source file", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC, [".ts", ".tsx"])) {
      for (const hit of userFacingLines(readFileSync(file, "utf8"))) {
        offenders.push(`${file.replace(SRC, "src")}:${hit.line}  ${hit.text}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("in the backend's new user-facing messages", () => {
    const files = [
      "dto/ApplicationLookupResponse.java",
      "service/ApplicationUrlCanonicalizer.java",
      "exception/InvalidApplicationUrlException.java",
    ].map((relative) => resolve(BACKEND, relative));

    const offenders: string[] = [];
    for (const file of files) {
      let source: string;
      try {
        source = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      // Java string literals only.
      for (const [index, line] of source.split(/\r?\n/).entries()) {
        const strings = line.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
        for (const literal of strings) {
          if (literal.includes(EM_DASH) || literal.includes(EN_DASH)) {
            offenders.push(`${file}:${index + 1}  ${literal}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("copy style", () => {
  it("uses verbs on the buttons", () => {
    expect(COPY.save).toBe("Save");
    expect(COPY.openInOnTrack).toMatch(/^Open/);
    expect(COPY.fillItInMyself).toMatch(/^Fill/);
    expect(COPY.viewInOnTrack).toMatch(/^View/);
  });

  it("states the cost before an AI call", () => {
    expect(COPY.useAi(3)).toContain("uses 1 of your 3 AI calls left today");
  });

  it("labels AI output as needing a check", () => {
    expect(SOURCE_CAPTION.ai).toBe("Read with AI, please double check");
  });

  it("names every extraction source", () => {
    for (const [source, caption] of Object.entries(SOURCE_CAPTION)) {
      expect(caption, source).toBeTruthy();
    }
  });
});
