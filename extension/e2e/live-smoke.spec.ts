import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  findTabId,
  launchWithExtension,
  type LoadedExtension,
} from "./fixtures/extension";
import { APP_URL, TEST_USER } from "./fixtures/stack";

/**
 * Section 11.5. Opens real, current, public job postings in a real browser
 * with the extension loaded and records what the readers actually got.
 *
 * This is the check the unit tests cannot do: fixtures are a snapshot of what
 * a board returned on one day, and the thing most likely to break this feature
 * over time is a site changing. It runs against the local backend only and
 * saves nothing.
 *
 * Opt in, because it depends on third-party sites being up and on those exact
 * postings still being open:
 *
 *   $env:E2E_LIVE_SMOKE="1"; npx playwright test e2e/live-smoke.spec.ts
 *
 * Results are appended to scratch/live-smoke-results.md for the report.
 */

const enabled = process.env.E2E_LIVE_SMOKE === "1";
const RESULTS = resolve(import.meta.dirname, "../.live-smoke-results.md");

interface Target {
  site: string;
  url: string;
  /** What the board's own API says, so the comparison is against truth. */
  expectRole?: RegExp;
}

/**
 * Resolved live on 2026-10-22 from each board's public API, so they were open
 * postings at the time of the run. A 404 here later means the job closed, not
 * that the reader broke.
 */
const TARGETS: Target[] = [
  {
    site: "Greenhouse",
    url: "https://job-boards.greenhouse.io/figma/jobs/6223155004",
    expectRole: /Compliance Engineer/i,
  },
  {
    site: "Lever",
    url: "https://jobs.lever.co/palantir/6ed76ce8-4156-4b60-b120-403538bd66cd",
    expectRole: /Administrative Business Partner/i,
  },
  {
    site: "Ashby",
    url: "https://jobs.ashbyhq.com/linear/d3bc1ced-3ce4-4086-a050-555055dbb1ff",
    expectRole: /Fullstack Engineer/i,
  },
  {
    site: "Workday",
    url: "https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/Vietnam-Hanoi/Director--Engineering---Software-Engineering_JR2021061",
    expectRole: /Director, Engineering/i,
  },
  {
    /**
     * A real page where no dedicated reader applies: an Ashby org listing has
     * no job id, so the Ashby reader declines and the page readers have to
     * carry it. Recorded, not asserted, because a listing legitimately has no
     * single role on it.
     *
     * The intent was a career page publishing schema.org JobPosting with no
     * dedicated reader behind it, but none was found live: of the sites
     * probed during this run, the only ones serving JobPosting on a job page
     * were Lever and Ashby, both of which have dedicated readers. The JSON-LD
     * reader is covered against two real captured pages in the unit tests,
     * and was separately observed reading a live Lever page end to end during
     * an earlier pass of this suite.
     */
    site: "Generic page (no dedicated reader)",
    url: "https://jobs.ashbyhq.com/ramp",
  },
  {
    site: "LinkedIn",
    url: "https://www.linkedin.com/jobs/view/4479305237",
  },
];

interface Outcome {
  site: string;
  url: string;
  company: string | null;
  role: string | null;
  descriptionChars: number;
  source: string | null;
  note: string;
}

const outcomes: Outcome[] = [];

let ext: LoadedExtension;

