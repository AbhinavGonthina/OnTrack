import { expect, test } from "@playwright/test";
import {
  clearSessionStorage,
  findTabId,
  launchWithExtension,
  type LoadedExtension,
} from "./fixtures/extension";
import { startStaticServer, type StaticServer } from "./fixtures/staticServer";
import { APP_URL, TEST_USER } from "./fixtures/stack";

/**
 * The one test in the suite that spends a real Gemini call.
 *
 * Everything else mocks Gemini, because the free-tier quota is per project and
 * shared by every OnTrack user, so a test suite that burned it would take the
 * live app's AI features down with it. This one exists because the thing worth
 * proving here is exactly the thing a mock cannot prove: that the prompt and
 * the schema produce a usable answer from the real model on a real posting.
 *
 * It goes through the local backend, which holds the API key. The page is a
 * real posting's text with every structural signal stripped, so the readers
 * genuinely fail and the fallback is genuinely needed, and the answer can be
 * checked against the company and role we know are correct.
 *
 * Opt in, and deliberately a single call:
 *
 *   $env:E2E_LIVE_AI="1"; npx playwright test e2e/ai-fallback-live.spec.ts
 */

const enabled = process.env.E2E_LIVE_AI === "1";

let ext: LoadedExtension;
let site: StaticServer;

test.describe("live AI fallback", () => {
  test.skip(!enabled, "set E2E_LIVE_AI=1 to spend a real Gemini call");
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    site = await startStaticServer();
    ext = await launchWithExtension();

    const page = await ext.context.newPage();
    await page.goto(`${APP_URL}/login`);
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page
      .locator('input[autocomplete="current-password"]')
      .fill(TEST_USER.password);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    await page.close();
    await clearSessionStorage(ext.worker);
  });

  test.afterAll(async () => {
    await ext?.close();
    await site?.close();
  });

  test("reads a posting the readers could not, and the answer is right", async () => {
    const tab = await ext.context.newPage();
    await tab.goto(site.url("ai-fallback.html"));
    const tabId = await findTabId(ext.worker, tab.url());

    const popup = await ext.context.newPage();
    await popup.goto(
      `chrome-extension://${ext.extensionId}/popup.html?tabId=${tabId}`,
    );

    // The readers must actually fail, or this is not testing the fallback.
    await expect(
      popup.getByText("We couldn't read this job posting automatically."),
    ).toBeVisible({ timeout: 30_000 });

    const before = await remainingAiCalls();

    await popup.getByRole("button", { name: /Use AI to read it/ }).click();
    await expect(
      popup.getByText(/send this page's text to Google Gemini/),
    ).toBeVisible();

    // This is the call.
    await popup.getByRole("button", { name: "Read it with AI" }).click();

    await expect(popup.locator("#company")).toBeVisible({ timeout: 90_000 });

    const company = await popup.locator("#company").inputValue();
    const role = await popup.locator("#role").inputValue();
    const description = await popup.locator("#description").inputValue();
    const after = await remainingAiCalls();

    console.log(
      `[live AI] company=${JSON.stringify(company)} role=${JSON.stringify(role)} ` +
        `descChars=${description.length} aiCalls ${before} -> ${after}`,
    );

    // The known-correct answer for this posting.
    expect(company).toBe("Figma");
    expect(role).toMatch(/Compliance Engineer/i);
    // The posting's own text, not a summary.
    expect(description.length).toBeGreaterThan(1000);
    expect(description).toContain("FedRAMP");

    // Labelled honestly, because the user has to be able to tell.
    await expect(
      popup.getByText("Read with AI, please double check"),
    ).toBeVisible();

    // Exactly one call was spent.
    expect(after).toBe(before - 1);

    await popup.close();
    await tab.close();
  });

  /** Asks the API directly, so the count is not read from the UI under test. */
  async function remainingAiCalls(): Promise<number> {
    return ext.worker.evaluate(async (api: string) => {
      const response = await fetch(`${api}/api/users/me/ai-usage`, {
        credentials: "include",
      });
      if (!response.ok) return -1;
      return ((await response.json()) as { remaining: number }).remaining;
    }, process.env.E2E_API_URL ?? "http://localhost:8080");
  }
});
