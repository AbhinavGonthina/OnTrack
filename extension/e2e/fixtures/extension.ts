import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  chromium,
  type BrowserContext,
  type Worker,
} from "@playwright/test";

/**
 * The e2e suite loads the development build (npm run build:e2e), which is the
 * only one with host permissions for localhost. The production build in
 * .output/chrome-mv3 deliberately lacks them, and test/manifest.test.ts asserts
 * that.
 */
export const EXTENSION_PATH =
  process.env.E2E_EXTENSION_PATH ??
  resolve(import.meta.dirname, "../../.output/chrome-mv3-dev");

/**
 * Derived from the manifest key pinned in wxt.config.ts. Chromium computes an
 * extension's ID as the first 32 hex characters of the SHA-256 of the DER
 * public key, with each hex digit mapped 0-f to a-p. Asserted against the real
 * loaded extension in session-cookie.spec.ts rather than trusted blindly.
 */
export const EXTENSION_ID = "immfkodocchgncopfbmieneelgplgfai";

export interface LaunchOptions {
  /**
   * Extra Chromium flags. The production-shape cookie spike uses
   * --host-resolver-rules and --ignore-certificate-errors here.
   */
  args?: string[];
}

export interface LoadedExtension {
  context: BrowserContext;
  worker: Worker;
  /** The ID Chromium actually assigned, for asserting against EXTENSION_ID. */
  extensionId: string;
  close: () => Promise<void>;
}

/**
 * Launches a persistent Chromium with the built extension loaded and waits for
 * its service worker. An extension only runs in a persistent context, so there
 * is no browser.newContext() shortcut here.
 */
export async function launchWithExtension(
  options: LaunchOptions = {},
): Promise<LoadedExtension> {
  const userDataDir = await mkdtemp(join(tmpdir(), "ontrack-ext-"));

  const context = await chromium.launchPersistentContext(userDataDir, {
    // Extensions do not load in Chromium's headless shell, so these tests need
    // a real headed browser (or the new --headless=new, which Playwright maps
    // to channel "chromium" with this flag set).
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-first-run",
      "--no-default-browser-check",
      ...(options.args ?? []),
    ],
  });

  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker", { timeout: 30_000 }));

  // chrome-extension://<id>/background.js
  const extensionId = new URL(worker.url()).host;

  return {
    context,
    worker,
    extensionId,
    close: async () => {
      await context.close();
      await rm(userDataDir, { recursive: true, force: true });
    },
  };
}
