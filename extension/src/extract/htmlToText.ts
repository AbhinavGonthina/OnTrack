import { MAX_DESCRIPTION_CHARS } from "../config";

/**
 * Job descriptions arrive as HTML from every source (JSON-LD, board APIs, the
 * page itself) and have to land in a plain textarea that OnTrack stores as
 * text. Section 7.5 of the build spec defines the rules this implements.
 */

/** Dropped entirely: none of it is part of the posting's prose. */
const IGNORED = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
  "BUTTON",
  "FORM",
  "IFRAME",
  "TEMPLATE",
]);

/** Produce a paragraph break rather than running into the next line. */
const BLOCK = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT",
  "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "H1", "H2", "H3", "H4", "H5",
  "H6", "HEADER", "HR", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE",
  "TR", "UL",
]);

/**
 * Some boards (Greenhouse in particular) return HTML that has been escaped
 * once for transport and sometimes twice, so "&lt;p&gt;" or even
 * "&amp;lt;p&amp;gt;" arrives where "<p>" was meant. Unescape until it stops
 * changing, capped so a pathological input cannot loop.
 */
export function unescapeHtmlEntities(input: string): string {
  let current = input;
  for (let i = 0; i < 3; i += 1) {
    const next = decodeEntities(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  ndash: "–", // copy-check-ignore: an entity target, not our copy
  mdash: "—", // copy-check-ignore: an entity target, not our copy
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  bull: "•",
  middot: "·",
};

function decodeEntities(input: string): string {
  return input.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (match, body: string) => {
      if (body.startsWith("#")) {
        const isHex = body[1] === "x" || body[1] === "X";
        const code = Number.parseInt(
          isHex ? body.slice(2) : body.slice(1),
          isHex ? 16 : 10,
        );
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    },
  );
}

/** Walks an element, emitting plain text with paragraph and bullet structure. */
function walk(node: Node, out: string[]): void {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    const text = node.nodeValue ?? "";
    if (text.trim()) {
      out.push(text.replace(/\s+/g, " "));
    } else if (text) {
      // A whitespace-only node still matters between two inline elements:
      // "<em>one</em> <a>two</a>" has to stay "one two" rather than becoming
      // "onetwo". Emitting a single space is safe between blocks too, because
      // those already emit newlines and tidy() trims each line.
      out.push(" ");
    }
    return;
  }

  if (node.nodeType !== 1 /* ELEMENT_NODE */) return;

  const element = node as Element;
  const tag = element.tagName.toUpperCase();
  if (IGNORED.has(tag)) return;

  if (tag === "BR") {
    out.push("\n");
    return;
  }

  // A list item reads as a bullet. Nested lists still flatten to "- " because
  // the target is a plain textarea with no indentation of its own.
  if (tag === "LI") {
    out.push("\n- ");
    for (const child of Array.from(element.childNodes)) walk(child, out);
    return;
  }

  const isBlock = BLOCK.has(tag);
  if (isBlock) out.push("\n\n");
  for (const child of Array.from(element.childNodes)) walk(child, out);
  if (isBlock) out.push("\n\n");
}

/** Collapses the raw emission into tidy lines. */
function tidy(raw: string): string {
  return raw
    .split("\n")
    // Non-breaking spaces are common in pasted job copy and look like
    // trailing whitespace to everything downstream.
    .map((line) => line.replace(/\u00a0/g, " ").trim())
    .join("\n")
    // Three or more newlines become a single blank line.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface TruncationResult {
  text: string;
  truncated: boolean;
}

/**
 * Caps the text at the column limit, preferring a paragraph boundary so the
 * description does not stop mid-sentence. Falls back to a hard cut when there
 * is no boundary to use.
 */
export function truncateAtParagraph(
  text: string,
  limit = MAX_DESCRIPTION_CHARS,
): TruncationResult {
  if (text.length <= limit) return { text, truncated: false };

  const window = text.slice(0, limit);
  const lastBreak = window.lastIndexOf("\n\n");
  // Only honour a paragraph break if it keeps most of the allowance; otherwise
  // a posting with one early blank line would lose almost everything.
  const cut = lastBreak > limit * 0.5 ? lastBreak : window.length;
  return { text: window.slice(0, cut).trim(), truncated: true };
}

/**
 * Converts markup to text without a DOM.
 *
 * The board readers (Greenhouse, Lever, Ashby) run in the service worker,
 * which has no DOMParser, so the DOM path below cannot be used there. This
 * caught a real bug: the Greenhouse and Lever readers threw on every live
 * posting and silently fell back to the page readers, while the unit tests
 * passed because jsdom does provide DOMParser.
 *
 * Exported so a test can assert it agrees with the DOM implementation rather
 * than hoping it does.
 */
export function htmlToTextWithoutDom(html: string): string {
  if (!html) return "";

  // Structure is marked with control characters first, so that whitespace can
  // then be collapsed everywhere without destroying it. This mirrors what the
  // DOM walk does: it collapses runs of whitespace inside each text node, and
  // skips whitespace-only nodes between elements entirely.
  const BR = "\u0001";
  const ITEM = "\u0002";
  const BLOCK_BREAK = "\u0003";

  let text = unescapeHtmlEntities(html);

  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // Dropped along with their contents.
  for (const tag of IGNORED) {
    const name = tag.toLowerCase();
    text = text.replace(
      new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}\\s*>`, "gi"),
      "",
    );
    text = text.replace(new RegExp(`<${name}\\b[^>]*\\/?>`, "gi"), "");
  }

  text = text.replace(/<br\s*\/?>/gi, BR);
  text = text.replace(/<li\b[^>]*>/gi, ITEM);
  text = text.replace(/<\/li\s*>/gi, "");

  for (const tag of BLOCK) {
    const name = tag.toLowerCase();
    text = text.replace(new RegExp(`<${name}\\b[^>]*>`, "gi"), BLOCK_BREAK);
    text = text.replace(new RegExp(`<\\/${name}\\s*>`, "gi"), BLOCK_BREAK);
  }

  // Everything left is inline: drop the tag, keep the text.
  text = text.replace(/<[^>]+>/g, "");

  // Entities that were themselves encoded in the markup.
  text = unescapeHtmlEntities(text);

  // Now that no real line structure is expressed as whitespace, collapse it.
  // The control characters are the structure placeholders set above, excluded
  // here so collapsing cannot eat them. They are deliberate: no real job
  // description contains U+0001 to U+0003, so they cannot collide with the
  // page's own text the way a string sentinel could.
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[^\S\u0001\u0002\u0003]+|\r?\n/g, " ");

  text = text
    .split(BLOCK_BREAK)
    .join("\n\n")
    .split(ITEM)
    .join("\n- ")
    .split(BR)
    .join("\n");

  return tidy(text);
}

/**
 * Parses an HTML string and converts it, handling escaped markup.
 *
 * Uses DOMParser where there is one (the popup and the injected extractor)
 * and the DOM-free path in the service worker.
 */
export function htmlToText(html: string): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") return htmlToTextWithoutDom(html);

  const unescaped = unescapeHtmlEntities(html);
  const doc = new DOMParser().parseFromString(unescaped, "text/html");
  return elementToText(doc.body);
}

/** Converts an element that is already in a document (the live page). */
export function elementToText(element: Element | null): string {
  if (!element) return "";
  const out: string[] = [];
  walk(element, out);
  return tidy(out.join(""));
}
