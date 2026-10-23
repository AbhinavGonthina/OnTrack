import { canonicalizeUrl } from "../canonicalUrl";
import { elementToText } from "../htmlToText";
import type { Reader, ReaderResult } from "../types";

/**
 * The last reader before the AI fallback (Section 7, order 4).
 *
 * Everything it produces is a guess from page furniture, so it reports low
 * confidence and the popup always shows the Partial note telling the user to
 * check the fields. It exists so that an unknown careers page still prefills
 * something useful rather than handing the user an empty form.
 */

function meta(doc: Document, selector: string): string | null {
  const content = doc.querySelector(selector)?.getAttribute("content");
  const trimmed = content?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Page titles overwhelmingly follow "Role at Company" or "Role - Company",
 * with a trailing site name that has to come off first.
 */
export function splitTitle(raw: string): { role: string | null; company: string | null } {
  // Trailing " | LinkedIn Jobs", " | Careers" and friends.
  let title = raw.replace(/\s*[|·]\s*[^|·]{0,40}$/u, "").trim();
  if (!title) title = raw.trim();

  const at = /^(.*?)\s+(?:at|@)\s+(.+)$/i.exec(title);
  if (at?.[1] && at[2]) {
    return { role: at[1].trim(), company: at[2].trim() };
  }

  // "Role - Company" / "Role – Company". Only split on the last separator so a
  // hyphenated role survives.
  // A character class matching separators in *their* page titles.
  const dash = /^(.*)\s+[-–—]\s+([^-–—]+)$/.exec(title); // copy-check-ignore: matches their text, does not produce ours
  if (dash?.[1] && dash[2]) {
    return { role: dash[1].trim(), company: dash[2].trim() };
  }

  return { role: title || null, company: null };
}

/**
 * The largest block of text on the page, as a stand-in for the description.
 * Scores by text length while skipping the page chrome, which is the simplest
 * thing that works on an unknown layout.
 */
export function largestTextBlock(doc: Document): Element | null {
  const candidates = Array.from(
    doc.querySelectorAll("article, main, section, div"),
  );

  let best: Element | null = null;
  let bestLength = 0;

  for (const element of candidates) {
    if (element.closest("nav, header, footer, aside, form")) continue;

    const text = element.textContent?.trim() ?? "";
    if (text.length < 200) continue;

    // Prefer the deepest element that still holds the bulk of the text, so the
    // result is the description rather than the whole page body.
    const childTextMax = Array.from(element.children).reduce(
      (max, child) => Math.max(max, child.textContent?.trim().length ?? 0),
      0,
    );
    if (childTextMax > text.length * 0.9) continue;

    if (text.length > bestLength) {
      best = element;
      bestLength = text.length;
    }
  }

  return best;
}

export const heuristicReader = {
  name: "heuristic",

  // The fallback for anything, so it never declines on the URL.
  matches: (_url: URL) => true,

  read(doc: Document, url: URL): ReaderResult | null {
    const ogTitle = meta(doc, 'meta[property="og:title"]');
    const docTitle = doc.querySelector("title")?.textContent?.trim() ?? "";
    const rawTitle = ogTitle ?? docTitle;

    const parsed = rawTitle ? splitTitle(rawTitle) : { role: null, company: null };

    const company =
      parsed.company ??
      meta(doc, 'meta[property="og:site_name"]') ??
      meta(doc, 'meta[name="application-name"]');

    const h1 = doc.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim();
    const role = parsed.role ?? (h1 || null);

    const description = elementToText(largestTextBlock(doc)) || null;

    if (!role && !company && !description) return null;

    return {
      role,
      company,
      description,
      url: canonicalizeUrl(url.toString()),
      source: "heuristic",
      // Always low: every field here is inferred, never stated by the page.
      confidence: "low",
    };
  },
} satisfies Reader;
