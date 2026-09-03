import { describe, expect, test } from "vitest";
import { buildSankeyData, getNodeColor, getNodeLabel, isRejectedNode, orderNodeNames } from "./sankeyColors";
import type { SankeyLink } from "@/lib/types";

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
    expect(getNodeColor("OFFER")).toBe("#059669");
  });

  test("any rejected node gets the fixed status-critical color", () => {
    expect(getNodeColor("REJECTED_OA")).toBe("#e11d48");
    expect(getNodeColor("REJECTED_INTERVIEW")).toBe("#e11d48");
  });

  test("progress stages get their pipeline-ramp CSS variable", () => {
    expect(getNodeColor("APPLIED")).toBe("var(--pipeline-1)");
    expect(getNodeColor("INTERVIEW")).toBe("var(--pipeline-4)");
  });

  test("a round-numbered interview node gets the same pipeline-ramp color regardless of round", () => {
    expect(getNodeColor("INTERVIEW_1")).toBe("var(--pipeline-4)");
    expect(getNodeColor("INTERVIEW_3")).toBe("var(--pipeline-4)");
  });

  test("falls back to a neutral color for an unrecognized name", () => {
    expect(getNodeColor("SOMETHING_UNEXPECTED")).toBe("#898781");
  });
});

describe("getNodeLabel", () => {
  test("humanizes plain stage names", () => {
    expect(getNodeLabel("PHONE_SCREEN")).toBe("Phone Screen");
    expect(getNodeLabel("INTERVIEW")).toBe("Interview");
  });

  test("humanizes rejected-from-stage names with the originating stage", () => {
    expect(getNodeLabel("REJECTED_OA")).toBe("Rejected (OA)");
    expect(getNodeLabel("REJECTED_PHONE_SCREEN")).toBe("Rejected (Phone Screen)");
    expect(getNodeLabel("REJECTED_INTERVIEW")).toBe("Rejected (Interview)");
  });

  test("labels a round-numbered interview node with its round number", () => {
    expect(getNodeLabel("INTERVIEW_1")).toBe("Interview (Round 1)");
    expect(getNodeLabel("INTERVIEW_2")).toBe("Interview (Round 2)");
  });
});

describe("orderNodeNames", () => {
  test("orders progress stages before their rejected variants, funnel-order", () => {
    const names = new Set(["REJECTED_OA", "OFFER", "APPLIED", "OA"]);
    expect(orderNodeNames(names)).toEqual(["APPLIED", "OA", "OFFER", "REJECTED_OA"]);
  });

  test("expands round-numbered interview nodes in numeric order, between Phone Screen and Offer", () => {
    const names = new Set(["APPLIED", "INTERVIEW_2", "INTERVIEW_1", "OFFER"]);
    expect(orderNodeNames(names)).toEqual(["APPLIED", "INTERVIEW_1", "INTERVIEW_2", "OFFER"]);
  });

  test("still includes an unrecognized name rather than dropping it", () => {
    const names = new Set(["APPLIED", "MYSTERY_STAGE"]);
    expect(orderNodeNames(names)).toEqual(["APPLIED", "MYSTERY_STAGE"]);
  });
});

describe("buildSankeyData", () => {
  test("keeps every link when the history only ever moves forward", () => {
    const links: SankeyLink[] = [
      { source: "APPLIED", target: "OA", value: 3 },
      { source: "OA", target: "OFFER", value: 1 },
      { source: "OA", target: "REJECTED_OA", value: 2 },
    ];

    expect(buildSankeyData(links).links).toHaveLength(3);
  });

  // Regression test: editing an application's status history "backward" (e.g. logging OA,
  // then Phone Screen, then OA again) produces a link pointing from a later canonical stage
  // back to an earlier one - a cycle. Recharts' Sankey (built on d3-sankey) computes node
  // depth by recursing over the graph, and a real cycle here previously overflowed the call
  // stack ("Maximum call stack size exceeded") once it reached the actual chart component.
  test("drops a backward link that would otherwise form a cycle", () => {
    const links: SankeyLink[] = [
      { source: "APPLIED", target: "OA", value: 1 },
      { source: "OA", target: "PHONE_SCREEN", value: 1 },
      { source: "PHONE_SCREEN", target: "OA", value: 1 },
      { source: "OA", target: "OFFER", value: 1 },
    ];

    const data = buildSankeyData(links);

    expect(data.links).toHaveLength(3);
    const oaIndex = data.nodes.findIndex((n) => n.name === "OA");
    const phoneScreenIndex = data.nodes.findIndex((n) => n.name === "PHONE_SCREEN");
    const hasBackwardLink = data.links.some((l) => l.source === phoneScreenIndex && l.target === oaIndex);
    expect(hasBackwardLink).toBe(false);
  });

  // With the backend now numbering each interview round globally per application, multiple
  // rounds (even alternating types, e.g. Technical then Behavioral then Technical again) no
  // longer collide on one "INTERVIEW" node - each round is distinct, so no link needs to be
  // dropped at all here, unlike the plain-stage backward case above.
  test("keeps every link across multiple numbered interview rounds", () => {
    const links: SankeyLink[] = [
      { source: "APPLIED", target: "OA", value: 1 },
      { source: "OA", target: "INTERVIEW_1", value: 1 },
      { source: "INTERVIEW_1", target: "INTERVIEW_2", value: 1 },
      { source: "INTERVIEW_2", target: "INTERVIEW_3", value: 1 },
      { source: "INTERVIEW_3", target: "OFFER", value: 1 },
    ];

    const data = buildSankeyData(links);

    expect(data.links).toHaveLength(5);
    expect(data.nodes.map((n) => n.name)).toEqual([
      "APPLIED",
      "OA",
      "INTERVIEW_1",
      "INTERVIEW_2",
      "INTERVIEW_3",
      "OFFER",
    ]);
  });
});
