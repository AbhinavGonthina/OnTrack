import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  clearSessionStorage,
  findTabId,
  launchWithExtension,
  type LoadedExtension,
} from "./fixtures/extension";
import { startStaticServer, type StaticServer } from "./fixtures/staticServer";
import { API_URL, APP_URL, TEST_USER } from "./fixtures/stack";

/**
 * Section 11.4. The whole feature against a real browser, the built
 * extension, a local backend on Docker Postgres and a signed-in user.
 *
 * The popup is opened as a normal tab (popup.html?tabId=N) rather than by
 * clicking the toolbar icon, because a browser-action popup has no
 * addressable URL and Playwright cannot drive it. The tabId query parameter
 * exists in the popup only for this.
 *
 * Needs the local stack: see extension/README.md.
 */

const SCREENSHOT_DIR = resolve(import.meta.dirname, "../../docs/screenshots");

let ext: LoadedExtension;
let site: StaticServer;

/** Opens the popup pointed at a specific tab. */
async function openPopupFor(targetTabId: number): Promise<Page> {
  const popup = await ext.context.newPage();
  await popup.goto(
    `chrome-extension://${ext.extensionId}/popup.html?tabId=${targetTabId}`,
  );
  return popup;
}

/** Opens a fixture page in its own tab and returns the tab plus its id. */
async function openFixture(page: string): Promise<{ tab: Page; tabId: number }> {
  const tab = await ext.context.newPage();
  await tab.goto(site.url(page));

  // The worker is the only place that can map a page to a Chrome tab id.
  const url = site.url(page);
  const tabId = await findTabId(ext.worker, url);

  expect(tabId, `could not find a tab for ${url}`).toBeGreaterThan(0);
  return { tab, tabId };
}

async function signIn(): Promise<void> {
  const page = await ext.context.newPage();
  await page.goto(`${APP_URL}/login`);
  await page.getByLabel(/email/i).fill(TEST_USER.email);
  await page
    .locator('input[autocomplete="current-password"]')
    .fill(TEST_USER.password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await page.close();
}

/** Reads the signed-in user's applications straight from the API. */
async function listApplications(): Promise<
  Array<Record<string, unknown>>
> {
  return ext.worker.evaluate(async (api: string) => {
    const response = await fetch(`${api}/api/applications`, {
      credentials: "include",
    });
    if (!response.ok) return [];
    return (await response.json()) as Array<Record<string, unknown>>;
  }, API_URL);
}

/** Deletes everything, so each test starts from a known state. */
async function deleteAllApplications(): Promise<void> {
  await ext.worker.evaluate(async (api: string) => {
    const response = await fetch(`${api}/api/applications`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const applications = (await response.json()) as Array<{ id: string }>;
    for (const application of applications) {
      await fetch(`${api}/api/applications/${application.id}`, {
        method: "DELETE",
        credentials: "include",
      });
    }
  }, API_URL);
}

test.beforeAll(async () => {
  site = await startStaticServer();
  ext = await launchWithExtension();
  await signIn();
  await deleteAllApplications();
});

test.afterAll(async () => {
  await deleteAllApplications().catch(() => undefined);
  await ext?.close();
  await site?.close();
});

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  // Each test starts from a clean slate. Without this the draft one test
  // leaves behind is restored into the next, which is correct product
  // behaviour but makes the starting state depend on test order.
  await clearSessionStorage(ext.worker);
});

test("extracts a posting, saves it, and the application really exists", async () => {
  const { tab, tabId } = await openFixture("greenhouse-style.html");
  const popup = await openPopupFor(tabId);

  // Extracted state: the fields come from the page's JSON-LD.
  await expect(popup.locator("#company")).toHaveValue("Nimbus Robotics", {
    timeout: 30_000,
  });
  await expect(popup.locator("#role")).toHaveValue("Senior Backend Engineer");
  await expect(popup.locator("#description")).toContainText(
    "autonomy software for warehouse fleets",
  );
  // Bullets survived the HTML to text conversion.
  await expect(popup.locator("#description")).toContainText(
    "- Own reliability for the dispatch pipeline",
  );
  await expect(popup.locator("#url")).toHaveValue(
    site.url("greenhouse-style.html"),
  );
  // The caption names where it was read from.
  await expect(popup.getByText("Read from the page's job data")).toBeVisible();

  await popup.getByRole("button", { name: "Save" }).click();
  await expect(popup.getByText("Saved to OnTrack.")).toBeVisible({
    timeout: 30_000,
  });

  // The real proof: ask the API, not the UI.
  const applications = await listApplications();
  expect(applications).toHaveLength(1);

  const saved = applications[0] as Record<string, string>;
  expect(saved.company).toBe("Nimbus Robotics");
  expect(saved.role).toBe("Senior Backend Engineer");
  expect(saved.currentStatus).toBe("APPLIED");
  expect(saved.applicationUrl).toBe(site.url("greenhouse-style.html"));
  expect(saved.jobDescriptionText).toContain("warehouse fleets");

  // Today in the browser's own timezone, which is what the popup prefills.
  const today = new Date();
  const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  expect(saved.dateApplied).toBe(expectedDate);

  await popup.close();
  await tab.close();
});

