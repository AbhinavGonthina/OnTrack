import { canonicalizeUrl } from "../canonicalUrl";
import { elementToText } from "../htmlToText";
import type { Reader, ReaderResult } from "../types";

/**
 * LinkedIn (Section 7.3).
 *
 * LinkedIn has no public posting API and changes its markup often, so every
 * field is an ordered list of candidate selectors rather than one selector.
 * The first candidate that yields text wins, which means a single rename on
 * their side degrades one candidate instead of breaking the reader.
 *
 * The public (signed-out) hooks were verified on 2026-10-22 against two real
 * postings, saved as fixtures. The signed-in hooks could NOT be verified: that
 * needs a logged-in session, which an unattended run has no business creating.
 * They are included from the rendered DOM's documented structure and are
 * listed after the verified ones, so an unverified selector can only ever be a
 * fallback. This is called out in the final report as needing a live check.
 */

/** Ordered best-first. Earlier entries are the verified public ones. */
const ROLE_SELECTORS = [
  // Verified against the saved fixtures.
  "h1.top-card-layout__title",
  "h2.top-card-layout__title",
  ".topcard__title",
  // Signed-in, unverified.
  ".jobs-unified-top-card__job-title",
  ".job-details-jobs-unified-top-card__job-title",
  ".t-24.job-details-jobs-unified-top-card__job-title",
  "h1",
];

const COMPANY_SELECTORS = [
  // Verified.
  "a.topcard__org-name-link",
  ".topcard__flavor--black-link",
  ".top-card-layout__card .topcard__flavor",
  // Signed-in, unverified.
  ".jobs-unified-top-card__company-name",
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
];

const DESCRIPTION_SELECTORS = [
  // Verified.
  ".show-more-less-html__markup",
  ".description__text",
  // Signed-in, unverified.
  "#job-details",
  ".jobs-description__content",
  ".jobs-box__html-content",
];

/** Returns the first selector that yields non-empty text. */
function firstText(doc: Document, selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    const text = element?.textContent?.replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return null;
}

function firstElement(doc: Document, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element?.textContent?.trim()) return element;
  }
  return null;
}

/** /jobs/view/{id}, a slug ending in the id, or ?currentJobId={id}. */
export function linkedInJobId(url: URL): string | null {
  const fromPath = /^\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(url.pathname);
  if (fromPath?.[1]) return fromPath[1];

  const current = url.searchParams.get("currentJobId");
  return current && /^\d+$/.test(current) ? current : null;
}

export const linkedInReader = {
  name: "linkedin",

  matches(url: URL): boolean {
    return (
      /(^|\.)linkedin\.com$/i.test(url.hostname) && linkedInJobId(url) !== null
    );
  },

  read(doc: Document, url: URL): ReaderResult | null {
    const role = firstText(doc, ROLE_SELECTORS);
    const company = firstText(doc, COMPANY_SELECTORS);
    const descriptionElement = firstElement(doc, DESCRIPTION_SELECTORS);
    const description = elementToText(descriptionElement) || null;

    if (!role && !company && !description) return null;

    return {
      role,
      company,
      description,
      url: canonicalizeUrl(url.toString()),
      source: "linkedin",
      // Selector based rather than structured, so never "high".
      confidence: "medium",
    };
  },
} satisfies Reader;
