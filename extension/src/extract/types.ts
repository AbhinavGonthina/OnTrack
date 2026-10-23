/** Where a field came from. Shown to the user as a source caption, so the
 *  values double as the keys for the captions in ../copy.ts. */
export type ExtractionSource =
  | "jsonld"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "linkedin"
  | "heuristic"
  | "ai"
  | "manual";

export interface ExtractionResult {
  company: string | null;
  role: string | null;
  /** Plain text, paragraphs and "- " bullets preserved, <= 20000 chars. */
  description: string | null;
  /** Canonical posting URL (see canonicalUrl.ts). */
  url: string;
  source: ExtractionSource;
  confidence: "high" | "medium" | "low";
  /** User-visible notes, e.g. the description-truncated message. */
  notes: string[];
}

/**
 * What a single reader returns. The pipeline merges these field by field, so a
 * reader that only knows the company says nothing about the role rather than
 * claiming null for it.
 */
export interface ReaderResult {
  company?: string | null;
  role?: string | null;
  description?: string | null;
  url?: string | null;
  source: ExtractionSource;
  confidence: "high" | "medium" | "low";
  notes?: string[];
}

/**
 * A reader reads the page it is given. Readers are pure so every one of them
 * can be unit tested against saved HTML with jsdom, with no browser involved.
 */
export interface Reader {
  name: ExtractionSource;
  /** Cheap check so the pipeline can skip readers that cannot apply. */
  matches(url: URL): boolean;
  read(doc: Document, url: URL): Promise<ReaderResult | null> | ReaderResult | null;
}

/** Text the AI fallback would be given, collected while the extractor runs so
 *  the popup never has to re-inject a script to get it. */
export interface PageSnapshot {
  url: string;
  title: string;
  /** Visible page text, already truncated to the backend's 30000 limit. */
  text: string;
}

/** What the injected script hands back to the popup. */
export interface ExtractionPayload {
  result: ExtractionResult;
  snapshot: PageSnapshot;
}
