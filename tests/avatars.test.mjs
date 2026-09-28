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

/** One exported function's body, stopping at the next export. */
function bodyOf(name) {
  const start = queries.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} is not exported from db/queries.ts`);
  const rest = queries.slice(start);
  const next = rest.indexOf("\nexport ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

test("the profile lookup stays under D1's bound-parameter cap", () => {
  const size = Number(queries.match(/const PROFILE_BATCH = (\d+);/)?.[1]);
  assert.ok(Number.isInteger(size), "PROFILE_BATCH is not declared");
  assert.ok(size > 0 && size < 100, `PROFILE_BATCH is ${size}, which D1 will refuse`);
});

test("profiles are looked up in batches rather than one statement", () => {
  const body = bodyOf("getProfilesFor");
  assert.ok(body.includes("PROFILE_BATCH"), "getProfilesFor ignores the batch size");
  assert.ok(body.includes("slice("), "getProfilesFor does not split the names up");
});

test("heads go through the batched lookup rather than querying for themselves", () => {
  const body = bodyOf("getAvatarsFor");
  assert.ok(body.includes("getProfilesFor"), "getAvatarsFor no longer delegates");
  assert.ok(
    !body.includes("inArray("),
    "getAvatarsFor builds its own query again, which is how the cap was breached before",
  );
});

test("the account's name today is read alongside the id", () => {
  // Pages about a player now show the name their account answers to, which the
  // head route refreshes on its own. Dropping it from the select would leave
  // those pages showing the archived name with no way to tell.
  assert.ok(bodyOf("getProfilesFor").includes("currentName"), "getProfilesFor stopped reading currentName");
});
