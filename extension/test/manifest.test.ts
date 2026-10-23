import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Audits the real built manifest, not the config that produces it.
 *
 * The permission list is the extension's whole security story, and it is the
 * thing a store reviewer and a suspicious user both look at first. It is also
 * easy to widen by accident: adding one host permission to get a reader
 * working is a one-line change that nothing else would catch.
 *
 * Needs a build first. `npm run build` for the production checks,
 * `npm run build:firefox` for the Firefox one; both are part of `npm run
 * verify` and of the checks in Section 11.6.
 */

const OUT = resolve(import.meta.dirname, "../.output");
const CHROME = resolve(OUT, "chrome-mv3/manifest.json");
const CHROME_DEV = resolve(OUT, "chrome-mv3-dev/manifest.json");
// WXT targets MV2 for Firefox, which is still what Firefox prefers.
const FIREFOX = resolve(OUT, "firefox-mv2/manifest.json");

interface Manifest {
  manifest_version: number;
  name: string;
  key?: string;
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: unknown[];
  action?: { default_title?: string };
  browser_action?: { default_title?: string };
  web_accessible_resources?: unknown[];
}

function read(path: string): Manifest {
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
}

/** Section 10.2, exactly. */
const EXPECTED_PERMISSIONS = ["activeTab", "scripting", "storage"];
const EXPECTED_HOSTS = [
  "https://api.abhinavgonthina.dev/*",
  "https://boards-api.greenhouse.io/*",
  "https://api.lever.co/*",
  "https://api.ashbyhq.com/*",
];

/**
 * The ones that would change what the extension is. <all_urls> or a content
 * script would break the "only runs when you click it" promise; cookies or
 * webRequest would let it read credentials it has no business seeing.
 */
const FORBIDDEN_PERMISSIONS = [
  "<all_urls>",
  "tabs",
  "cookies",
  "webRequest",
  "webRequestBlocking",
  "history",
  "bookmarks",
  "downloads",
  "clipboardRead",
  "management",
  "nativeMessaging",
  "proxy",
  "debugger",
];

describe.runIf(existsSync(CHROME))("the production Chrome manifest", () => {
  const manifest = read(CHROME);

  it("is manifest v3", () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it("requests exactly the three permissions in Section 10.2", () => {
    expect([...(manifest.permissions ?? [])].sort()).toEqual(
      [...EXPECTED_PERMISSIONS].sort(),
    );
  });

  it("requests exactly the four host permissions in Section 10.2", () => {
    expect([...(manifest.host_permissions ?? [])].sort()).toEqual(
      [...EXPECTED_HOSTS].sort(),
    );
  });

  /**
   * The dev build deliberately has these so the e2e suite can reach a local
   * backend. Shipping them would let the extension talk to anything running on
   * the user's own machine.
   */
  it("has no localhost or test host permissions", () => {
    const hosts = (manifest.host_permissions ?? []).join(" ");
    expect(hosts).not.toContain("localhost");
    expect(hosts).not.toContain("127.0.0.1");
    expect(hosts).not.toContain("ontrack.test");
  });

  it.each(FORBIDDEN_PERMISSIONS)("does not request %s", (permission) => {
    expect(manifest.permissions ?? []).not.toContain(permission);
    expect(manifest.host_permissions ?? []).not.toContain(permission);
  });

  it("registers no content scripts, so nothing runs until the icon is clicked", () => {
    expect(manifest.content_scripts ?? []).toEqual([]);
  });

  it("pins the key, so the extension ID the backend allows stays stable", () => {
    expect(manifest.key).toBeTruthy();
    expect(manifest.key).toMatch(/^MII/);
  });

  it("names the toolbar action", () => {
    expect(manifest.action?.default_title).toBe("Log this job in OnTrack");
  });
});

describe.runIf(existsSync(CHROME_DEV))("the development Chrome manifest", () => {
  const manifest = read(CHROME_DEV);

  /** The dev build is the one the e2e suite loads, so it needs localhost. */
  it("adds localhost so the e2e suite can reach a local backend", () => {
    const hosts = (manifest.host_permissions ?? []).join(" ");
    expect(hosts).toContain("localhost");
    expect(hosts).toContain("ontrack.test");
  });

  it("still requests no extra API permissions beyond the production three", () => {
    expect([...(manifest.permissions ?? [])].sort()).toEqual(
      [...EXPECTED_PERMISSIONS].sort(),
    );
  });

  it("keeps the same key, so the ID matches the one in the CORS config", () => {
    expect(manifest.key).toBe(read(CHROME).key);
  });
});

describe.runIf(existsSync(FIREFOX))("the Firefox manifest", () => {
  const manifest = read(FIREFOX);

  /** MV2 merges host permissions into the one permissions array. */
  it("requests the same permissions and hosts, in MV2's single list", () => {
    const all = [...(manifest.permissions ?? [])].sort();
    expect(all).toEqual([...EXPECTED_PERMISSIONS, ...EXPECTED_HOSTS].sort());
  });

  it.each(FORBIDDEN_PERMISSIONS)("does not request %s", (permission) => {
    expect(manifest.permissions ?? []).not.toContain(permission);
  });

  it("registers no content scripts", () => {
    expect(manifest.content_scripts ?? []).toEqual([]);
  });

  it("names the toolbar action", () => {
    expect(manifest.browser_action?.default_title).toBe(
      "Log this job in OnTrack",
    );
  });
});

/**
 * A missing build would make every describe above silently skip, which would
 * look identical to everything passing.
 */
describe("the audit itself", () => {
  it("found a production build to audit", () => {
    expect(
      existsSync(CHROME),
      "no .output/chrome-mv3/manifest.json; run `npm run build` first",
    ).toBe(true);
  });
});
