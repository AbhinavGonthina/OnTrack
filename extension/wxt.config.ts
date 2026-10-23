import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

/**
 * Public half of the RSA key pair in .keys/. Pinning it here fixes the unpacked
 * extension's ID to immfkodocchgncopfbmieneelgplgfai, which matters because the
 * backend has to allow chrome-extension://<id> as a CORS origin (Section 6.2 of
 * the build spec). Without a key the ID is derived from the folder path and
 * would differ on every machine. A store-published build gets its own ID from
 * the store, which then also has to be added to CORS_ALLOWED_ORIGINS.
 */
const MANIFEST_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjbl3Mom+dH07j1uTRTU5sNSVXli0Ou3GRzwqcFSaDnXEDThfoN027MmpZjK53nj1GLUtNsBMKbdoOl/Ii2nD16zgRdTOIfqq9oQJVOGaslaiDLJ/m0/Z8Rg7R5vP+huFPeVXfAF3O5ir9jw2f35N50toKAQ8UPS8M8oO+F7auQewfF6IpvmDrBp6ZBvN0iLBDd8RZ/HZGpP9aYlU/LGrcDyottzyih9AlP/cWfjPRQwyL95XcUo0zQs3p11vdcp/vOM9453C64CekIr/sy1sVxl7U0BSfLSaGe9FM9OAFfxFOl+UpPt8wSwDKQSdAWLq6T0dQhiCOJuG03KeiGGFMwIDAQAB";

/** Public board APIs the service worker reads structured postings from. */
const BOARD_API_HOSTS = [
  "https://boards-api.greenhouse.io/*",
  "https://api.lever.co/*",
  "https://api.ashbyhq.com/*",
];

/**
 * Only added to dev builds. The e2e suite points the extension at a local
 * backend (and, for the production-shape cookie spike, at fake *.ontrack.test
 * hostnames mapped to 127.0.0.1). A production build must not ship these, which
 * test/manifest.test.ts asserts against the real built manifest.
 */
const DEV_ONLY_HOSTS = [
  "http://localhost/*",
  "http://127.0.0.1/*",
  "https://api.ontrack.test/*",
  "https://app.ontrack.test/*",
];

export default defineConfig({
  srcDir: "src",
  entrypointsDir: "entrypoints",
  publicDir: "public",
  modules: ["@wxt-dev/module-react"],
  // Explicit imports only. Auto-imports make the extraction readers harder to
  // unit test in isolation and hide where chrome APIs come from.
  imports: false,
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ mode }) => ({
    name: "OnTrack",
    description:
      "Log the job posting you are looking at straight into your OnTrack account.",
    key: MANIFEST_KEY,
    permissions: ["activeTab", "scripting", "storage"],
    host_permissions: [
      "https://api.abhinavgonthina.dev/*",
      ...BOARD_API_HOSTS,
      ...(mode === "production" ? [] : DEV_ONLY_HOSTS),
    ],
    // action.default_title (the toolbar tooltip) comes from the <title> in
    // entrypoints/popup/index.html; WXT overwrites anything set here.
    browser_specific_settings: {
      gecko: {
        id: "ontrack@abhinavgonthina.dev",
        strict_min_version: "109.0",
      },
    },
  }),
});
