import { canonicalizeUrl } from "../canonicalUrl";
import { elementToText, htmlToText } from "../htmlToText";
import type { FetchJson, Reader, ReaderResult } from "../types";

/**
 * Workday (Section 7.2).
 *
 * Unlike the other boards this one is read from inside the page: the CXS
 * endpoint sits on the tenant's own host, so a same-origin fetch reaches it
 * with no host permission at all. That is also why this is a Reader rather
 * than a BoardReader, even though its best path is an API.
 *
 * Verified live on 2026-10-22 against
 * nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/job/...
 * which returns jobPostingInfo.{title, jobDescription, location, externalUrl}
 * and a hiringOrganization.
 *
 * A trap worth knowing: hiringOrganization.name is the local *legal entity*,
 * so that NVIDIA posting reports "VN01 NVIDIA Vietnam Company Limited". Saving
 * that as the company would be wrong in the user's list, so the page's own
 * branding and the tenant name are preferred and the legal name is last.
 */

interface WorkdayPostingInfo {
  title?: unknown;
  jobDescription?: unknown;
  externalUrl?: unknown;
  jobReqId?: unknown;
  location?: unknown;
}
interface WorkdayPayload {
  jobPostingInfo?: WorkdayPostingInfo;
  hiringOrganization?: { name?: unknown };
}

export interface WorkdayRef {
  tenant: string;
  site: string;
  /** The part after /job/, e.g. "Vietnam-Hanoi/Director--Engineering_JR123". */
  jobPath: string;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * {tenant}.wd{N}.myworkdayjobs.com/{locale?}/{site}/job/{location}/{slug}_{reqId}
 * The optional locale segment ("en-US") is what makes this fiddly.
 */
export function parseWorkdayUrl(url: URL): WorkdayRef | null {
  const host = url.hostname.toLowerCase();
  const hostMatch = /^([^.]+)\.wd\d+\.myworkdayjobs\.com$/.exec(host);
  const tenant = hostMatch?.[1];
  if (!tenant) return null;

  const segments = url.pathname.split("/").filter(Boolean);
  const jobIndex = segments.indexOf("job");
  if (jobIndex < 1 || jobIndex === segments.length - 1) return null;

  // The segment immediately before /job/ is the site id; anything before that
  // is a locale.
  const site = segments[jobIndex - 1];
  if (!site) return null;

  const jobPath = segments.slice(jobIndex + 1).join("/");
  if (!jobPath) return null;

  return { tenant, site, jobPath };
}

/** The CXS endpoint on the tenant's own host, so same-origin from the page. */
export function workdayApiUrl(url: URL, ref: WorkdayRef): string {
  return `${url.origin}/wday/cxs/${ref.tenant}/${ref.site}/job/${ref.jobPath}`;
}

/**
 * Workday pages title themselves "Role" or "Company Careers", and the tenant
 * slug is a decent brand name. The legal entity from hiringOrganization is
 * accurate but not what a person would write down, so it comes last.
 */
export function companyFromWorkdayDoc(
  doc: Document,
  tenant: string,
  legalName: string | null,
): string | null {
  const siteName = doc
    .querySelector('meta[property="og:site_name"]')
    ?.getAttribute("content");
  if (readString(siteName)) return (siteName as string).trim();

  const title = doc.querySelector("title")?.textContent ?? "";
  // "Careers at Acme", "Acme Careers", "Acme | Workday"
  const careersAt = /careers\s+at\s+(.+)$/i.exec(title);
  if (careersAt?.[1]) return careersAt[1].replace(/\s*\|.*$/, "").trim();

  if (tenant) {
    const pretty = tenant
      .split(/[-_]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    if (pretty) return pretty;
  }

  return legalName;
}

export const workdayReader = {
  name: "workday",

  matches(url: URL): boolean {
    return parseWorkdayUrl(url) !== null;
  },

  async read(
    doc: Document,
    url: URL,
    fetchJson: FetchJson,
  ): Promise<ReaderResult | null> {
    const ref = parseWorkdayUrl(url);
    if (!ref) return null;

    const payload = (await fetchJson(
      workdayApiUrl(url, ref),
    )) as WorkdayPayload | null;

    const info = payload?.jobPostingInfo;
    if (info) {
      const role = readString(info.title);
      const descriptionHtml = readString(info.jobDescription);
      const legalName = readString(payload?.hiringOrganization?.name);

      if (role || descriptionHtml) {
        return {
          role,
          company: companyFromWorkdayDoc(doc, ref.tenant, legalName),
          description: descriptionHtml ? htmlToText(descriptionHtml) : null,
          url: canonicalizeUrl(readString(info.externalUrl) ?? url.toString()),
          source: "workday",
          confidence: "high",
        };
      }
    }

    // The API is the good path; this is the rendered page when it is not.
    return readWorkdayDom(doc, url, ref);
  },
} satisfies Reader;

/**
 * Workday renders through data-automation-id hooks, which are far more stable
 * than its generated class names.
 */
export function readWorkdayDom(
  doc: Document,
  url: URL,
  ref: WorkdayRef,
): ReaderResult | null {
  const header = doc.querySelector('[data-automation-id="jobPostingHeader"]');
  const body = doc.querySelector('[data-automation-id="jobPostingDescription"]');

  const role = header?.textContent?.trim() || null;
  const description = elementToText(body);

  if (!role && !description) return null;

  return {
    role,
    company: companyFromWorkdayDoc(doc, ref.tenant, null),
    description: description || null,
    url: canonicalizeUrl(url.toString()),
    source: "workday",
    // The rendered page can be missing sections that are still loading.
    confidence: "medium",
  };
}
