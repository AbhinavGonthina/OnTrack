import { describe, expect, it, vi } from "vitest";
import {
  ashbyReader,
  companyFromAshbyDoc,
  parseAshbyUrl,
} from "../src/extract/readers/ashby";
import { loadFixture, parseHtml } from "./helpers";

const FULLSTACK_ID = "d3bc1ced-3ce4-4086-a050-555055dbb1ff";
const SECURITY_ID = "493579ff-3198-420f-ab6a-b8bb971cb513";
const BOARD_API = "https://api.ashbyhq.com/posting-api/job-board/linear";

function serveBoard(fixture: string) {
  return vi.fn(async (url: string) =>
    url === BOARD_API ? (JSON.parse(loadFixture(fixture)) as unknown) : null,
  );
}

describe("parseAshbyUrl", () => {
  it("reads a posting URL", () => {
    expect(
      parseAshbyUrl(new URL(`https://jobs.ashbyhq.com/linear/${FULLSTACK_ID}`)),
    ).toEqual({ org: "linear", jobId: FULLSTACK_ID });
  });

  it("reads a posting URL with the application suffix", () => {
    expect(
      parseAshbyUrl(
        new URL(`https://jobs.ashbyhq.com/linear/${FULLSTACK_ID}/application`),
      ),
    ).toEqual({ org: "linear", jobId: FULLSTACK_ID });
  });

  it("does not treat the org listing page as a posting", () => {
    expect(parseAshbyUrl(new URL("https://jobs.ashbyhq.com/linear"))).toBeNull();
  });

  it("ignores a non-Ashby host", () => {
    expect(parseAshbyUrl(new URL("https://example.com/a/b"))).toBeNull();
  });
});

describe("companyFromAshbyDoc", () => {
  it("prefers og:site_name", () => {
    const doc = parseHtml(
      '<html><head><meta property="og:site_name" content="Linear" /><title>x</title></head></html>',
    );
    expect(companyFromAshbyDoc(doc, "linear")).toBe("Linear");
  });

  it("falls back to the Role @ Company title pattern", () => {
    const doc = parseHtml(
      "<html><head><title>Senior Engineer @ Linear</title></head></html>",
    );
    expect(companyFromAshbyDoc(doc, "linear")).toBe("Linear");
  });

  it("falls back to the org slug when the page says nothing", () => {
    const doc = parseHtml("<html><head></head><body></body></html>");
    expect(companyFromAshbyDoc(doc, "acme-corp")).toBe("Acme Corp");
  });
});

describe("ashbyReader against real captured API responses", () => {
  it("picks the posting whose id matches the URL", async () => {
    const result = await ashbyReader.read(
      new URL(`https://jobs.ashbyhq.com/linear/${FULLSTACK_ID}`),
      serveBoard("ashby/linear-fullstack.json"),
    );

    expect(result?.role).toBe("Senior / Staff Fullstack Engineer");
    expect(result?.source).toBe("ashby");
    expect(result?.url).toBe(`https://jobs.ashbyhq.com/linear/${FULLSTACK_ID}`);
    expect(result?.description).toContain("Linear");
  });

  it("reads a different posting from the same board shape", async () => {
    const result = await ashbyReader.read(
      new URL(`https://jobs.ashbyhq.com/linear/${SECURITY_ID}`),
      serveBoard("ashby/linear-security-engineer.json"),
    );

    expect(result?.role).toBe("Senior / Staff Security Engineer");
    expect(result?.description?.length).toBeGreaterThan(500);
  });

  it("leaves company unset, because the API never carries one", async () => {
    const result = await ashbyReader.read(
      new URL(`https://jobs.ashbyhq.com/linear/${FULLSTACK_ID}`),
      serveBoard("ashby/linear-fullstack.json"),
    );

    // The pipeline fills this in from the page instead.
    expect(result?.company).toBeUndefined();
  });

  it("returns plain text with no HTML in it", async () => {
    const result = await ashbyReader.read(
      new URL(`https://jobs.ashbyhq.com/linear/${FULLSTACK_ID}`),
      serveBoard("ashby/linear-fullstack.json"),
    );

    expect(result?.description).not.toContain("<p");
    expect(result?.description).not.toContain("style=");
  });

  it("works from the application page the user lands on after applying", async () => {
    const result = await ashbyReader.read(
      new URL(`https://jobs.ashbyhq.com/linear/${FULLSTACK_ID}/application`),
      serveBoard("ashby/linear-fullstack.json"),
    );

    expect(result?.role).toBe("Senior / Staff Fullstack Engineer");
  });

  it("returns null when the id is not on the board", async () => {
    const result = await ashbyReader.read(
      new URL("https://jobs.ashbyhq.com/linear/00000000-0000-0000-0000-000000000000"),
      serveBoard("ashby/linear-fullstack.json"),
    );
    expect(result).toBeNull();
  });

  it("returns null when the API call fails", async () => {
    const result = await ashbyReader.read(
      new URL(`https://jobs.ashbyhq.com/linear/${FULLSTACK_ID}`),
      vi.fn(async () => null),
    );
    expect(result).toBeNull();
  });
});
