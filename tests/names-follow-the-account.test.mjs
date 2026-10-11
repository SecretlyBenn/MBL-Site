import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * A player appears under the name they go by today, everywhere.
 *
 * The archive is keyed by name rather than by id, so a rename that reaches
 * only the profile row splits a career in two: the old seasons under one name,
 * the recent games under another, neither page showing the whole of it, and
 * whichever half no longer matches a profile row showing a blank grey block
 * where the head should be. MCBA Season XIV had this in both directions at
 * once, which is how it was found.
 *
 * The six-hourly skin refresh is the only thing that ever notices a rename, so
 * it is the only place the new name can start from.
 */

const head = readFileSync("app/api/head/[uuid]/route.ts", "utf8");
const adopt = readFileSync("db/adopt-name.ts", "utf8");

test("noticing a rename moves the name, not just the profile's current_name", () => {
  assert.match(head, /adoptCurrentName/, "the refresh records the new name and stops there");
  const at = head.indexOf("answer.name !== cached?.name");
  assert.ok(at > 0, "the refresh no longer compares the name it was given");
  assert.ok(
    head.slice(at).indexOf("adoptCurrentName") < head.slice(at).indexOf("return answer"),
    "the rename is noticed but nothing is moved before the answer goes back",
  );
});

test("a failed rename never costs anyone their head", () => {
  // The skin is already fetched and cached by this point. A name that fails to
  // move is put right by the next refresh; a thrown error would be a missing
  // head on every page the player appears on.
  const at = head.indexOf("await adoptCurrentName");
  assert.ok(at > 0, "the refresh does not move the name at all");
  const guard = head.lastIndexOf("try {", at);
  assert.ok(guard > 0 && guard < at, "the rename is not guarded, so a failure breaks the image");
  assert.ok(head.slice(at).includes("} catch"), "nothing catches a failed rename");
});

test("every table that keys a player by name is moved", () => {
  for (const table of [
    "historicalPlayerStats",
    "historicalGameStats",
    "historicalRosterEntries",
    "players",
    "minecraftProfiles",
  ]) {
    assert.ok(adopt.includes(table), `${table} is left behind, which splits the career it holds`);
  }
  assert.match(
    adopt,
    /displayName: to, minecraftUsername: to/,
    "a live player's username no longer travels with their display name",
  );
});

test("a name already in use is refused rather than merged", () => {
  // Nothing records which rows came from where, so a merge cannot be undone.
  // All three are checked: another account's profile, a live player who is not
  // this one, and any name in the archive, which carries no account at all.
  const refusals = adopt.split('return "taken"').length - 1;
  assert.equal(refusals, 3, `expected three refusals, found ${refusals}`);
  assert.ok(adopt.includes("ne(minecraftProfiles.uuid, uuid)"), "another account's name is not checked");
  assert.ok(
    adopt.indexOf('return "taken"') < adopt.indexOf("await db.update(table)"),
    "rows are moved before the name is checked to be free",
  );
});

test("only a name Mojang could have issued is written", () => {
  assert.match(adopt, /\w\{3,16\}/, "any string at all can be written to five tables");
});
