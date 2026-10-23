import { describe, expect, it } from "vitest";
import { canonicalizeUrl } from "../src/extract/canonicalUrl";
import cases from "./fixtures/canonical-url-cases.json";

/**
 * The shared table is the contract. The Java twin
 * (ApplicationUrlCanonicalizerTest) reads the same file, so a case added here
 * is asserted on both sides and the duplicate lookup cannot disagree with what
 * the popup prefilled.
 */
describe("canonicalizeUrl (shared table)", () => {
  for (const testCase of cases.cases) {
    it(testCase.name, () => {
      expect(canonicalizeUrl(testCase.input)).toBe(testCase.expected);
    });
  }
});

describe("canonicalizeUrl (idempotence)", () => {
  it("canonicalizing twice changes nothing the second time", () => {
    for (const testCase of cases.cases) {
      const once = canonicalizeUrl(testCase.input);
      expect(canonicalizeUrl(once), testCase.name).toBe(once);
    }
  });
});
