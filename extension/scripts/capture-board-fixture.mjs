/**
 * Captures a real response from a public job board API into a test fixture.
 *
 *   node scripts/capture-board-fixture.mjs <url> <out.json> [--pick-job <id>]
 *
 * Board list endpoints are megabytes (Ashby's is ~3MB), so --pick-job keeps a
 * single posting from a jobs[] array. The saved JSON is otherwise untouched,
 * which is the point: the readers are tested against exactly the shape these
 * APIs really return, not against an idea of it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const [url, outPath] = args;
const pickIndex = args.indexOf("--pick-job");
const pickJob = pickIndex === -1 ? null : args[pickIndex + 1];

if (!url || !outPath) {
  console.error("usage: capture-board-fixture.mjs <url> <out.json> [--pick-job <id>]");
  process.exit(1);
}

const response = await fetch(url, {
  headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
});
if (!response.ok) {
  console.error(`fetch failed: ${response.status}`);
  process.exit(1);
}

let data = await response.json();

if (pickJob) {
  const list = Array.isArray(data) ? data : (data.jobs ?? []);
  const job = list.find((entry) => String(entry.id) === String(pickJob));
  if (!job) {
    console.error(`no job with id ${pickJob} in ${list.length} entries`);
    process.exit(1);
  }
  // Keep the envelope so the fixture still looks like the real response.
  data = Array.isArray(data) ? [job] : { ...data, jobs: [job] };
}

const json = `${JSON.stringify(data, null, 2)}\n`;
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, json, "utf8");
console.log(`wrote ${outPath} (${json.length}b)`);
