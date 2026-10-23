import { describe, expect, it } from "vitest";
import { linkedInJobId, linkedInReader } from "../src/extract/readers/linkedin";
import { parseFixture, parseHtml } from "./helpers";

describe("linkedInJobId", () => {
  it("reads a bare /jobs/view/{id} URL", () => {
    expect(linkedInJobId(new URL("https://www.linkedin.com/jobs/view/4479305237/"))).toBe(
      "4479305237",
    );
  });

  it("reads an id off the end of a slug", () => {
    expect(
      linkedInJobId(
        new URL(
          "https://www.linkedin.com/jobs/view/software-engineer-i-fullstack-search-at-affirm-4479305237",
        ),
      ),
    ).toBe("4479305237");
  });

  it("reads currentJobId from a search page", () => {
    expect(
      linkedInJobId(
        new URL("https://www.linkedin.com/jobs/search/?currentJobId=4479305237"),
      ),
    ).toBe("4479305237");
  });

  it("returns null on a LinkedIn page that is not a job", () => {
    expect(linkedInJobId(new URL("https://www.linkedin.com/feed/"))).toBeNull();
  });
});

describe("linkedInReader.matches", () => {
  it("matches a job page", () => {
    expect(
      linkedInReader.matches(new URL("https://www.linkedin.com/jobs/view/4479305237")),
    ).toBe(true);
  });

  it("does not match the LinkedIn feed", () => {
    expect(linkedInReader.matches(new URL("https://www.linkedin.com/feed/"))).toBe(
      false,
    );
  });

  it("does not match another site", () => {
    expect(linkedInReader.matches(new URL("https://example.com/jobs/view/1"))).toBe(
      false,
    );
  });
});

describe("linkedInReader against real captured public pages", () => {
  it("reads the Affirm posting", () => {
    const result = linkedInReader.read(
      parseFixture("linkedin/affirm-swe-fullstack.html"),
      new URL("https://www.linkedin.com/jobs/view/4479305237"),
    );

    expect(result?.role).toBe("Software Engineer I, Fullstack (Search)");
    expect(result?.company).toBe("Affirm");
    expect(result?.description?.length).toBeGreaterThan(200);
    expect(result?.source).toBe("linkedin");
    // Selector based, so never claims high confidence.
    expect(result?.confidence).toBe("medium");
  });

  it("reads the JPMorgan posting", () => {
    const result = linkedInReader.read(
      parseFixture("linkedin/jpmorgan-swe-java.html"),
      new URL("https://www.linkedin.com/jobs/view/4476983365"),
    );

    expect(result?.role).toBeTruthy();
    expect(result?.company).toBeTruthy();
    expect(result?.description?.length).toBeGreaterThan(200);
  });

  it("canonicalizes the URL to the bare /jobs/view/{id} form", () => {
    const result = linkedInReader.read(
      parseFixture("linkedin/affirm-swe-fullstack.html"),
      new URL(
        "https://www.linkedin.com/jobs/view/software-engineer-i-fullstack-search-at-affirm-4479305237?refId=abc&trk=xyz",
      ),
    );

    expect(result?.url).toBe("https://www.linkedin.com/jobs/view/4479305237/");
  });

  it("returns text with no markup left in it", () => {
    const result = linkedInReader.read(
      parseFixture("linkedin/affirm-swe-fullstack.html"),
      new URL("https://www.linkedin.com/jobs/view/4479305237"),
    );

    expect(result?.description).not.toContain("<");
    expect(result?.description).not.toContain("&lt;");
  });
});

describe("linkedInReader selector fallbacks", () => {
  /**
   * The signed-in layout could not be captured during an unattended run, so
   * these assert the candidate lists behave, using the signed-in hook names.
   */
  it("falls back to the signed-in job title hook", () => {
    const doc = parseHtml(`<html><body>
      <h1 class="job-details-jobs-unified-top-card__job-title">Backend Engineer</h1>
      <div class="job-details-jobs-unified-top-card__company-name"><a>Acme</a></div>
      <div id="job-details"><p>Work on the backend.</p></div>
    </body></html>`);

    const result = linkedInReader.read(
      doc,
      new URL("https://www.linkedin.com/jobs/view/123456789"),
    );

    expect(result?.role).toBe("Backend Engineer");
    expect(result?.company).toBe("Acme");
    expect(result?.description).toContain("Work on the backend.");
  });

  it("still returns a partial result when only the title is present", () => {
    const doc = parseHtml(
      '<html><body><h1 class="top-card-layout__title">Data Scientist</h1></body></html>',
    );

    const result = linkedInReader.read(
      doc,
      new URL("https://www.linkedin.com/jobs/view/123456789"),
    );

    expect(result?.role).toBe("Data Scientist");
    expect(result?.company).toBeNull();
  });

  it("returns null when the page has none of the hooks", () => {
    const doc = parseHtml("<html><body><div>Nothing here</div></body></html>");
    expect(
      linkedInReader.read(doc, new URL("https://www.linkedin.com/jobs/view/1")),
    ).toBeNull();
  });
});
