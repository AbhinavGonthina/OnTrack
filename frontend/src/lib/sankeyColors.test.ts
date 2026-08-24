import { describe, expect, test } from "vitest";
import { getNodeColor, getNodeLabel, isRejectedNode, orderNodeNames } from "./sankeyColors";

describe("isRejectedNode", () => {
  test("true for rejected-from-stage synthetic node names", () => {
    expect(isRejectedNode("REJECTED_OA")).toBe(true);
    expect(isRejectedNode("REJECTED_APPLIED")).toBe(true);
  });

  test("false for progress/offer stage names", () => {
    expect(isRejectedNode("APPLIED")).toBe(false);
    expect(isRejectedNode("OFFER")).toBe(false);
  });
});

describe("getNodeColor", () => {
  test("offer gets the fixed status-good color", () => {
    expect(getNodeColor("OFFER")).toBe("#0ca30c");
  });

  test("any rejected node gets the fixed status-critical color", () => {
    expect(getNodeColor("REJECTED_OA")).toBe("#d03b3b");
    expect(getNodeColor("REJECTED_ONSITE_FINAL")).toBe("#d03b3b");
  });

  test("progress stages get their pipeline-ramp CSS variable", () => {
    expect(getNodeColor("APPLIED")).toBe("var(--pipeline-1)");
    expect(getNodeColor("ONSITE_FINAL")).toBe("var(--pipeline-4)");
  });

  test("falls back to a neutral color for an unrecognized name", () => {
    expect(getNodeColor("SOMETHING_UNEXPECTED")).toBe("#898781");
  });
});

describe("getNodeLabel", () => {
  test("humanizes plain stage names", () => {
    expect(getNodeLabel("PHONE_SCREEN")).toBe("Phone Screen");
    expect(getNodeLabel("ONSITE_FINAL")).toBe("Onsite");
  });

  test("humanizes rejected-from-stage names with the originating stage", () => {
    expect(getNodeLabel("REJECTED_OA")).toBe("Rejected (OA)");
    expect(getNodeLabel("REJECTED_PHONE_SCREEN")).toBe("Rejected (Phone Screen)");
  });
});

describe("orderNodeNames", () => {
  test("orders progress stages before their rejected variants, funnel-order", () => {
    const names = new Set(["REJECTED_OA", "OFFER", "APPLIED", "OA"]);
    expect(orderNodeNames(names)).toEqual(["APPLIED", "OA", "OFFER", "REJECTED_OA"]);
  });

  test("still includes an unrecognized name rather than dropping it", () => {
    const names = new Set(["APPLIED", "MYSTERY_STAGE"]);
    expect(orderNodeNames(names)).toEqual(["APPLIED", "MYSTERY_STAGE"]);
  });
});
