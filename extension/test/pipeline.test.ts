import { describe, expect, it, vi } from "vitest";
import { runPipeline } from "../src/extract/pipeline";
import type { BoardReader, Reader, ReaderResult } from "../src/extract/types";
import { loadFixture, parseFixture, parseHtml } from "./helpers";

const noFetch = vi.fn(async () => null);
const emptyDoc = () => parseHtml("<html><head></head><body></body></html>");

/** A stub page reader that always returns what it is given. */
function pageReader(
  name: ReaderResult["source"],
  result: Partial<ReaderResult> | null,
  calls?: string[],
): Reader {
  return {
    name,
    matches: () => true,
    read: () => {
      calls?.push(name);
      return result
        ? ({ source: name, confidence: "high", ...result } as ReaderResult)
        : null;
    },
  };
}

function boardReader(
  name: ReaderResult["source"],
  result: Partial<ReaderResult> | null,
): BoardReader {
  return {
    name,
    matches: () => true,
    read: async () =>
      result
        ? ({ source: name, confidence: "high", ...result } as ReaderResult)
        : null,
  };
}

describe("pipeline ordering", () => {
  it("stops once it has both a company and a role", async () => {
    const calls: string[] = [];
    await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [
        pageReader("jsonld", { company: "Acme", role: "Engineer" }, calls),
        pageReader("heuristic", { company: "Wrong", role: "Wrong" }, calls),
      ],
      boardReaders: [],
    });

    expect(calls).toEqual(["jsonld"]);
  });

  it("keeps going while a field is still missing", async () => {
    const calls: string[] = [];
    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [
        pageReader("jsonld", { role: "Engineer" }, calls),
        pageReader("heuristic", { company: "Acme" }, calls),
      ],
      boardReaders: [],
    });

    expect(calls).toEqual(["jsonld", "heuristic"]);
    expect(result.role).toBe("Engineer");
    expect(result.company).toBe("Acme");
  });

  it("lets a later reader fill a gap but never overwrite an earlier one", async () => {
    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [
        pageReader("jsonld", { role: "Staff Engineer" }),
        pageReader("heuristic", { role: "Engineer", company: "Acme" }),
      ],
      boardReaders: [],
    });

    // The better reader's role survives.
    expect(result.role).toBe("Staff Engineer");
    expect(result.company).toBe("Acme");
  });

  it("runs board readers before page readers", async () => {
    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://jobs.lever.co/acme/1"),
      pageFetchJson: noFetch,
      boardFetchJson: noFetch,
      boardReaders: [boardReader("lever", { role: "From the API" })],
      pageReaders: [pageReader("heuristic", { role: "From the page", company: "Acme" })],
    });

    expect(result.role).toBe("From the API");
  });

  it("survives a reader that throws", async () => {
    const throwing: Reader = {
      name: "jsonld",
      matches: () => true,
      read: () => {
        throw new Error("boom");
      },
    };

    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [throwing, pageReader("heuristic", { role: "Engineer", company: "Acme" })],
      boardReaders: [],
    });

    expect(result.role).toBe("Engineer");
  });

  it("skips readers whose matches() says no", async () => {
    const calls: string[] = [];
    const declining: Reader = {
      name: "linkedin",
      matches: () => false,
      read: () => {
        calls.push("linkedin");
        return null;
      },
    };

    await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [declining, pageReader("heuristic", { role: "R", company: "C" }, calls)],
      boardReaders: [],
    });

    expect(calls).toEqual(["heuristic"]);
  });

  it("does not run board readers when no board fetch is available", async () => {
    const board = boardReader("lever", { role: "API role", company: "Acme" });
    const spy = vi.spyOn(board, "read");

    await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://jobs.lever.co/acme/1"),
      pageFetchJson: noFetch,
      boardReaders: [board],
      pageReaders: [],
    });

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("pipeline result", () => {
  it("names the source of whichever reader supplied the description", async () => {
    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [
        pageReader("jsonld", { role: "Engineer" }),
        pageReader("heuristic", { company: "Acme", description: "The text." }),
      ],
      boardReaders: [],
    });

    expect(result.description).toBe("The text.");
    expect(result.source).toBe("heuristic");
  });

  it("truncates an over-long description and says so", async () => {
    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [
        pageReader("jsonld", {
          role: "Engineer",
          company: "Acme",
          description: "x".repeat(25_000),
        }),
      ],
      boardReaders: [],
    });

    expect(result.description?.length).toBeLessThanOrEqual(20_000);
    expect(result.notes).toContain(
      "Description shortened to fit OnTrack's 20,000 character limit.",
    );
  });

  it("leaves a description under the limit alone and adds no note", async () => {
    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [
        pageReader("jsonld", { role: "R", company: "C", description: "Short." }),
      ],
      boardReaders: [],
    });

    expect(result.notes).toEqual([]);
  });

  it("falls back to the canonicalized page URL when no reader supplies one", async () => {
    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/careers/1/?utm_source=x#top"),
      pageFetchJson: noFetch,
      pageReaders: [],
      boardReaders: [],
    });

    expect(result.url).toBe("https://acme.com/careers/1");
  });

  it("returns an empty result rather than throwing when nothing reads", async () => {
    const result = await runPipeline({
      doc: emptyDoc(),
      url: new URL("https://acme.com/j/1"),
      pageFetchJson: noFetch,
      pageReaders: [],
      boardReaders: [],
    });

    expect(result.company).toBeNull();
    expect(result.role).toBeNull();
    expect(result.description).toBeNull();
    expect(result.confidence).toBe("low");
  });
});

