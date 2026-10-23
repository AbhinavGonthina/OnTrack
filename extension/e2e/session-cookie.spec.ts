import { expect, test } from "@playwright/test";
import {
  EXTENSION_ID,
  launchWithExtension,
  type LoadedExtension,
} from "./fixtures/extension";
import { TEST_USER } from "./fixtures/stack";

/**
 * Section 6.4 of the build spec: the mandatory gate for the whole
 * authentication design. The extension stores no token of its own and relies
 * entirely on Chromium attaching the ontrack_session cookie to requests it
 * makes to a host it has permission for. That is a claim about browser
 * behaviour, not about our code, so it gets proven against a real browser
 * rather than assumed.
 *
 * Experiment A is the localhost shape (host-only cookie, SameSite=None).
 * Experiment B is the production shape (cookie on a parent domain, SameSite=Lax,
 * HTTPS, sibling subdomains) and lives in session-cookie-production.spec.ts
 * because it needs a different server setup.
 *
 * Requires the local stack: see extension/README.md.
 */

const API = process.env.E2E_API_URL ?? "http://localhost:8080";
const APP = process.env.E2E_APP_URL ?? "http://localhost:3000";

test.describe("Experiment A: session cookie on localhost", () => {
  let ext: LoadedExtension;

  test.beforeAll(async () => {
    ext = await launchWithExtension();
  });

  test.afterAll(async () => {
    await ext?.close();
  });

  test("the manifest key produces the extension ID the backend allows", () => {
    // If this ever changes, CORS_ALLOWED_ORIGINS on Render has to change with
    // it, so it is worth failing loudly rather than discovering it in the wild.
    expect(ext.extensionId).toBe(EXTENSION_ID);
  });

  test("the probe reports signed out before signing in", async () => {
    const status = await ext.worker.evaluate(async (api: string) => {
      const response = await fetch(`${api}/api/session`, {
        credentials: "include",
      });
      return response.status;
    }, API);

    // Spring Security answers an unauthenticated request with 403 rather than
    // the 401 the build spec assumed, because no AuthenticationEntryPoint is
    // configured. Both mean "signed out" and api/client.ts maps both to the
    // unauthorized kind, so accept either rather than pinning the wrong one.
    expect([401, 403]).toContain(status);
  });

  test("the probe is 200 after signing in through the real login page", async () => {
    const page = await ext.context.newPage();
    await page.goto(`${APP}/login`);

    await page.getByLabel(/email/i).fill(TEST_USER.email);
    // Not getByLabel(/password/i): the show/hide toggle button shares that
    // accessible name, which makes the label lookup ambiguous.
    await page
      .locator('input[autocomplete="current-password"]')
      .fill(TEST_USER.password);
    await page.getByRole("button", { name: /^log in$/i }).click();

    // The app redirects to the dashboard once the cookie is set.
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    await page.close();

    // The whole point: a fetch from the *service worker*, which is a different
    // origin from the web app, still carries the cookie.
    const result = await ext.worker.evaluate(async (api: string) => {
      const response = await fetch(`${api}/api/session`, {
        credentials: "include",
      });
      return {
        status: response.status,
        body: response.ok ? await response.json() : null,
      };
    }, API);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ email: TEST_USER.email });
  });

  test("the probe reports signed out again after logging out", async () => {
    await ext.worker.evaluate(async (api: string) => {
      await fetch(`${api}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    }, API);

    const status = await ext.worker.evaluate(async (api: string) => {
      const response = await fetch(`${api}/api/session`, {
        credentials: "include",
      });
      return response.status;
    }, API);

    expect([401, 403]).toContain(status);
  });
});
