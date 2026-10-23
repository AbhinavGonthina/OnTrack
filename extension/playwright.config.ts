import { defineConfig } from "@playwright/test";

/**
 * The extension suite drives a real Chromium with the built extension loaded,
 * so everything runs in one worker against one persistent profile: two workers
 * would fight over the same user data directory and the same local backend.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Cold starts and sign-in flows are slow; the default 30s is not enough.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
