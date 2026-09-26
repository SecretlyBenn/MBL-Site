import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * D1 refuses a statement with more than 100 bound parameters. Asking for a
 * whole season's player heads in one `IN (...)` is 207 of them, which took
 * every statistics page for a full season down with a 500 - while the pages
 * for the current season, which is small, carried on working.
 */

const queries = readFileSync("db/queries.ts", "utf8");

test("the profile lookup stays under D1's bound-parameter cap", () => {
  const size = Number(queries.match(/const PROFILE_BATCH = (\d+);/)?.[1]);
  assert.ok(Number.isInteger(size), "PROFILE_BATCH is not declared");
  assert.ok(size > 0 && size < 100, `PROFILE_BATCH is ${size}, which D1 will refuse`);
});

test("heads are looked up in batches rather than one statement", () => {
  const body = queries.slice(queries.indexOf("export async function getAvatarsFor"));
  assert.ok(body.includes("PROFILE_BATCH"), "getAvatarsFor ignores the batch size");
  assert.ok(body.includes("slice("), "getAvatarsFor does not split the names up");
});
