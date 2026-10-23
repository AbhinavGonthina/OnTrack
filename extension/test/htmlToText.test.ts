import { describe, expect, it } from "vitest";
import {
  htmlToText,
  htmlToTextWithoutDom,
  truncateAtParagraph,
  unescapeHtmlEntities,
} from "../src/extract/htmlToText";
import { loadFixture } from "./helpers";
import { MAX_DESCRIPTION_CHARS } from "../src/config";

describe("htmlToText", () => {
  it("turns block elements into paragraph breaks", () => {
    expect(htmlToText("<p>First para.</p><p>Second para.</p>")).toBe(
      "First para.\n\nSecond para.",
    );
  });

  it("turns list items into dash bullets", () => {
    const text = htmlToText(
      "<p>You will:</p><ul><li>Ship code</li><li>Review code</li></ul>",
    );
    expect(text).toBe("You will:\n\n- Ship code\n- Review code");
  });

  it("turns br into a single newline", () => {
    expect(htmlToText("Line one<br>Line two")).toBe("Line one\nLine two");
  });

  it("drops script, style and button content", () => {
    const text = htmlToText(
      "<div>Real text</div><script>var x = 1;</script><style>.a{}</style>" +
        "<button>Apply now</button>",
    );
    expect(text).toBe("Real text");
  });

  it("drops the application form rather than reading its labels", () => {
    const text = htmlToText(
      "<div>About the role</div><form><label>Full name</label>" +
        "<input /><label>Resume</label></form>",
    );
    expect(text).toBe("About the role");
  });

  it("collapses runs of blank lines to one", () => {
    expect(htmlToText("<div><p>A</p><div></div><div></div><p>B</p></div>")).toBe(
      "A\n\nB",
    );
  });

  it("collapses whitespace inside a paragraph", () => {
    expect(htmlToText("<p>Lots   of\n\n   space</p>")).toBe("Lots of space");
  });

  it("converts non-breaking spaces to ordinary ones", () => {
    expect(htmlToText("<p>A&nbsp;B</p>")).toBe("A B");
  });

  it("handles escaped HTML, which is how Greenhouse returns content", () => {
    const escaped = "&lt;p&gt;Build things.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Ship&lt;/li&gt;&lt;/ul&gt;";
    expect(htmlToText(escaped)).toBe("Build things.\n\n- Ship");
  });

  it("handles double-escaped HTML", () => {
    const doubled = "&amp;lt;p&amp;gt;Hello&amp;lt;/p&amp;gt;";
    expect(htmlToText(doubled)).toBe("Hello");
  });

  it("returns an empty string for empty input", () => {
    expect(htmlToText("")).toBe("");
  });

  it("keeps plain text that has no markup", () => {
    expect(htmlToText("Just a sentence.")).toBe("Just a sentence.");
  });
});

describe("unescapeHtmlEntities", () => {
  it("decodes named entities", () => {
    expect(unescapeHtmlEntities("a &amp; b &lt; c")).toBe("a & b < c");
  });

  it("decodes numeric and hex entities", () => {
    expect(unescapeHtmlEntities("&#65;&#x42;")).toBe("AB");
  });

  it("leaves an unknown entity alone rather than mangling it", () => {
    expect(unescapeHtmlEntities("50&nosuchentity;60")).toBe("50&nosuchentity;60");
  });

  it("stops after a bounded number of passes", () => {
    // Nothing here should loop forever.
    expect(unescapeHtmlEntities("&amp;amp;amp;amp;amp;")).toBeTruthy();
  });
});

