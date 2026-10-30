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

test("a name with a record behind it is refused, an empty duplicate is absorbed", () => {
  // The refusals are what protect a stranger: Minecraft names get recycled, so
  // a career filed under the name this account holds today may belong to
  // whoever held it before. Another account's profile, any name in the archive,
  // and a live row that has actually played are all still refused.
  assert.ok(adopt.includes("ne(minecraftProfiles.uuid, uuid)"), "another account's name is not checked");
  assert.ok(adopt.includes("if (await hasPlayed(otherPlayer.id)) return \"taken\""), "a live row that has played is no longer refused");

  // The archive is checked before the live row, because absorbing a row is
  // only safe once the name is known to carry no record at all.
  assert.ok(
    adopt.indexOf("for (const { table, column } of NAMED) {") < adopt.indexOf("hasPlayed(otherPlayer.id)"),
    "a live row is absorbed before the archive has been checked for that name",
  );

  // And nothing is moved until every one of those checks has run.
  assert.ok(
    adopt.lastIndexOf('return "taken"') < adopt.indexOf("await db.update(table)"),
    "rows are moved before the name is checked to be free",
  );
});

test("absorbing a duplicate keeps the career and takes the club", () => {
  // The surviving row is the one holding the career; the shell's club comes
  // across because the roster bot is what the league believes about rosters.
  const absorb = adopt.slice(adopt.indexOf("hasPlayed(otherPlayer.id)"), adopt.indexOf("for (const { table, column } of NAMED) {", adopt.indexOf("hasPlayed(otherPlayer.id)")));
  assert.ok(absorb.includes("teamId: otherPlayer.teamId"), "the club is left behind on the row being deleted");
  assert.ok(absorb.includes("rosterMoves).set({ playerId: mine.id })"), "his moves are dropped with the shell");
  assert.ok(absorb.includes("delete(players)"), "the duplicate row is left in the pool");
  assert.ok(
    absorb.indexOf("update(rosterMoves)") < absorb.indexOf("delete(players)"),
    "the row is deleted before the moves that point at it are repointed",
  );
});

test("a second profile row for the same account is merged, not collided with", () => {
  // player_name is the primary key, so renaming onto a row this same account
  // already holds would throw rather than merge.
  assert.ok(
    adopt.includes("eq(minecraftProfiles.playerName, to), eq(minecraftProfiles.uuid, uuid)"),
    "the account's own duplicate profile row is not cleared before the rename",
  );
});

test("only a name Mojang could have issued is written", () => {
  assert.match(adopt, /\w\{3,16\}/, "any string at all can be written to five tables");
});

test("renaming moves one profile row, not every name the account holds", () => {
  // One account legitimately holds two site names, because each competition
  // filed a man under whatever he used there - that pair is what joins a split
  // career together. Matching on the uuid alone set both rows to the same
  // string, and player_name is the primary key, so the push threw a UNIQUE
  // constraint and the bot could only report "That already exists".
  const update = adopt.slice(adopt.indexOf("update(minecraftProfiles)"));
  assert.ok(
    update.includes("eq(minecraftProfiles.playerName, from)"),
    "the rename still matches every row holding this account",
  );
});

test("a constraint failure says which constraint, somewhere", () => {
  const errors = readFileSync("app/api-errors.ts", "utf8");
  // The tidy answer goes to the caller and the detail goes to the log. It used
  // to go nowhere, which left a 409 naming no row, column or table.
  assert.ok(errors.includes("console.error(text)"), "a constraint failure is still thrown away unlogged");
  assert.ok(
    errors.indexOf("console.error(text)") < errors.indexOf("status: 409"),
    "the detail is logged only after the response has returned",
  );
});
