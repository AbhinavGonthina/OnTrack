/**
 * The local stack the e2e suite runs against. Never production: the backend
 * these point at is started by extension/scripts/local-backend.ps1 and talks to
 * a throwaway Docker Postgres on port 5434.
 */

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8080";
export const APP_URL = process.env.E2E_APP_URL ?? "http://localhost:3000";

/**
 * Created once by scripts/seed-test-user.mjs and marked verified directly in
 * the container, because signup deliberately leaves an account unverified and
 * the verification email is not actually sent locally.
 */
export const TEST_USER = {
  email: "ext-test@example.com",
  password: "ExtensionTest123!",
} as const;

/** Signs in through the API rather than the UI, for tests whose subject is not
 *  the login page itself. Returns the Set-Cookie value. */
export async function loginViaApi(): Promise<string> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(TEST_USER),
  });
  if (!response.ok) {
    throw new Error(`Local login failed with ${response.status}. Is the stack up?`);
  }
  const cookie = response.headers.get("set-cookie");
  if (!cookie) throw new Error("Login returned no Set-Cookie");
  return cookie;
}
