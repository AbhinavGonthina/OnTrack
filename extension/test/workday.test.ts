import { describe, expect, it, vi } from "vitest";
import {
  parseWorkdayUrl,
  workdayApiUrl,
  workdayReader,
} from "../src/extract/readers/workday";
import { loadFixture, parseHtml } from "./helpers";

const NVIDIA_URL =
  "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/Vietnam-Hanoi/Director--Engineering---Software-Engineering_JR2021061";
const NVIDIA_API =
  "https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/job/Vietnam-Hanoi/Director--Engineering---Software-Engineering_JR2021061";

const WORKDAY_URL =
  "https://workday.wd5.myworkdayjobs.com/Workday/job/Canada-BC-Vancouver/AI-Engineer_JR-0109305";
const WORKDAY_API =
  "https://workday.wd5.myworkdayjobs.com/wday/cxs/workday/Workday/job/Canada-BC-Vancouver/AI-Engineer_JR-0109305";

const emptyDoc = () => parseHtml("<html><head></head><body></body></html>");

function serve(map: Record<string, string>) {
  return vi.fn(async (url: string) => {
    const fixture = map[url];
    return fixture ? (JSON.parse(loadFixture(fixture)) as unknown) : null;
  });
}

describe("parseWorkdayUrl", () => {
  it("reads a URL that includes a locale segment", () => {
    expect(parseWorkdayUrl(new URL(NVIDIA_URL))).toEqual({
      tenant: "nvidia",
      site: "NVIDIAExternalCareerSite",
      jobPath: "Vietnam-Hanoi/Director--Engineering---Software-Engineering_JR2021061",
    });
  });

  it("reads a URL with no locale segment", () => {
    expect(parseWorkdayUrl(new URL(WORKDAY_URL))).toEqual({
      tenant: "workday",
      site: "Workday",
      jobPath: "Canada-BC-Vancouver/AI-Engineer_JR-0109305",
    });
  });

  it("ignores a listing page with no /job/ segment", () => {
    expect(
      parseWorkdayUrl(new URL("https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite")),
    ).toBeNull();
  });

  it("ignores a non-Workday host", () => {
    expect(parseWorkdayUrl(new URL("https://example.com/job/x"))).toBeNull();
  });
});

describe("workdayApiUrl", () => {
  it("builds the same-origin CXS path", () => {
    const url = new URL(NVIDIA_URL);
    const ref = parseWorkdayUrl(url)!;
    expect(workdayApiUrl(url, ref)).toBe(NVIDIA_API);
  });
});

describe("workdayReader against real captured API responses", () => {
  it("reads the posting from the CXS endpoint", async () => {
    const result = await workdayReader.read(
      emptyDoc(),
      new URL(NVIDIA_URL),
      serve({ [NVIDIA_API]: "workday/nvidia-director-engineering.json" }),
    );

    expect(result?.role).toBe("Director, Engineering – Software Engineering");
    expect(result?.source).toBe("workday");
    expect(result?.confidence).toBe("high");
    expect(result?.description).toContain("NVIDIA");
    expect(result?.description).not.toContain("<p>");
  });

  /**
   * The reason companyFromWorkdayDoc exists. This real posting reports
   * hiringOrganization.name as "VN01 NVIDIA Vietnam Company Limited", which is
   * accurate and useless: nobody writes that in a job tracker.
   */
  it("prefers the tenant name over the local legal entity", async () => {
    const result = await workdayReader.read(
      emptyDoc(),
      new URL(NVIDIA_URL),
      serve({ [NVIDIA_API]: "workday/nvidia-director-engineering.json" }),
    );

    expect(result?.company).toBe("Nvidia");
    expect(result?.company).not.toContain("VN01");
    expect(result?.company).not.toContain("Limited");
  });

  it("prefers og:site_name over the tenant when the page has one", async () => {
    const doc = parseHtml(
      '<html><head><meta property="og:site_name" content="NVIDIA" /></head></html>',
    );
    const result = await workdayReader.read(
      doc,
      new URL(NVIDIA_URL),
      serve({ [NVIDIA_API]: "workday/nvidia-director-engineering.json" }),
    );

    expect(result?.company).toBe("NVIDIA");
  });

  it("reads a second tenant with the same shape", async () => {
    const result = await workdayReader.read(
      emptyDoc(),
      new URL(WORKDAY_URL),
      serve({ [WORKDAY_API]: "workday/workday-ai-engineer.json" }),
    );

    expect(result?.role).toBe("AI Engineer");
    expect(result?.company).toBe("Workday");
    expect(result?.description?.length).toBeGreaterThan(300);
  });

  it("uses externalUrl as the canonical link", async () => {
    const result = await workdayReader.read(
      emptyDoc(),
      new URL(NVIDIA_URL),
      serve({ [NVIDIA_API]: "workday/nvidia-director-engineering.json" }),
    );

    expect(result?.url).toContain("NVIDIAExternalCareerSite/job/");
    expect(result?.url).not.toContain("/wday/cxs/");
  });
});

describe("workdayReader DOM fallback", () => {
  it("reads the rendered page when the API is unavailable", async () => {
    const doc = parseHtml(`<html><head><title>Careers at Acme</title></head><body>
      <h2 data-automation-id="jobPostingHeader">Staff Engineer</h2>
      <div data-automation-id="jobPostingDescription">
        <p>Build the thing.</p><ul><li>Ship code</li></ul>
      </div>
    </body></html>`);

    const result = await workdayReader.read(
      doc,
      new URL("https://acme.wd1.myworkdayjobs.com/External/job/Remote/Staff-Engineer_JR1"),
      vi.fn(async () => null),
    );

    expect(result?.role).toBe("Staff Engineer");
    expect(result?.company).toBe("Acme");
    expect(result?.description).toContain("Build the thing.");
    expect(result?.description).toContain("- Ship code");
    // Lower than the API path, because the page may still be rendering.
    expect(result?.confidence).toBe("medium");
  });

  it("returns null when neither the API nor the DOM has anything", async () => {
    const result = await workdayReader.read(
      emptyDoc(),
      new URL("https://acme.wd1.myworkdayjobs.com/External/job/Remote/Staff-Engineer_JR1"),
      vi.fn(async () => null),
    );
    expect(result).toBeNull();
  });
});
