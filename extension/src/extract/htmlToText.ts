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
  ndash: "–",
  mdash: "—",
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
    if (text.trim()) out.push(text.replace(/\s+/g, " "));
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

/** Parses an HTML string and converts it, handling escaped markup. */
export function htmlToText(html: string): string {
  if (!html) return "";
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
