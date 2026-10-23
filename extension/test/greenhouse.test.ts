import { describe, expect, it, vi } from "vitest";
import {
  greenhouseBoardTokenFromDoc,
  greenhouseReader,
  parseGreenhouseUrl,
} from "../src/extract/readers/greenhouse";
import { loadFixture, parseHtml } from "./helpers";

/** Serves saved API responses by URL, so no test touches the network. */
function fetchFromFixtures(map: Record<string, string>) {
  return vi.fn(async (url: string) => {
    const fixture = map[url];
    return fixture ? (JSON.parse(loadFixture(fixture)) as unknown) : null;
  });
}

const FIGMA_JOB =
  "https://boards-api.greenhouse.io/v1/boards/figma/jobs/6223155004";
const FIGMA_BOARD = "https://boards-api.greenhouse.io/v1/boards/figma";
const DATABRICKS_JOB =
  "https://boards-api.greenhouse.io/v1/boards/databricks/jobs/8548502002";

describe("parseGreenhouseUrl", () => {
  it("reads a boards.greenhouse.io posting", () => {
    expect(
      parseGreenhouseUrl(new URL("https://boards.greenhouse.io/figma/jobs/6223155004")),
    ).toEqual({ board: "figma", jobId: "6223155004" });
  });

  it("reads the newer job-boards.greenhouse.io host", () => {
    expect(
      parseGreenhouseUrl(
        new URL("https://job-boards.greenhouse.io/figma/jobs/6223155004"),
      ),
    ).toEqual({ board: "figma", jobId: "6223155004" });
  });

  it("reads gh_jid on a company's own careers page, with no board token", () => {
    expect(
      parseGreenhouseUrl(new URL("https://acme.com/careers?gh_jid=4512345")),
    ).toEqual({ board: "", jobId: "4512345" });
  });

  it("ignores an unrelated URL", () => {
    expect(parseGreenhouseUrl(new URL("https://example.com/jobs/1"))).toBeNull();
  });

  it("ignores a greenhouse board listing page with no job id", () => {
    expect(
      parseGreenhouseUrl(new URL("https://boards.greenhouse.io/figma")),
    ).toBeNull();
  });
});

describe("greenhouseBoardTokenFromDoc", () => {
  it("reads the board token from the embed script", () => {
    const doc = parseHtml(
      '<html><body><script src="https://boards.greenhouse.io/embed/job_board/js?for=acmecorp"></script></body></html>',
    );
    expect(greenhouseBoardTokenFromDoc(doc)).toBe("acmecorp");
  });

  it("falls back to a data attribute", () => {
    const doc = parseHtml('<html><body><div data-board-token="acmecorp"></div></body></html>');
    expect(greenhouseBoardTokenFromDoc(doc)).toBe("acmecorp");
  });

  it("returns null when the page has no board", () => {
    const doc = parseHtml("<html><body><p>Careers</p></body></html>");
    expect(greenhouseBoardTokenFromDoc(doc)).toBeNull();
  });
});

describe("greenhouseReader against real captured API responses", () => {
  it("reads a posting, using company_name without a second call", async () => {
    const fetchJson = fetchFromFixtures({
      [FIGMA_JOB]: "greenhouse/figma-compliance-engineer.json",
      [FIGMA_BOARD]: "greenhouse/figma-board.json",
    });

    const result = await greenhouseReader.read(
      new URL("https://boards.greenhouse.io/figma/jobs/6223155004"),
      fetchJson,
    );

    expect(result?.role).toBe("Compliance Engineer");
    expect(result?.company).toBe("Figma");
    expect(result?.source).toBe("greenhouse");
    expect(result?.confidence).toBe("high");
    // company_name was present, so the board endpoint is never called.
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });

  it("unescapes the escaped HTML Greenhouse returns in content", async () => {
    const fetchJson = fetchFromFixtures({
      [FIGMA_JOB]: "greenhouse/figma-compliance-engineer.json",
    });

    const result = await greenhouseReader.read(
      new URL("https://boards.greenhouse.io/figma/jobs/6223155004"),
      fetchJson,
    );

    // The raw field literally contains "&lt;div class=&quot;...", none of
    // which may survive into the description.
    expect(result?.description).not.toContain("&lt;");
    expect(result?.description).not.toContain("&quot;");
    expect(result?.description).not.toContain("<div");
    expect(result?.description?.length).toBeGreaterThan(300);
  });

  it("keeps bullet structure from a list-heavy posting", async () => {
    const fetchJson = fetchFromFixtures({
      [DATABRICKS_JOB]: "greenhouse/databricks-enablement-lead.json",
    });

    const result = await greenhouseReader.read(
      new URL("https://boards.greenhouse.io/databricks/jobs/8548502002"),
      fetchJson,
    );

    expect(result?.role).toMatch(/Technical Enablement/i);
    const bullets = (result?.description?.match(/^- /gm) ?? []).length;
    expect(bullets).toBeGreaterThanOrEqual(10);
  });

  it("canonicalizes the absolute_url, which carries a gh_jid", async () => {
    const fetchJson = fetchFromFixtures({
      [FIGMA_JOB]: "greenhouse/figma-compliance-engineer.json",
    });

    const result = await greenhouseReader.read(
      new URL("https://boards.greenhouse.io/figma/jobs/6223155004?utm_source=x"),
      fetchJson,
    );

    // gh_jid is deliberately kept, utm_ is dropped.
    expect(result?.url).toContain("gh_jid=6223155004");
    expect(result?.url).not.toContain("utm_source");
  });

  it("falls back to the board's display name when company_name is absent", async () => {
    const fetchJson = vi.fn(async (url: string) => {
      if (url === FIGMA_JOB) {
        const job = JSON.parse(
          loadFixture("greenhouse/figma-compliance-engineer.json"),
        ) as Record<string, unknown>;
        delete job.company_name;
        return job;
      }
      if (url === FIGMA_BOARD) {
        return JSON.parse(loadFixture("greenhouse/figma-board.json")) as unknown;
      }
      return null;
    });

    const result = await greenhouseReader.read(
      new URL("https://boards.greenhouse.io/figma/jobs/6223155004"),
      fetchJson,
    );

    expect(result?.company).toBe("Figma");
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it("returns null without a board token, so the page readers can try", async () => {
    const fetchJson = vi.fn(async () => null);
    const result = await greenhouseReader.read(
      new URL("https://acme.com/careers?gh_jid=4512345"),
      fetchJson,
    );

    expect(result).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
  });

  it("returns null when the API call fails", async () => {
    const result = await greenhouseReader.read(
      new URL("https://boards.greenhouse.io/figma/jobs/6223155004"),
      vi.fn(async () => null),
    );
    expect(result).toBeNull();
  });
});
