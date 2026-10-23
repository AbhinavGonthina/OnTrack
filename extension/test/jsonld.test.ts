import { describe, expect, it } from "vitest";
import { findJobPostingNodes, jsonLdReader } from "../src/extract/readers/jsonld";
import { parseFixture, parseHtml } from "./helpers";

describe("jsonLdReader against real captured pages", () => {
  it("reads a Lever posting's JobPosting block", () => {
    const doc = parseFixture("jsonld/lever-palantir.html");
    const url = new URL(
      "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd",
    );

    const result = jsonLdReader.read(doc, url);

    expect(result).not.toBeNull();
    expect(result?.role).toBe("Administrative Business Partner");
    expect(result?.company).toBe("Palantir Technologies");
    expect(result?.confidence).toBe("high");
    // description is HTML in the source and must arrive as plain text.
    expect(result?.description).toContain("A World-Changing Company");
    expect(result?.description).not.toContain("<p>");
    expect(result?.description).not.toContain("&nbsp;");
    // This block carries no url, so the page URL is used.
    expect(result?.url).toBe(
      "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd",
    );
  });

  it("reads an Ashby posting's JobPosting block", () => {
    const doc = parseFixture("jsonld/ashby-linear.html");
    const url = new URL(
      "https://jobs.ashbyhq.com/linear/d3bc1ced-3ce4-4086-a050-555055dbb1ff",
    );

    const result = jsonLdReader.read(doc, url);

    expect(result).not.toBeNull();
    expect(result?.role).toMatch(/Fullstack Engineer/i);
    expect(result?.company).toBeTruthy();
    expect(result?.description?.length).toBeGreaterThan(200);
    expect(result?.description).not.toContain("<p ");
  });
});

describe("jsonLdReader shape handling", () => {
  it("finds a posting inside an @graph wrapper", () => {
    const doc = parseHtml(`<html><head>
      <script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"Organization","name":"Acme"},
        {"@type":"JobPosting","title":"Backend Engineer",
         "hiringOrganization":{"@type":"Organization","name":"Acme"},
         "description":"<p>Build things.</p>"}
      ]}
      </script></head><body></body></html>`);

    const result = jsonLdReader.read(doc, new URL("https://acme.com/jobs/1"));

    expect(result?.role).toBe("Backend Engineer");
    expect(result?.company).toBe("Acme");
    expect(result?.description).toBe("Build things.");
  });

  it("finds a posting in a top-level array", () => {
    const doc = parseHtml(`<html><head>
      <script type="application/ld+json">
      [{"@type":"BreadcrumbList"},
       {"@type":"JobPosting","title":"Data Engineer",
        "hiringOrganization":"Globex"}]
      </script></head><body></body></html>`);

    const result = jsonLdReader.read(doc, new URL("https://globex.com/j/2"));

    expect(result?.role).toBe("Data Engineer");
    // hiringOrganization as a bare string, not an Organization object.
    expect(result?.company).toBe("Globex");
  });

  it("matches when @type is an array", () => {
    const doc = parseHtml(`<html><head>
      <script type="application/ld+json">
      {"@type":["JobPosting","Thing"],"title":"SRE",
       "hiringOrganization":{"name":"Initech"}}
      </script></head><body></body></html>`);

    const result = jsonLdReader.read(doc, new URL("https://initech.com/j/3"));

    expect(result?.role).toBe("SRE");
    expect(result?.company).toBe("Initech");
  });

  it("ignores one malformed block and still reads a later valid one", () => {
    const doc = parseHtml(`<html><head>
      <script type="application/ld+json">{ this is not json at all </script>
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"Platform Engineer",
       "hiringOrganization":{"name":"Hooli"}}
      </script></head><body></body></html>`);

    expect(findJobPostingNodes(doc)).toHaveLength(1);
    const result = jsonLdReader.read(doc, new URL("https://hooli.com/j/4"));
    expect(result?.role).toBe("Platform Engineer");
  });

  it("prefers the richer posting when a page carries more than one", () => {
    const doc = parseHtml(`<html><head>
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"Related role"}
      </script>
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"Senior Engineer",
       "hiringOrganization":{"name":"Acme"},
       "description":"<p>The real one.</p>"}
      </script></head><body></body></html>`);

    const result = jsonLdReader.read(doc, new URL("https://acme.com/j/5"));
    expect(result?.role).toBe("Senior Engineer");
  });

  it("prefers the posting's own url over the page url", () => {
    const doc = parseHtml(`<html><head>
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"QA","hiringOrganization":{"name":"Acme"},
       "url":"https://acme.com/careers/qa/?utm_source=x"}
      </script></head><body></body></html>`);

    const result = jsonLdReader.read(
      doc,
      new URL("https://acme.com/careers/qa?gclid=abc"),
    );
    // and canonicalizes it on the way through
    expect(result?.url).toBe("https://acme.com/careers/qa");
  });

  it("returns null when the page has no JobPosting", () => {
    const doc = parseHtml(`<html><head>
      <script type="application/ld+json">
      {"@type":"Organization","name":"Acme"}
      </script></head><body></body></html>`);

    expect(jsonLdReader.read(doc, new URL("https://acme.com"))).toBeNull();
  });

  it("returns null on a page with no structured data at all", () => {
    const doc = parseHtml("<html><body><h1>Careers</h1></body></html>");
    expect(jsonLdReader.read(doc, new URL("https://acme.com"))).toBeNull();
  });
});
