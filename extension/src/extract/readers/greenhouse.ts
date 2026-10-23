import { canonicalizeUrl } from "../canonicalUrl";
import { htmlToText } from "../htmlToText";
import type { BoardReader, FetchJson, ReaderResult } from "../types";

/**
 * Greenhouse, via its public board API (Section 7.2).
 *
 * Verified live on 2026-10-22 against
 * boards-api.greenhouse.io/v1/boards/figma/jobs/6223155004. The response
 * carries title, content, absolute_url, location.name and, usefully,
 * company_name. The build spec expected the company to need a second call to
 * /v1/boards/{board} for its display name; company_name makes that call a
 * fallback rather than the normal path.
 *
 * content is HTML that has been HTML-escaped for transport ("&lt;p&gt;"), which
 * htmlToText unescapes before parsing.
 */

const API = "https://boards-api.greenhouse.io/v1/boards";

interface GreenhouseLocation {
  name?: unknown;
}
interface GreenhouseJob {
  title?: unknown;
  content?: unknown;
  absolute_url?: unknown;
  company_name?: unknown;
  location?: GreenhouseLocation;
}

export interface GreenhouseRef {
  board: string;
  jobId: string;
}

/**
 * Greenhouse postings appear under three shapes: the two hosted board domains
 * and a company's own careers page that embeds the board and carries the id in
 * a gh_jid query parameter.
 */
export function parseGreenhouseUrl(url: URL): GreenhouseRef | null {
  const host = url.hostname.toLowerCase();

  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    // /{board}/jobs/{id}
    const match = /^\/([^/]+)\/jobs\/(\d+)/.exec(url.pathname);
    if (match?.[1] && match[2]) return { board: match[1], jobId: match[2] };
    return null;
  }

  // An embedded board on a company domain: the job id is in the query, and the
  // board token has to come from the page (see greenhouseBoardTokenFromDoc).
  const ghJid = url.searchParams.get("gh_jid");
  if (ghJid && /^\d+$/.test(ghJid)) {
    return { board: "", jobId: ghJid };
  }
  return null;
}

/**
 * Finds the board token on a company page that embeds a Greenhouse board. The
 * embed script is the reliable place; a data attribute is the fallback.
 */
export function greenhouseBoardTokenFromDoc(doc: Document): string | null {
  const scripts = Array.from(doc.querySelectorAll("script[src]"));
  for (const script of scripts) {
    const src = script.getAttribute("src") ?? "";
    const match = /[?&]for=([A-Za-z0-9_-]+)/.exec(src);
    if (match?.[1]) return match[1];
  }

  const attr = doc.querySelector("[data-board-token], [data-gh-board]");
  return (
    attr?.getAttribute("data-board-token") ??
    attr?.getAttribute("data-gh-board") ??
    null
  );
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export const greenhouseReader = {
  name: "greenhouse",

  matches(url: URL): boolean {
    return parseGreenhouseUrl(url) !== null;
  },

  async read(url: URL, fetchJson: FetchJson): Promise<ReaderResult | null> {
    const ref = parseGreenhouseUrl(url);
    // Without a board token there is no endpoint to call; the page's own
    // JSON-LD or DOM has to carry it instead.
    if (!ref || !ref.board) return null;

    const job = (await fetchJson(
      `${API}/${encodeURIComponent(ref.board)}/jobs/${encodeURIComponent(ref.jobId)}`,
    )) as GreenhouseJob | null;
    if (!job) return null;

    const role = readString(job.title);
    const descriptionHtml = readString(job.content);

    let company = readString(job.company_name);
    if (!company) {
      // Older boards omit company_name; the board's own record has a display
      // name. A failure here is not fatal, the popup can ask the user.
      const board = (await fetchJson(
        `${API}/${encodeURIComponent(ref.board)}`,
      )) as { name?: unknown } | null;
      company = readString(board?.name);
    }

    if (!role && !company && !descriptionHtml) return null;

    return {
      role,
      company,
      description: descriptionHtml ? htmlToText(descriptionHtml) : null,
      url: canonicalizeUrl(readString(job.absolute_url) ?? url.toString()),
      source: "greenhouse",
      confidence: "high",
    };
  },
} satisfies BoardReader;