test("opening the popup on the same posting shows the duplicate state", async () => {
  const { tab, tabId } = await openFixture("greenhouse-style.html");
  const popup = await openPopupFor(tabId);

  await expect(popup.getByText("You've already logged this job.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(popup.getByText("Nimbus Robotics")).toBeVisible();
  await expect(
    popup.getByRole("button", { name: "Open in OnTrack" }),
  ).toBeVisible();

  // Save another copy is offered, and returns to the form.
  await popup.getByRole("button", { name: "Save another copy" }).click();
  await expect(popup.locator("#company")).toHaveValue("Nimbus Robotics");

  await popup.close();
  await tab.close();
});

test("a duplicate is still detected through tracking parameters", async () => {
  const tab = await ext.context.newPage();
  const noisyUrl = `${site.url("greenhouse-style.html")}?utm_source=linkedin&gclid=abc`;
  await tab.goto(noisyUrl);

  const tabId = await findTabId(ext.worker, noisyUrl);

  const popup = await openPopupFor(tabId);
  await expect(popup.getByText("You've already logged this job.")).toBeVisible({
    timeout: 30_000,
  });

  await popup.close();
  await tab.close();
});

test.describe("an unreadable page", () => {
  test("offers the AI fallback and sends nothing when declined", async () => {
    const { tab, tabId } = await openFixture("unreadable.html");
    const popup = await openPopupFor(tabId);

    // Any call to the AI endpoint during this test is a failure.
    let aiCalled = false;
    await popup.route(`${API_URL}/api/extension/extract-job`, (route) => {
      aiCalled = true;
      void route.abort();
    });

    await expect(
      popup.getByText("We couldn't read this job posting automatically."),
    ).toBeVisible({ timeout: 30_000 });

    // The cost is stated before the choice.
    const aiButton = popup.getByRole("button", { name: /Use AI to read it/ });
    await expect(aiButton).toBeVisible();
    await expect(aiButton).toContainText("AI calls left today");

    await aiButton.click();
    await expect(
      popup.getByText(/send this page's text to Google Gemini/),
    ).toBeVisible();

    // Declining must cost nothing.
    await popup.getByRole("button", { name: "No thanks, I'll fill it in" }).click();
    await expect(popup.locator("#company")).toBeVisible();
    expect(aiCalled, "declining consent still called the AI endpoint").toBe(false);

    await popup.close();
    await tab.close();
  });

  test("the manual form works and saves", async () => {
    const { tab, tabId } = await openFixture("unreadable.html");
    const popup = await openPopupFor(tabId);

    await expect(
      popup.getByText("We couldn't read this job posting automatically."),
    ).toBeVisible({ timeout: 30_000 });

    await popup.getByRole("button", { name: "Fill it in myself" }).click();

    // Save is disabled until the two required fields are there.
    const save = popup.getByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();

    await popup.locator("#company").fill("Typed Manually Ltd");
    await popup.locator("#role").fill("Platform Engineer");
    await expect(save).toBeEnabled();

    await save.click();
    await expect(popup.getByText("Saved to OnTrack.")).toBeVisible({
      timeout: 30_000,
    });

    const applications = await listApplications();
    const manual = applications.find(
      (application) => application.company === "Typed Manually Ltd",
    );
    expect(manual).toBeTruthy();
    expect(manual?.role).toBe("Platform Engineer");

    await popup.close();
    await tab.close();
  });
});

test("signed out shows the sign in state pointing at the web app", async () => {
  const { tab, tabId } = await openFixture("greenhouse-style.html");

  // Drop the session the same way logging out would.
  await ext.context.clearCookies();

  const popup = await openPopupFor(tabId);
  await expect(
    popup.getByText("Sign in to OnTrack to save this job."),
  ).toBeVisible({ timeout: 30_000 });

  const signInButton = popup.getByRole("button", { name: "Sign in" });
  await expect(signInButton).toBeVisible();

  // The button opens the web app's login page in a new tab.
  const opened = ext.context.waitForEvent("page");
  await signInButton.click();
  const loginTab = await opened;
  await expect.poll(() => loginTab.url()).toContain(`${APP_URL}/login`);
  await loginTab.close();

  await popup.close();
  await tab.close();

  // Leave the context signed in again for anything that follows.
  await signIn();
});

test("captures the popup screenshot for the README", async () => {
  await deleteAllApplications();
  const { tab, tabId } = await openFixture("greenhouse-style.html");
  const popup = await openPopupFor(tabId);
  // The popup follows the OS colour scheme and the README shot is the dark one.
  await popup.emulateMedia({ colorScheme: "dark" });

  await expect(popup.locator("#company")).toHaveValue("Nimbus Robotics", {
    timeout: 30_000,
  });

  // A popup is sized to its content by the browser, but a Playwright tab is
  // not, so without this the shot is the popup on a 1280px black field.
  await popup.setViewportSize({ width: 380, height: 640 });

  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await popup.screenshot({
    path: resolve(SCREENSHOT_DIR, "extension-popup.png"),
    fullPage: true,
  });

  await popup.close();
  await tab.close();
});
