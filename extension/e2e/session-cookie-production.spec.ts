import { expect, test } from "@playwright/test";
import { launchWithExtension, type LoadedExtension } from "./fixtures/extension";
import { TEST_USER } from "./fixtures/stack";

/**
 * Experiment B of the Section 6.4 spike: the *production* cookie shape.
 *
 * Experiment A proves the cookie rides along on localhost, but localhost is the
 * easy case: the cookie there is host-only with SameSite=None. Production sets
 * it on the parent domain .abhinavgonthina.dev with SameSite=Lax, and the web
 * app and the API are sibling subdomains over HTTPS. SameSite=Lax is the part
 * worth proving, because a cross-site request would not carry such a cookie at
 * all; the design depends on Chromium treating a host-permitted extension
 * request as same-site.
 *
 * The setup mirrors production with *.ontrack.test names that Chromium resolves
 * to 127.0.0.1 through --host-resolver-rules, so no hosts file is touched.
 *
 * Needs both HTTPS servers:
 *   .\extension\scripts\local-backend-https.ps1
 *   node extension/scripts/app-https-stub.mjs
 *
 * The app side is a stub rather than `next dev --experimental-https` because
 * that downloads mkcert and then blocks on an interactive prompt to install a
 * CA, which an unattended run cannot answer. What is under test here is the
 * browser's cookie handling, not Next.js: the stub triggers the same real
 * login against the same backend, so the cookie it receives is the real one.
 *
 * Skipped unless E2E_PRODUCTION_SHAPE=1, because it needs that second stack.
 */

const API = "https://api.ontrack.test:8443";
const APP = "https://app.ontrack.test:3443";

const enabled = process.env.E2E_PRODUCTION_SHAPE === "1";

test.describe("Experiment B: session cookie in the production shape", () => {
  test.skip(!enabled, "set E2E_PRODUCTION_SHAPE=1 and start the HTTPS stack");

  let ext: LoadedExtension;

  test.beforeAll(async () => {
    ext = await launchWithExtension({
      args: [
        // Both fake hostnames resolve to the loopback servers.
        "--host-resolver-rules=MAP app.ontrack.test 127.0.0.1, MAP api.ontrack.test 127.0.0.1",
        // Both certs are self-signed throwaways.
        "--ignore-certificate-errors",
      ],
    });
  });

  test.afterAll(async () => {
    await ext?.close();
  });

  test("the probe reports signed out before signing in", async () => {
    const status = await ext.worker.evaluate(async (api: string) => {
      const response = await fetch(`${api}/api/session`, {
        credentials: "include",
      });
      return response.status;
    }, API);

    expect([401, 403]).toContain(status);
  });

  test("a SameSite=Lax cookie on the parent domain still reaches the API", async () => {
    const page = await ext.context.newPage();
    await page.goto(`${APP}/login`);

    await page.locator("#email").fill(TEST_USER.email);
    await page.locator("#password").fill(TEST_USER.password);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page.locator("#status")).toHaveText("signed in", {
      timeout: 60_000,
    });

    // Confirm the cookie really is in the production shape before concluding
    // anything from the probe below, otherwise this test could pass for the
    // wrong reason (a host-only cookie would also work).
    const cookies = await ext.context.cookies();
    const session = cookies.find((c) => c.name === "ontrack_session");
    expect(session, "ontrack_session cookie was not set").toBeTruthy();
    expect(session?.domain).toBe(".ontrack.test");
    expect(session?.sameSite).toBe("Lax");
    expect(session?.secure).toBe(true);

    await page.close();

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

  test("the probe reports signed out after the web app logs out", async () => {
    const page = await ext.context.newPage();
    await page.goto(APP);
    await page.evaluate(async () => {
      await (window as unknown as { logout: () => Promise<void> }).logout();
    });
    await expect(page.locator("#status")).toHaveText("signed out");
    await page.close();

    const status = await ext.worker.evaluate(async (api: string) => {
      const response = await fetch(`${api}/api/session`, {
        credentials: "include",
      });
      return response.status;
    }, API);

    expect([401, 403]).toContain(status);
  });
});
