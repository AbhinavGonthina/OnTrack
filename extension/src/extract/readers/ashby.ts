import { canonicalizeUrl } from "../canonicalUrl";
import { htmlToText } from "../htmlToText";
import type { BoardReader, FetchJson, ReaderResult } from "../types";

/**
 * Ashby, via its public job board API (Section 7.2).
 *
 * Verified live on 2026-10-22 against
 * api.ashbyhq.com/posting-api/job-board/linear. The endpoint is org-level
 * rather than per-posting, returning jobs[] with id, title, descriptionPlain,
 * descriptionHtml, jobUrl and applyUrl, so the reader fetches the board and
 * picks the entry whose id matches the URL.
 *
 * Nothing in the payload names the company, not even at the top level, so the
 * company has to come from the page (og:site_name or the title) with the org
 * slug as the last resort. companyFromAshbyDoc handles that.
 */

const API = "https://api.ashbyhq.com/posting-api/job-board";

interface AshbyJob {
  id?: unknown;
  title?: unknown;
  descriptionPlain?: unknown;
  descriptionHtml?: unknown;
  jobUrl?: unknown;
}
interface AshbyBoard {
  jobs?: unknown;
}

export interface AshbyRef {
  org: string;
  jobId: string;
}

/** jobs.ashbyhq.com/{org}/{jobId}, with an optional /application suffix. */
export function parseAshbyUrl(url: URL): AshbyRef | null {
  if (!/(^|\.)ashbyhq\.com$/i.test(url.hostname)) return null;

  const match = /^\/([^/]+)\/([^/]+)/.exec(url.pathname);
  const org = match?.[1];
  const jobId = match?.[2];
  if (!org || !jobId) return null;
  if (/^application$/i.test(jobId)) return null;

  return { org, jobId };
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * The company name the API does not provide. og:site_name is the most reliable
 * on an Ashby board; the document title is "Role @ Company" or "Company - Role".
 */
export function companyFromAshbyDoc(doc: Document, org: string): string | null {
  const siteName = doc
    .querySelector('meta[property="og:site_name"]')
    ?.getAttribute("content");
  if (readString(siteName)) return (siteName as string).trim();

  const title = doc.querySelector("title")?.textContent ?? "";
  const at = /\s+@\s+(.+)$/.exec(title);
  if (at?.[1]) return at[1].trim();

  // Fall back to the slug, title cased.
  return org
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const ashbyReader = {
  name: "ashby",

  matches(url: URL): boolean {
    return parseAshbyUrl(url) !== null;
  },

  async read(url: URL, fetchJson: FetchJson): Promise<ReaderResult | null> {
    const ref = parseAshbyUrl(url);
    if (!ref) return null;

    const board = (await fetchJson(
      `${API}/${encodeURIComponent(ref.org)}`,
    )) as AshbyBoard | null;
    if (!board || !Array.isArray(board.jobs)) return null;

    const job = (board.jobs as AshbyJob[]).find(
      (entry) => readString(entry.id) === ref.jobId,
    );
    if (!job) return null;

    const role = readString(job.title);
    // descriptionPlain is already what the page renders; only fall back to
    // converting the HTML when it is missing.
    const description =
      readString(job.descriptionPlain) ??
      (readString(job.descriptionHtml)
        ? htmlToText(job.descriptionHtml as string)
        : null);

    if (!role && !description) return null;

    return {
      role,
      // Deliberately absent: the pipeline fills it from the page, because the
      // API carries no company name at all.
      description,
      url: canonicalizeUrl(readString(job.jobUrl) ?? url.toString()),
      source: "ashby",
      confidence: "high",
    };
  },
} satisfies BoardReader;