describe("pipeline with the real readers", () => {
  it("reads a real Lever page through JSON-LD when no board fetch is available", async () => {
    const result = await runPipeline({
      doc: parseFixture("jsonld/lever-palantir.html"),
      url: new URL(
        "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd",
      ),
      pageFetchJson: noFetch,
    });

    expect(result.role).toBe("Administrative Business Partner");
    expect(result.company).toBe("Palantir Technologies");
    expect(result.source).toBe("jsonld");
  });

  it("prefers the Lever API over the page's JSON-LD", async () => {
    const posting = JSON.parse(
      loadFixture("lever/palantir-swe-new-grad.json"),
    ) as unknown;

    const result = await runPipeline({
      doc: parseFixture("jsonld/lever-palantir.html"),
      url: new URL(
        "https://jobs.lever.co/palantir/4abf26b4-795c-420a-bf22-1ab98db268b4",
      ),
      pageFetchJson: noFetch,
      boardFetchJson: vi.fn(async () => posting),
    });

    expect(result.role).toBe("Software Engineer, New Grad - Infrastructure");
    expect(result.source).toBe("lever");
  });

  it("fills Ashby's missing company from the page", async () => {
    const board = JSON.parse(loadFixture("ashby/linear-fullstack.json")) as unknown;
    const doc = parseHtml(
      '<html><head><meta property="og:site_name" content="Linear" /></head><body></body></html>',
    );

    const result = await runPipeline({
      doc,
      url: new URL(
        "https://jobs.ashbyhq.com/linear/d3bc1ced-3ce4-4086-a050-555055dbb1ff",
      ),
      pageFetchJson: noFetch,
      boardFetchJson: vi.fn(async () => board),
    });

    // Role and description from the API, company from the page.
    expect(result.role).toBe("Senior / Staff Fullstack Engineer");
    expect(result.company).toBe("Linear");
    expect(result.source).toBe("ashby");
  });

  it("reads a real LinkedIn page end to end", async () => {
    const result = await runPipeline({
      doc: parseFixture("linkedin/affirm-swe-fullstack.html"),
      url: new URL("https://www.linkedin.com/jobs/view/4479305237"),
      pageFetchJson: noFetch,
    });

    expect(result.role).toBe("Software Engineer I, Fullstack (Search)");
    expect(result.company).toBe("Affirm");
    expect(result.url).toBe("https://www.linkedin.com/jobs/view/4479305237/");
  });
});