describe("truncateAtParagraph", () => {
  it("leaves text under the limit untouched", () => {
    const result = truncateAtParagraph("short", 100);
    expect(result).toEqual({ text: "short", truncated: false });
  });

  it("cuts at a paragraph boundary when there is a sensible one", () => {
    const text = `${"a".repeat(60)}\n\n${"b".repeat(60)}`;
    const result = truncateAtParagraph(text, 100);

    expect(result.truncated).toBe(true);
    expect(result.text).toBe("a".repeat(60));
    expect(result.text).not.toContain("b");
  });

  it("falls back to a hard cut when the only break is too early", () => {
    // A break at character 5 of a 100 character budget would throw away
    // almost everything, so the hard cut is the better answer.
    const text = `tiny\n\n${"b".repeat(300)}`;
    const result = truncateAtParagraph(text, 100);

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeGreaterThan(50);
  });

  it("never exceeds the limit", () => {
    const text = "word ".repeat(10_000);
    const result = truncateAtParagraph(text, MAX_DESCRIPTION_CHARS);

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(MAX_DESCRIPTION_CHARS);
  });

  it("defaults to OnTrack's 20000 character column limit", () => {
    const result = truncateAtParagraph("x".repeat(25_000));
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(20_000);
  });
});

/**
 * The board readers run in the service worker, which has no DOMParser. That
 * is not a hypothetical: before htmlToTextWithoutDom existed, the Greenhouse
 * and Lever readers threw on every live posting and silently fell back to the
 * page readers, while this suite stayed green because jsdom provides
 * DOMParser. These tests compare the two implementations directly so the
 * worker path cannot drift away from the one the popup uses.
 */
describe("htmlToTextWithoutDom agrees with the DOM implementation", () => {
  const cases: Array<[string, string]> = [
    ["paragraphs", "<p>First para.</p><p>Second para.</p>"],
    ["bullets", "<p>You will:</p><ul><li>Ship code</li><li>Review code</li></ul>"],
    ["line breaks", "Line one<br>Line two<br/>Line three"],
    ["nested markup", "<div><section><p>Deep <strong>bold</strong> text.</p></section></div>"],
    ["inline tags are dropped but their text kept", "<p>An <em>emphasised</em> <a href='#'>link</a>.</p>"],
    ["scripts and styles", "<div>Real</div><script>var x=1;</script><style>.a{}</style>"],
    ["a form", "<div>About</div><form><label>Name</label><input/></form>"],
    ["buttons", "<p>Text</p><button>Apply now</button>"],
    ["entities", "<p>a &amp; b &lt; c &nbsp;d</p>"],
    ["escaped html, the Greenhouse shape", "&lt;p&gt;Build things.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Ship&lt;/li&gt;&lt;/ul&gt;"],
    ["headings", "<h2>Responsibilities</h2><p>Do the work.</p>"],
    ["a table", "<table><tr><td>One</td></tr><tr><td>Two</td></tr></table>"],
    ["blank input", ""],
    ["plain text", "Just a sentence."],
    ["bare li run, the Lever lists[] shape", "<li>One</li>\n<li>Two</li>"],
    ["comments", "<p>Before</p><!-- hidden --><p>After</p>"],
  ];

  for (const [name, html] of cases) {
    it(name, () => {
      expect(htmlToTextWithoutDom(html)).toBe(htmlToText(html));
    });
  }

  it("agrees on a real Greenhouse description", () => {
    const job = JSON.parse(
      loadFixture("greenhouse/figma-compliance-engineer.json"),
    ) as { content: string };

    expect(htmlToTextWithoutDom(job.content)).toBe(htmlToText(job.content));
    expect(htmlToTextWithoutDom(job.content).length).toBeGreaterThan(300);
  });

  it("agrees on a real Lever list block", () => {
    const posting = JSON.parse(
      loadFixture("lever/palantir-swe-new-grad.json"),
    ) as { lists: Array<{ content: string }> };

    for (const list of posting.lists) {
      expect(htmlToTextWithoutDom(list.content)).toBe(htmlToText(list.content));
    }
  });

  it("produces bullets for a real Lever list rather than nothing", () => {
    const posting = JSON.parse(
      loadFixture("lever/palantir-swe-new-grad.json"),
    ) as { lists: Array<{ content: string }> };

    const text = htmlToTextWithoutDom(posting.lists[0]!.content);
    expect(text).toContain("- ");
    expect(text).not.toContain("<li>");
  });
});
