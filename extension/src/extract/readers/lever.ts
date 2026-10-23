import { canonicalizeUrl } from "../canonicalUrl";
import { htmlToText } from "../htmlToText";
import type { BoardReader, FetchJson, ReaderResult } from "../types";

/**
 * Lever, via its public postings API (Section 7.2).
 *
 * Verified live on 2026-10-22 against
 * api.lever.co/v0/postings/palantir/4abf26b4-795c-420a-bf22-1ab98db268b4.
 * The single-posting endpoint returns one object (the company endpoint returns
 * an array), with text as the title and the description split across three
 * places: descriptionPlain for the opening prose, lists[] for the "what you
 * will do" style bullet blocks, and additionalPlain for the closing boilerplate.
 * Reassembling all three is what makes the saved description match what the
 * user actually read on the page.
 */

const API = "https://api.lever.co/v0/postings";

interface LeverList {
  text?: unknown;
  content?: unknown;
}
interface LeverPosting {
  text?: unknown;
  description?: unknown;
  descriptionPlain?: unknown;
  lists?: unknown;
  additionalPlain?: unknown;
  additional?: unknown;
  hostedUrl?: unknown;
  categories?: { team?: unknown; location?: unknown };
}

export interface LeverRef {
  company: string;
  postingId: string;
}

/** jobs.lever.co/{company}/{postingId}, with optional /apply or /thanks. */
export function parseLeverUrl(url: URL): LeverRef | null {
  if (!/(^|\.)lever\.co$/i.test(url.hostname)) return null;

  const match = /^\/([^/]+)\/([^/]+)/.exec(url.pathname);
  const company = match?.[1];
  const postingId = match?.[2];
  if (!company || !postingId) return null;

  // Post-apply suffixes are path segments, not posting ids.
  if (/^(apply|thanks)$/i.test(postingId)) return null;
  return { company, postingId };
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Rebuilds the description in the order the page shows it. Prefers the plain
 * variants Lever already provides and converts the HTML ones only when it has
 * to, since converting adds a chance of mangling something.
 */
export function buildLeverDescription(posting: LeverPosting): string | null {
  const parts: string[] = [];

  const opening =
    readString(posting.descriptionPlain) ??
    (readString(posting.description)
      ? htmlToText(posting.description as string)
      : null);
  if (opening) parts.push(opening);

  if (Array.isArray(posting.lists)) {
    for (const entry of posting.lists as LeverList[]) {
      const heading = readString(entry.text);
      const content = readString(entry.content);
      if (heading) parts.push(heading);
      // content is a run of <li> elements with no wrapping <ul>, which
      // htmlToText still turns into "- " bullets.
      if (content) parts.push(htmlToText(content));
    }
  }

  const closing =
    readString(posting.additionalPlain) ??
    (readString(posting.additional)
      ? htmlToText(posting.additional as string)
      : null);
  if (closing) parts.push(closing);

  const joined = parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  return joined ? joined : null;
}

/**
 * Lever has no company display name in the payload, so fall back to the slug.
 * "acme-corp" reads better as "Acme Corp" than as the raw slug.
 */
export function companyFromSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const leverReader = {
  name: "lever",

  matches(url: URL): boolean {
    return parseLeverUrl(url) !== null;
  },

  async read(url: URL, fetchJson: FetchJson): Promise<ReaderResult | null> {
    const ref = parseLeverUrl(url);
    if (!ref) return null;

    const raw = await fetchJson(
      `${API}/${encodeURIComponent(ref.company)}/${encodeURIComponent(ref.postingId)}`,
    );
    if (!raw) return null;

    // The single-posting endpoint returns an object, but tolerate an array in
    // case a caller passes a company-level response through.
    const posting = (Array.isArray(raw) ? raw[0] : raw) as
      | LeverPosting
      | undefined;
    if (!posting) return null;

    const role = readString(posting.text);
    const description = buildLeverDescription(posting);
    if (!role && !description) return null;

    return {
      role,
      // The page's own title or og:site_name is usually better; the pipeline
      // lets a later reader fill the company in if it has something stronger.
      company: companyFromSlug(ref.company),
      description,
      url: canonicalizeUrl(readString(posting.hostedUrl) ?? url.toString()),
      source: "lever",
      confidence: "high",
    };
  },
} satisfies BoardReader;
