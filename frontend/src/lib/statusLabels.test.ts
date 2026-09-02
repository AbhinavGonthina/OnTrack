import { describe, expect, test } from "vitest";
import { getStatusColor } from "./statusLabels";

describe("getStatusColor", () => {
  test("returns the fixed status-good color for OFFER", () => {
    expect(getStatusColor("OFFER")).toBe("#059669");
  });

  test("returns the fixed status-critical color for REJECTED", () => {
    expect(getStatusColor("REJECTED")).toBe("#e11d48");
  });

  test("returns the pipeline-ramp CSS variable for in-progress stages", () => {
    expect(getStatusColor("APPLIED")).toBe("var(--pipeline-1)");
    expect(getStatusColor("OA")).toBe("var(--pipeline-2)");
    expect(getStatusColor("PHONE_SCREEN")).toBe("var(--pipeline-3)");
    expect(getStatusColor("ONSITE_FINAL")).toBe("var(--pipeline-4)");
  });
});
