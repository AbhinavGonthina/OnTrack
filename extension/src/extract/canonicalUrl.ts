/**
 * Section 7.4 of the build spec. Two postings are "the same job" when their
 * canonical URLs match, which is what the duplicate check compares.
 *
 * There is a deliberate twin of this in Java:
 * backend/src/main/java/com/ontrack/backend/service/ApplicationUrlCanonicalizer.java.
 * Both are driven by the same table of cases, kept in
 * extension/test/fixtures/canonical-url-cases.json and read by both test
 * suites, so the two cannot drift apart silently.
 *
 * This TypeScript copy decides what the popup prefills. The Java copy is used
 * only for the duplicate lookup; what actually gets stored still goes through
 * the existing ApplicationService.normalizeApplicationUrl.
 */

/** Analytics and attribution parameters that never identify the posting. */
const TRACKING_PARAMS = new Set([
  "gh_src",
  "source",
  "lever-source",
  "lever-origin",
  "ref",
  "refid",
  "trk",
  "trackingid",
  "src",
  "fbclid",
  "gclid",
]);

function isTrackingParam(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.startsWith("utm_") || TRACKING_PARAMS.has(lower);
}

/** LinkedIn postings are reachable by several routes; they all mean this one. */
function linkedInCanonical(url: URL): URL | null {
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;

  const viewMatch = /^\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(url.pathname);
  const id = viewMatch?.[1] ?? url.searchParams.get("currentJobId");
  if (!id || !/^\d+$/.test(id)) return null;

  return new URL(`https://www.linkedin.com/jobs/view/${id}/`);
}

/**
 * Collapses the page you land on after applying back to the posting itself,
 * so logging a job from the confirmation screen still matches the posting.
 */
function stripPostApplySuffix(pathname: string, hostname: string): string {
  const host = hostname.toLowerCase();

  if (host.endsWith("lever.co")) {
    return pathname.replace(/\/(apply|thanks)\/?$/i, "");
  }
  if (host.endsWith("ashbyhq.com")) {
    return pathname.replace(/\/application\/?$/i, "");
  }
  if (host.endsWith("greenhouse.io")) {
    return pathname.replace(/\/confirmation\/?$/i, "");
  }
  return pathname;
}

/**
 * Returns a stable form of a posting URL, or the trimmed input when it cannot
 * be parsed (the caller decides whether that is an error).
 */
export function canonicalizeUrl(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";

  let url: URL;
  try {
    // A bare "boards.greenhouse.io/acme/jobs/1" should still canonicalize.
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return trimmed;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return trimmed;

  const linkedIn = linkedInCanonical(url);
  if (linkedIn) return linkedIn.toString();

  // Lowercase scheme and host. URL already lowercases both, but the path's
  // case is meaningful and must be left alone.
  url.hash = "";

  for (const name of [...url.searchParams.keys()]) {
    if (isTrackingParam(name)) url.searchParams.delete(name);
  }

  url.pathname = stripPostApplySuffix(url.pathname, url.hostname);

  // Drop a trailing slash, except on the root path.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  // URL keeps a "?" when every parameter has been removed.
  let result = url.toString();
  if (result.endsWith("?")) result = result.slice(0, -1);
  return result;
}
