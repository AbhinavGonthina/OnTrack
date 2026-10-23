/**
 * Captures a real public job posting into a trimmed test fixture.
 *
 *   node scripts/capture-fixture.mjs <url> <out-path> [--keep-body]
 *
 * Full job pages are hundreds of kilobytes of framework bundles and analytics,
 * none of which the readers look at. By default this keeps only what
 * extraction actually reads: the <title>, the meta tags, any
 * application/ld+json blocks, and (with --keep-body) the elements the DOM
 * readers target. That keeps fixtures reviewable in a diff and keeps the repo
 * small, while still being real captured markup rather than something invented.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const [url, outPath, ...flags] = process.argv.slice(2);
if (!url || !outPath) {
  console.error("usage: capture-fixture.mjs <url> <out-path> [--keep-body]");
  process.exit(1);
}
const keepBody = flags.includes("--keep-body");

const response = await fetch(url, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  },
  redirect: "follow",
});
if (!response.ok) {
  console.error(`fetch failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}
const html = await response.text();

const pick = (pattern) => [...html.matchAll(pattern)].map((m) => m[0]);

const title = pick(/<title[^>]*>[\s\S]*?<\/title>/gi).slice(0, 1);
const metas = pick(/<meta[^>]+>/gi).filter((tag) =>
  /property=["'](og:|twitter:)|name=["'](description|title|author)/i.test(tag),
);
const ldJson = pick(
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
);

// The containers the DOM readers look at, when the caller wants them.
const bodyBits = keepBody
  ? pick(
      /<(h1|h2)[^>]*>[\s\S]{0,4000}?<\/\1>|<[^>]+data-automation-id=["'](jobPostingHeader|jobPostingDescription)["'][^>]*>[\s\S]{0,20000}?<\/[a-z]+>|<div[^>]+id=["']job-details["'][^>]*>[\s\S]{0,20000}?<\/div>/gi,
    ).slice(0, 12)
  : [];

const fixture = `<!doctype html>
<!-- Captured from ${url} on ${new Date().toISOString().slice(0, 10)}.
     Trimmed to the parts the readers use: see scripts/capture-fixture.mjs. -->
<html lang="en">
<head>
${[...title, ...metas].map((line) => `  ${line}`).join("\n")}
${ldJson.map((block) => `  ${block}`).join("\n")}
</head>
<body>
${bodyBits.map((line) => `  ${line}`).join("\n")}
</body>
</html>
`;

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, fixture, "utf8");
console.log(
  `wrote ${outPath} (${fixture.length}b from ${html.length}b, ` +
    `${ldJson.length} ld+json block(s), ${metas.length} meta tag(s))`,
);
