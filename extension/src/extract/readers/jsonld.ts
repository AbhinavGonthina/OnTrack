import { canonicalizeUrl } from "../canonicalUrl";
import { htmlToText } from "../htmlToText";
import type { Reader, ReaderResult } from "../types";

/**
 * Section 7.1. schema.org JobPosting is the closest thing to a standard here:
 * most applicant tracking systems emit it for SEO, including sites with no
 * dedicated reader of their own, so this one covers the long tail.
 */

type Json = unknown;

function asRecord(value: Json): Record<string, Json> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : null;
}

/** @type is a string on most sites and an array on a few. */
function isJobPosting(node: Record<string, Json>): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type.toLowerCase() === "jobposting";
  if (Array.isArray(type)) {
    return type.some(
      (entry) => typeof entry === "string" && entry.toLowerCase() === "jobposting",
    );
  }
  return false;
}

/**
 * Walks whatever shape the block turned out to be. A single block legitimately
 * contains a bare object, an array of objects, or an @graph wrapper, and real
 * pages nest them, so recurse rather than special-casing the three.
 */
function* walkNodes(value: Json, depth = 0): Generator<Record<string, Json>> {
  if (depth > 6) return;

  if (Array.isArray(value)) {
    for (const entry of value) yield* walkNodes(entry, depth + 1);
    return;
  }

  const record = asRecord(value);
  if (!record) return;

  yield record;

  const graph = record["@graph"];
  if (graph !== undefined) yield* walkNodes(graph, depth + 1);
}

function readString(value: Json): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

/** hiringOrganization is usually an Organization object, sometimes a bare name. */
function readCompany(node: Record<string, Json>): string | null {
  const org = node["hiringOrganization"];

  const direct = readString(org);
  if (direct) return direct;

  const record = asRecord(org);
  if (record) {
    const name = readString(record["name"]);
    if (name) return name;
    const legal = readString(record["legalName"]);
    if (legal) return legal;
  }

  // Some pages only carry the brand at the top level.
  return readString(node["name"]) && !readString(node["title"])
    ? readString(node["name"])
    : null;
}

/** Collects every JobPosting node across every ld+json block on the page. */
export function findJobPostingNodes(doc: Document): Record<string, Json>[] {
  const blocks = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  );

  const found: Record<string, Json>[] = [];
  for (const block of blocks) {
    const raw = block.textContent;
    if (!raw || !raw.trim()) continue;

    let parsed: Json;
    try {
      parsed = JSON.parse(raw) as Json;
    } catch {
      // One malformed block must not stop the others. Sites frequently ship a
      // broken analytics blob alongside a perfectly good JobPosting.
      continue;
    }

    for (const node of walkNodes(parsed)) {
      if (isJobPosting(node)) found.push(node);
    }
  }
  return found;
}

/**
 * `satisfies` rather than a `Reader` annotation: it still checks the shape
 * against the interface, but keeps this reader's concrete synchronous return
 * type instead of widening it to the interface's `| Promise<...>`, which would
 * force every caller and test to await something that never defers.
 */
export const jsonLdReader = {
  name: "jsonld",

  // Worth trying on anything.
  matches: () => true,

  read(doc: Document, url: URL): ReaderResult | null {
    const nodes = findJobPostingNodes(doc);
    if (nodes.length === 0) return null;

    // Pick the richest node rather than the first: a page occasionally carries
    // a stub JobPosting for a related role alongside the real one.
    const node = nodes.reduce((best, candidate) => {
      const score = (entry: Record<string, Json>) =>
        (readString(entry["title"]) ? 2 : 0) +
        (readCompany(entry) ? 2 : 0) +
        (readString(entry["description"]) ? 1 : 0);
      return score(candidate) > score(best) ? candidate : best;
    });

    const role = readString(node["title"]);
    const company = readCompany(node);
    const descriptionHtml = readString(node["description"]);
    const postingUrl = readString(node["url"]);

    if (!role && !company && !descriptionHtml) return null;

    return {
      role,
      company,
      description: descriptionHtml ? htmlToText(descriptionHtml) : null,
      url: canonicalizeUrl(postingUrl ?? url.toString()),
      source: "jsonld",
      confidence: "high",
    };
  },
} satisfies Reader;
