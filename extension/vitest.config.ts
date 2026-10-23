import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The readers take a Document, so every reader test runs against saved HTML
    // parsed by jsdom rather than a real browser.
    environment: "jsdom",
    globals: true,
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    // e2e is Playwright's, not Vitest's.
    exclude: ["node_modules/**", ".output/**", ".wxt/**", "e2e/**"],
  },
});