test.describe("live smoke test against real public postings", () => {
  test.skip(!enabled, "set E2E_LIVE_SMOKE=1 to run against live sites");

  test.beforeAll(async () => {
    // The smoke build, which stands in for the activeTab grant a real toolbar
    // click would give. See SMOKE_ONLY_HOSTS in wxt.config.ts.
    ext = await launchWithExtension({
      extensionPath: resolve(import.meta.dirname, "../.output/chrome-mv3-smoke"),
    });

    // Sign in to the LOCAL app. Without a session the popup shows the signed
    // out state on every page and never renders the form, so the readers'
    // output would be invisible.
    const page = await ext.context.newPage();
    await page.goto(`${APP_URL}/login`);
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page
      .locator('input[autocomplete="current-password"]')
      .fill(TEST_USER.password);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    await page.close();
  });

  test.afterAll(async () => {
    await ext?.close();

    // Written as a table so it can go straight into the report.
    const rows = outcomes
      .map(
        (o) =>
          `| ${o.site} | ${o.company ?? "(none)"} | ${o.role ?? "(none)"} | ` +
          `${o.descriptionChars} | ${o.source ?? "(none)"} | ${o.note} |`,
      )
      .join("\n");
    await mkdir(resolve(import.meta.dirname, ".."), { recursive: true });
    await appendFile(
      RESULTS,
      `\n## Live smoke ${new Date().toISOString()}\n\n` +
        "| Site | Company | Role | Description chars | Source | Note |\n" +
        "| --- | --- | --- | --- | --- | --- |\n" +
        `${rows}\n`,
      "utf8",
    );
    console.log(`\nlive smoke results written to ${RESULTS}`);
  });

  for (const target of TARGETS) {
    test(`reads a real ${target.site} posting`, async () => {
      const tab = await ext.context.newPage();
      let note = "";

      try {
        const response = await tab.goto(target.url, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        const status = response?.status() ?? 0;
        if (status >= 400) note = `page returned ${status}`;
        // Client-rendered boards need a moment before the DOM readers run.
        await tab.waitForTimeout(4000);
      } catch (error) {
        note = `navigation failed: ${(error as Error).message.slice(0, 80)}`;
      }

      const tabId = await findTabId(ext.worker, tab.url());
      let company: string | null = null;
      let role: string | null = null;
      let descriptionChars = 0;
      let source: string | null = null;

      if (tabId > 0) {
        const popup = await ext.context.newPage();
        await popup.goto(
          `chrome-extension://${ext.extensionId}/popup.html?tabId=${tabId}`,
        );

        // Give extraction, including the board API call, time to finish.
        await popup
          .waitForFunction(
            () =>
              document.querySelector("#company") !== null ||
              document.body.textContent?.includes("couldn't read"),
            undefined,
            { timeout: 45_000 },
          )
          .catch(() => undefined);

        const hasForm = (await popup.locator("#company").count()) > 0;
        if (hasForm) {
          company = (await popup.locator("#company").inputValue()) || null;
          role = (await popup.locator("#role").inputValue()) || null;
          descriptionChars = (await popup.locator("#description").inputValue())
            .length;
          const caption = await popup
            .locator("main p")
            .filter({ hasText: /^(Read|Guessed|You filled)/ })
            .first()
            .textContent()
            .catch(() => null);
          source = caption?.trim() ?? null;
        } else {
          // No form. Record which state it actually is, because "unreadable",
          // "signed out" and "not a web page" look identical from out here.
          const body = (await popup.locator("body").textContent()) ?? "";
          note =
            note ||
            (body.includes("couldn't read")
              ? "unreadable, AI fallback offered"
              : body.includes("Sign in to OnTrack")
                ? "SIGNED OUT (harness problem, not a reader result)"
                : body.includes("Open a job posting")
                  ? "page not readable by the extension"
                  : `no form: ${body.trim().slice(0, 80)}`);
        }
        await popup.close();
      } else {
        note = note || "could not resolve a tab id";
      }

      outcomes.push({
        site: target.site,
        url: target.url,
        company,
        role,
        descriptionChars,
        source,
        note,
      });

      // Logged rather than only asserted, so a closed posting is visible as
      // information instead of just a red test.
      console.log(
        `[${target.site}] company=${company ?? "-"} role=${role ?? "-"} ` +
          `desc=${descriptionChars} source=${source ?? "-"} ${note}`,
      );

      await tab.close();

      // Only the boards with a dedicated reader and a known-open posting are
      // asserted. LinkedIn and the generic case are recorded, not required.
      if (target.expectRole) {
        expect(role, `${target.site} role`).toBeTruthy();
        expect(role ?? "").toMatch(target.expectRole);
        expect(company, `${target.site} company`).toBeTruthy();
        expect(descriptionChars, `${target.site} description`).toBeGreaterThan(200);
      }
    });
  }
});
