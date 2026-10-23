/**
 * A stand-in for the web app at https://app.ontrack.test:3443, used only by
 * Experiment B of the cookie spike (e2e/session-cookie-production.spec.ts).
 *
 * Why not `next dev --experimental-https`: that downloads mkcert and then
 * blocks on an interactive password prompt to install a CA into the system
 * trust store, which cannot be answered in an unattended run. Experiment B is
 * a test of *browser cookie behaviour*, not of Next.js. All it needs is a page
 * on a sibling subdomain of the API, served over HTTPS, that can trigger a
 * real login so the backend sets its real cookie. That is what this does, with
 * the same throwaway certificate the HTTPS backend uses.
 *
 *   node extension/scripts/app-https-stub.mjs
 *
 * Chromium reaches it because the tests pass
 * --host-resolver-rules=MAP app.ontrack.test 127.0.0.1 and
 * --ignore-certificate-errors.
 */
import { readFileSync } from "node:fs";
import { createServer } from "node:https";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const keyDir = resolve(here, "../.keys");

const PORT = Number(process.env.STUB_PORT ?? 3443);
const API = process.env.STUB_API ?? "https://api.ontrack.test:8443";

const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>OnTrack (test stub)</title></head>
  <body>
    <h1>OnTrack test stub</h1>
    <form id="login">
      <label>Email <input id="email" type="email" autocomplete="username" /></label>
      <label>Password <input id="password" type="password" autocomplete="current-password" /></label>
      <button type="submit">Log in</button>
    </form>
    <p id="status">ready</p>
    <script>
      const API = ${JSON.stringify(API)};
      document.getElementById("login").addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = document.getElementById("status");
        status.textContent = "signing in";
        try {
          const response = await fetch(API + "/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: document.getElementById("email").value,
              password: document.getElementById("password").value,
            }),
          });
          // The test waits for one of these exact strings.
          status.textContent = response.ok ? "signed in" : "failed " + response.status;
        } catch (error) {
          status.textContent = "failed " + error.message;
        }
      });

      window.logout = async () => {
        await fetch(API + "/api/auth/logout", { method: "POST", credentials: "include" });
        document.getElementById("status").textContent = "signed out";
      };
    </script>
  </body>
</html>`;

createServer(
  {
    key: readFileSync(resolve(keyDir, "ontrack-test.key.pem")),
    cert: readFileSync(resolve(keyDir, "ontrack-test.crt.pem")),
  },
  (_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(page);
  },
).listen(PORT, "127.0.0.1", () => {
  console.log(`app stub listening on https://app.ontrack.test:${PORT} -> ${API}`);
});
