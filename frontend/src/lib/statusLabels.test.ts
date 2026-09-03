import { describe, expect, test } from "vitest";
import { LOGGABLE_STATUSES, OFFER_RESPONSE_STATUSES, getStatusColor } from "./statusLabels";

describe("getStatusColor", () => {
  test("returns the fixed status-good color for OFFER and ACCEPTED", () => {
    expect(getStatusColor("OFFER")).toBe("#059669");
    expect(getStatusColor("ACCEPTED")).toBe("#059669");
  });

  test("returns the fixed status-critical color for REJECTED", () => {
    expect(getStatusColor("REJECTED")).toBe("#e11d48");
  });

  test("returns the fixed status-neutral color for DECLINED", () => {
    expect(getStatusColor("DECLINED")).toBe("#71717a");
  });

  test("returns the pipeline-ramp CSS variable for in-progress stages", () => {
    expect(getStatusColor("APPLIED")).toBe("var(--pipeline-1)");
    expect(getStatusColor("OA")).toBe("var(--pipeline-2)");
    expect(getStatusColor("PHONE_SCREEN")).toBe("var(--pipeline-3)");
    expect(getStatusColor("INTERVIEW")).toBe("var(--pipeline-4)");
  });
});

describe("LOGGABLE_STATUSES / OFFER_RESPONSE_STATUSES", () => {
  test("excludes APPLIED and the offer-response statuses from the normal loggable list", () => {
    expect(LOGGABLE_STATUSES).not.toContain("APPLIED");
    expect(LOGGABLE_STATUSES).not.toContain("ACCEPTED");
    expect(LOGGABLE_STATUSES).not.toContain("DECLINED");
  });

  test("offer-response statuses are exactly Accepted and Declined", () => {
    expect(OFFER_RESPONSE_STATUSES).toEqual(["ACCEPTED", "DECLINED"]);
  });
});
