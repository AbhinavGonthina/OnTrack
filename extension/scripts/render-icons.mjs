/**
 * Renders the toolbar icons from the web app's favicon source so the extension
 * and the site never drift apart visually. Playwright is already a dependency
 * for the e2e suite, so it doubles as the rasterizer here instead of pulling in
 * sharp or resvg just for this.
 *
 *   npm run icons
 *
 * The PNGs are committed, so this only needs re-running when the glyph changes.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const SVG_SOURCE = resolve(here, "../../frontend/src/app/icon.svg");
const OUT_DIR = resolve(here, "../public/icon");
const SIZES = [16, 32, 48, 128];

const svg = await readFile(SVG_SOURCE, "utf8");
await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
try {
  for (const size of SIZES) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    // Transparent background so the glyph sits on whatever the browser chrome is.
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:transparent">
         <div style="width:${size}px;height:${size}px">${svg.replace(
           "<svg",
           `<svg width="${size}" height="${size}"`,
         )}</div>
       </body></html>`,
    );
    const png = await page.screenshot({ omitBackground: true });
    await writeFile(resolve(OUT_DIR, `${size}.png`), png);
    await page.close();
    console.log(`wrote icon/${size}.png`);
  }
} finally {
  await browser.close();
}
