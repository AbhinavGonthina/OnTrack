import { expect, test } from "@playwright/test";
import { launchWithExtension, type LoadedExtension } from "./fixtures/extension";

/**
 * Proves the popup actually renders in a real browser with the built
 * extension loaded. The deeper save and duplicate flows live in
 * save-flow.spec.ts; this one exists so a popup that throws on mount cannot
 * pass unnoticed just because the reducer's unit tests are green.
 *
 * Needs the local stack (see extension/README.md).
 */

let ext: LoadedExtension;

test.beforeAll(async () => {
  ext = await launchWithExtension();
});

test.afterAll(async () => {
  await ext?.close();
});

test("the popup mounts and shows a state rather than a blank page", async () => {
  const page = await ext.context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`chrome-extension://${ext.extensionId}/popup.html`);

  // The header is present in every state.
  await expect(page.getByText("OnTrack", { exact: true })).toBeVisible();

  // It must settle into one of the real states, not sit on the skeleton.
  await expect
    .poll(
      async () => {
        const body = (await page.locator("body").textContent()) ?? "";
        return /Sign in to OnTrack|Open a job posting|couldn't read|Company|starting up/i.test(
          body,
        );
      },
      { timeout: 30_000 },
    )
    .toBe(true);

  expect(errors, `popup threw: ${errors.join("; ")}`).toEqual([]);
  await page.close();
});

test("the popup renders at about 380px wide", async () => {
  const page = await ext.context.newPage();
  await page.goto(`chrome-extension://${ext.extensionId}/popup.html`);

  const width = await page.evaluate(
    () => document.body.getBoundingClientRect().width,
  );
  expect(width).toBeGreaterThanOrEqual(360);
  expect(width).toBeLessThanOrEqual(400);

  await page.close();
});
