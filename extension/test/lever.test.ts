import { describe, expect, it, vi } from "vitest";
import {
  buildLeverDescription,
  companyFromSlug,
  leverReader,
  parseLeverUrl,
} from "../src/extract/readers/lever";
import { loadFixture } from "./helpers";

function fetchFromFixtures(map: Record<string, string>) {
  return vi.fn(async (url: string) => {
    const fixture = map[url];
    return fixture ? (JSON.parse(loadFixture(fixture)) as unknown) : null;
  });
}

const SWE_ID = "4abf26b4-795c-420a-bf22-1ab98db268b4";
const INTERN_ID = "774cf5c9-bf6a-4d77-bf60-d50ef1beb1a0";
const SWE_API = `https://api.lever.co/v0/postings/palantir/${SWE_ID}`;
const INTERN_API = `https://api.lever.co/v0/postings/palantir/${INTERN_ID}`;

describe("parseLeverUrl", () => {
  it("reads a posting URL", () => {
    expect(parseLeverUrl(new URL(`https://jobs.lever.co/palantir/${SWE_ID}`))).toEqual(
      { company: "palantir", postingId: SWE_ID },
    );
  });

  it("reads a posting URL with the apply suffix", () => {
    expect(
      parseLeverUrl(new URL(`https://jobs.lever.co/palantir/${SWE_ID}/apply`)),
    ).toEqual({ company: "palantir", postingId: SWE_ID });
  });

  it("reads a posting URL with the thanks suffix, seen right after applying", () => {
    expect(
      parseLeverUrl(new URL(`https://jobs.lever.co/palantir/${SWE_ID}/thanks`)),
    ).toEqual({ company: "palantir", postingId: SWE_ID });
  });

  it("does not treat a company listing page as a posting", () => {
    expect(parseLeverUrl(new URL("https://jobs.lever.co/palantir"))).toBeNull();
  });

  it("ignores a non-Lever host", () => {
    expect(parseLeverUrl(new URL("https://example.com/a/b"))).toBeNull();
  });
});

describe("companyFromSlug", () => {
  it("title cases a single word slug", () => {
    expect(companyFromSlug("palantir")).toBe("Palantir");
  });

  it("splits a hyphenated slug into words", () => {
    expect(companyFromSlug("acme-corp")).toBe("Acme Corp");
  });

  it("handles underscores too", () => {
    expect(companyFromSlug("acme_corp")).toBe("Acme Corp");
  });
});

describe("leverReader against real captured API responses", () => {
  it("reads title, description and url from a posting with bullet lists", async () => {
    const result = await leverReader.read(
      new URL(`https://jobs.lever.co/palantir/${SWE_ID}`),
      fetchFromFixtures({ [SWE_API]: "lever/palantir-swe-new-grad.json" }),
    );

    expect(result?.role).toBe("Software Engineer, New Grad - Infrastructure");
    expect(result?.company).toBe("Palantir");
    expect(result?.source).toBe("lever");
    expect(result?.url).toBe(`https://jobs.lever.co/palantir/${SWE_ID}`);
    expect(result?.description).toBeTruthy();
  });

  it("stitches descriptionPlain, the lists and additionalPlain together", async () => {
    const posting = JSON.parse(
      loadFixture("lever/palantir-swe-new-grad.json"),
    ) as Record<string, unknown>;

    const description = buildLeverDescription(posting);

    // The opening prose.
    expect(description).toContain("A World-Changing Company");
    // Every list heading survives.
    for (const list of posting.lists as { text: string }[]) {
      expect(description).toContain(list.text);
    }
    // The list items become bullets.
    expect((description?.match(/^- /gm) ?? []).length).toBeGreaterThanOrEqual(5);
    // No HTML leaks through from lists[].content.
    expect(description).not.toContain("<li>");
  });

  it("reads a posting that has no lists at all", async () => {
    const result = await leverReader.read(
      new URL(`https://jobs.lever.co/palantir/${INTERN_ID}`),
      fetchFromFixtures({ [INTERN_API]: "lever/palantir-internship-no-lists.json" }),
    );

    expect(result?.role).toBe("Deployment Strategist, Internship");
    expect(result?.description).toBeTruthy();
    expect(result?.description).not.toContain("<");
  });

  it("reads the posting even when the user is on the thanks page", async () => {
    const result = await leverReader.read(
      new URL(`https://jobs.lever.co/palantir/${SWE_ID}/thanks`),
      fetchFromFixtures({ [SWE_API]: "lever/palantir-swe-new-grad.json" }),
    );

    expect(result?.role).toBe("Software Engineer, New Grad - Infrastructure");
    // hostedUrl is the posting, not the thanks page.
    expect(result?.url).toBe(`https://jobs.lever.co/palantir/${SWE_ID}`);
  });

  it("tolerates an array response from the company level endpoint", async () => {
    const posting = JSON.parse(loadFixture("lever/palantir-swe-new-grad.json")) as unknown;
    const result = await leverReader.read(
      new URL(`https://jobs.lever.co/palantir/${SWE_ID}`),
      vi.fn(async () => [posting]),
    );

    expect(result?.role).toBe("Software Engineer, New Grad - Infrastructure");
  });

  it("returns null when the API call fails", async () => {
    const result = await leverReader.read(
      new URL(`https://jobs.lever.co/palantir/${SWE_ID}`),
      vi.fn(async () => null),
    );
    expect(result).toBeNull();
  });
});

describe("buildLeverDescription edge cases", () => {
  it("returns null for an empty posting", () => {
    expect(buildLeverDescription({})).toBeNull();
  });

  it("falls back to the HTML description when the plain one is missing", () => {
    expect(
      buildLeverDescription({ description: "<p>Hello there.</p>" }),
    ).toBe("Hello there.");
  });

  it("does not leave a run of blank lines between sections", () => {
    const description = buildLeverDescription({
      descriptionPlain: "Opening.",
      lists: [{ text: "Duties", content: "<li>One</li><li>Two</li>" }],
      additionalPlain: "Closing.",
    });
    expect(description).not.toMatch(/\n{3,}/);
    expect(description).toContain("- One");
  });
});
