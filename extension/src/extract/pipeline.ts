import { MAX_DESCRIPTION_CHARS } from "../config";
import { canonicalizeUrl } from "./canonicalUrl";
import { truncateAtParagraph } from "./htmlToText";
import { ashbyReader } from "./readers/ashby";
import { greenhouseReader } from "./readers/greenhouse";
import { heuristicReader } from "./readers/heuristic";
import { jsonLdReader } from "./readers/jsonld";
import { leverReader } from "./readers/lever";
import { linkedInReader } from "./readers/linkedin";
import { workdayReader } from "./readers/workday";
import type {
  BoardReader,
  ExtractionResult,
  FetchJson,
  Reader,
  ReaderResult,
} from "./types";

/**
 * Section 7. Readers run best-first and the pipeline stops as soon as it has
 * both a company and a role, because everything below the current reader is
 * strictly less reliable.
 *
 * Merging is field by field rather than all-or-nothing: a board API often
 * knows the role and the description but not the company (Ashby carries no
 * company at all), and the page's own metadata usually does. Taking the first
 * complete result would throw that away.
 */

/** Readers that fetch a board API. Run in the service worker. */
export const BOARD_READERS: BoardReader[] = [
  greenhouseReader,
  leverReader,
  ashbyReader,
];

/**
 * Readers that read the page. Run inside the tab.
 * Order matters: structured data, then site-specific DOM, then guesswork.
 */
export const PAGE_READERS: Reader[] = [
  jsonLdReader,
  workdayReader,
  linkedInReader,
  heuristicReader,
];

const DESCRIPTION_TRUNCATED_NOTE =
  "Description shortened to fit OnTrack's 20,000 character limit.";

function clean(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed : null;
}

interface Accumulator {
  company: string | null;
  role: string | null;
  description: string | null;
  url: string | null;
  notes: string[];
  /** Source of whichever reader supplied the description, per Section 7. */
  descriptionSource: ReaderResult["source"] | null;
  bestSource: ReaderResult["source"] | null;
  bestConfidence: ReaderResult["confidence"] | null;
}

/**
 * Folds one reader's output in. Only fills gaps, so an earlier (better) reader
 * is never overwritten by a later one.
 */
export function mergeReaderResult(
  accumulator: Accumulator,
  result: ReaderResult | null,
): Accumulator {
  if (!result) return accumulator;

  const next = { ...accumulator };
  let contributed = false;

  const company = clean(result.company);
  if (!next.company && company) {
    next.company = company;
    contributed = true;
  }

  const role = clean(result.role);
  if (!next.role && role) {
    next.role = role;
    contributed = true;
  }

  // Descriptions keep their newlines, so they do not go through clean().
  const description = result.description?.trim() || null;
  if (!next.description && description) {
    next.description = description;
    next.descriptionSource = result.source;
    contributed = true;
  }

  if (!next.url && result.url) next.url = result.url;

  if (result.notes?.length) next.notes = [...next.notes, ...result.notes];

  // The headline source is whichever reader first contributed anything, which
  // is the most reliable one that had something to say.
  if (contributed && !next.bestSource) {
    next.bestSource = result.source;
    next.bestConfidence = result.confidence;
  }

  return next;
}

/** True once there is nothing more worth running a reader for. */
export function isComplete(accumulator: Accumulator): boolean {
  return Boolean(accumulator.company && accumulator.role);
}

function emptyAccumulator(): Accumulator {
  return {
    company: null,
    role: null,
    description: null,
    url: null,
    notes: [],
    descriptionSource: null,
    bestSource: null,
    bestConfidence: null,
  };
}

export function finalize(
  accumulator: Accumulator,
  pageUrl: URL,
): ExtractionResult {
  const notes = [...accumulator.notes];

  let description = accumulator.description;
  if (description) {
    const truncation = truncateAtParagraph(description, MAX_DESCRIPTION_CHARS);
    description = truncation.text;
    if (truncation.truncated) notes.push(DESCRIPTION_TRUNCATED_NOTE);
  }

  // The description's source is what the caption names, because that is the
  // field the user is most likely to be checking.
  const source =
    accumulator.descriptionSource ?? accumulator.bestSource ?? "manual";

  return {
    company: accumulator.company,
    role: accumulator.role,
    description,
    url: accumulator.url ?? canonicalizeUrl(pageUrl.toString()),
    source,
    confidence: accumulator.bestConfidence ?? "low",
    notes,
  };
}

export interface RunPipelineOptions {
  doc: Document;
  url: URL;
  /** Same-origin fetch from inside the page (Workday). */
  pageFetchJson: FetchJson;
  /** Cross-origin fetch from the worker (board APIs). Omitted in-page. */
  boardFetchJson?: FetchJson;
  pageReaders?: Reader[];
  boardReaders?: BoardReader[];
}

/**
 * Runs the readers in order and returns the merged result. Always returns a
 * result; an empty one simply means no reader found anything, which the popup
 * shows as the Unreadable state.
 */
export async function runPipeline(
  options: RunPipelineOptions,
): Promise<ExtractionResult> {
  const {
    doc,
    url,
    pageFetchJson,
    boardFetchJson,
    pageReaders = PAGE_READERS,
    boardReaders = BOARD_READERS,
  } = options;

  let accumulator = emptyAccumulator();

  // 1. Board APIs, the most reliable source, when one owns this URL.
  if (boardFetchJson) {
    for (const reader of boardReaders) {
      if (!reader.matches(url)) continue;
      try {
        accumulator = mergeReaderResult(
          accumulator,
          await reader.read(url, boardFetchJson),
        );
      } catch {
        // One reader throwing must not lose the others' work.
      }
      if (isComplete(accumulator)) break;
    }
  }

  // 2-4. Page readers, in declining order of reliability.
  for (const reader of pageReaders) {
    if (isComplete(accumulator)) break;
    if (!reader.matches(url)) continue;
    try {
      accumulator = mergeReaderResult(
        accumulator,
        await reader.read(doc, url, pageFetchJson),
      );
    } catch {
      /* keep going */
    }
  }

  return finalize(accumulator, url);
}
