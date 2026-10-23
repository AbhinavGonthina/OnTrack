import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURES = resolve(import.meta.dirname, "fixtures");

/** Reads a saved fixture, e.g. loadFixture("jsonld/lever-palantir.html"). */
export function loadFixture(relativePath: string): string {
  return readFileSync(resolve(FIXTURES, relativePath), "utf8");
}

/**
 * Parses fixture HTML into a Document. The readers take a Document precisely so
 * they can be exercised like this, with no browser and no extension runtime.
 */
export function parseFixture(relativePath: string): Document {
  return new DOMParser().parseFromString(
    loadFixture(relativePath),
    "text/html",
  );
}

/** Parses an inline HTML string, for small hand-written edge cases. */
export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}
