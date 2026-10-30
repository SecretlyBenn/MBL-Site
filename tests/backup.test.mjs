import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The snapshot script, which runs unattended and therefore has to be louder
 * about failing than about working.
 *
 * A backup is only a backup if somebody would notice it being wrong, and the
 * two ways it goes wrong quietly are an export that stopped halfway and an
 * export that never ran. Both have to end with the snapshots already kept
 * still there and a non-zero exit.
 */
const script = readFileSync("scripts/backup-db.mjs", "utf8");

test("a short dump is never kept as though it were a backup", () => {
  // An export cut off by a dropped connection is still a file, and a file is
  // what a backup looks like right up until somebody needs it.
  assert.ok(script.includes("LEAST_ROWS"), "a dump is kept without its size being checked");
  assert.ok(script.includes("!hasSchema"), "a dump with no schema in it counts as a backup");
  // createGzip is matched where it is called, not where it is imported.
  assert.ok(
    script.indexOf("hasSchema || rows < LEAST_ROWS") < script.indexOf("createGzip({"),
    "the dump is compressed and kept before it has been checked",
  );
  assert.ok(script.includes(".rejected"), "a dump that fails the check is thrown away rather than left to look at");
});

test("nothing already kept is removed until a new snapshot is safely written", () => {
  assert.ok(
    script.lastIndexOf("createGzip") < script.indexOf("past the last"),
    "old snapshots are pruned before the new one exists",
  );
});

test("a busy relay is retried, and says so plainly rather than throwing", () => {
  // Wrangler answers `fetch failed` often enough that one attempt is not a
  // backup schedule. A stack trace in a scheduled task is a failure nobody
  // reads.
  assert.ok(script.includes("attempt <= 3"), "the export is tried once and given up on");
  assert.ok(script.includes("process.exit(1)"), "a failed run exits as though it had worked");
});

test("wrangler is run without a shell", () => {
  // npx.cmd cannot be execFile'd on Windows - Node answers EINVAL - and
  // shell: true would hand a path to cmd unescaped.
  // Read from the call itself: the comment above it names shell: true as the
  // thing being avoided, so searching the whole file would always match.
  const call = script.slice(script.indexOf("return execFileSync"), script.indexOf("const stamp"));
  assert.ok(call.includes("process.execPath"), "wrangler is no longer run with this Node directly");
  assert.ok(!call.includes("shell:"), "the arguments are handed to a shell again");
});
