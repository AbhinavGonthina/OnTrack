import { describe, expect, test } from "vitest";
import { getStatusColor } from "./statusLabels";

describe("getStatusColor", () => {
  test("returns the fixed status-good color for OFFER", () => {
    expect(getStatusColor("OFFER")).toBe("#0ca30c");
  });

  test("returns the fixed status-critical color for REJECTED", () => {
    expect(getStatusColor("REJECTED")).toBe("#d03b3b");
  });

  test("returns the pipeline-ramp CSS variable for in-progress stages", () => {
    expect(getStatusColor("APPLIED")).toBe("var(--pipeline-1)");
    expect(getStatusColor("OA")).toBe("var(--pipeline-2)");
    expect(getStatusColor("PHONE_SCREEN")).toBe("var(--pipeline-3)");
    expect(getStatusColor("ONSITE_FINAL")).toBe("var(--pipeline-4)");
  });
});
