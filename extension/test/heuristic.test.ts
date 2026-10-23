import { describe, expect, it } from "vitest";
import {
  heuristicReader,
  largestTextBlock,
  splitTitle,
} from "../src/extract/readers/heuristic";
import { parseHtml } from "./helpers";

describe("splitTitle", () => {
  it("splits the Role at Company pattern", () => {
    expect(splitTitle("Senior Engineer at Acme")).toEqual({
      role: "Senior Engineer",
      company: "Acme",
    });
  });

  it("splits the Role @ Company pattern", () => {
    expect(splitTitle("Senior Engineer @ Acme")).toEqual({
      role: "Senior Engineer",
      company: "Acme",
    });
  });

  it("splits the Role - Company pattern", () => {
    expect(splitTitle("Senior Engineer - Acme")).toEqual({
      role: "Senior Engineer",
      company: "Acme",
    });
  });

  it("keeps a hyphenated role intact by splitting on the last separator", () => {
    expect(splitTitle("Software Engineer - Backend - Acme")).toEqual({
      role: "Software Engineer - Backend",
      company: "Acme",
    });
  });

  it("strips a trailing site name before splitting", () => {
    expect(splitTitle("Senior Engineer at Acme | Careers")).toEqual({
      role: "Senior Engineer",
      company: "Acme",
    });
  });

  it("returns the whole title as the role when there is no separator", () => {
    expect(splitTitle("Careers")).toEqual({ role: "Careers", company: null });
  });
});

describe("largestTextBlock", () => {
  it("picks the block holding the body text", () => {
    const doc = parseHtml(`<html><body>
      <nav>Home About Careers Contact</nav>
      <main><div id="jd">${"The role involves building things. ".repeat(20)}</div></main>
      <footer>Copyright</footer>
    </body></html>`);

    expect(largestTextBlock(doc)?.id).toBe("jd");
  });

  it("skips navigation and footers", () => {
    const doc = parseHtml(`<html><body>
      <nav><div>${"Navigation link text here. ".repeat(40)}</div></nav>
      <main><div id="jd">${"Real description content. ".repeat(20)}</div></main>
    </body></html>`);

    expect(largestTextBlock(doc)?.id).toBe("jd");
  });

  it("returns null when there is no substantial text", () => {
    expect(largestTextBlock(parseHtml("<html><body><p>Hi</p></body></html>"))).toBeNull();
  });
});

describe("heuristicReader", () => {
  it("reads role and company from og:title on an unknown careers page", () => {
    const doc = parseHtml(`<html><head>
      <meta property="og:title" content="Platform Engineer at Globex" />
      </head><body><div>${"Description text. ".repeat(30)}</div></body></html>`);

    const result = heuristicReader.read(doc, new URL("https://globex.com/careers/1"));

    expect(result?.role).toBe("Platform Engineer");
    expect(result?.company).toBe("Globex");
    // Everything here is inferred, so it must say so.
    expect(result?.confidence).toBe("low");
    expect(result?.source).toBe("heuristic");
  });

  it("falls back to og:site_name for the company", () => {
    const doc = parseHtml(`<html><head>
      <title>Platform Engineer</title>
      <meta property="og:site_name" content="Globex" />
      </head><body><h1>Platform Engineer</h1></body></html>`);

    const result = heuristicReader.read(doc, new URL("https://globex.com/careers/1"));

    expect(result?.role).toBe("Platform Engineer");
    expect(result?.company).toBe("Globex");
  });

  it("falls back to the h1 when the title says nothing useful", () => {
    const doc = parseHtml(
      "<html><head><title></title></head><body><h1>Site Reliability Engineer</h1></body></html>",
    );

    const result = heuristicReader.read(doc, new URL("https://globex.com/careers/1"));
    expect(result?.role).toBe("Site Reliability Engineer");
  });

  it("returns null on a page with nothing at all", () => {
    const doc = parseHtml("<html><head></head><body></body></html>");
    expect(heuristicReader.read(doc, new URL("https://x.com"))).toBeNull();
  });

  it("matches every URL, since it is the last resort", () => {
    expect(heuristicReader.matches(new URL("https://anything.example"))).toBe(true);
  });
});
