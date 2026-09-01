import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/players/rename/route.ts", import.meta.url), "utf8");
const forms = readFileSync(new URL("../app/admin/AdminForms.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/admin/page.tsx", import.meta.url), "utf8");

/**
 * A career is held together by the player's name matching across six tables,
 * because the archive stores the name they used at the time rather than an id.
 * A rename that reaches only some of them splits the career silently.
 */

test("every table that keys a player by name is renamed", () => {
  for (const table of [
    "historicalPlayerStats",
    "historicalGameStats",
    "historicalRosterEntries",
    "minecraftProfiles",
    "players",
  ]) {
    assert.ok(route.includes(table), `${table} is not renamed`);
  }
});

test("the skin mapping moves with the name", () => {
  // minecraft_profiles is keyed on the player's name. Renaming the stats and
  // leaving the profile behind drops their head to the blank grey block.
  assert.ok(route.includes("set({ playerName: to, currentName: to })"));
});

test("the Minecraft username follows the display name", () => {
  assert.ok(route.includes("set({ displayName: to, minecraftUsername: to })"));
});

test("renaming onto an existing player is refused", () => {
  // There is no record of which rows came from where, so a merge cannot be
  // undone by any later edit.
  assert.match(route, /already exists on the site/);
  assert.match(route, /status: 409/);
});

test("renaming a name that is not on the site is refused", () => {
  // Otherwise a typo reports success having changed nothing at all.
  assert.match(route, /Nobody on the site is called/);
  assert.match(route, /status: 404/);
});

test("everything is checked before anything is written", () => {
  const firstWrite = route.indexOf("await db.update(");
  const notFound = route.indexOf("Nobody on the site is called");
  const merge = route.indexOf("already exists on the site");
  assert.ok(notFound > -1 && notFound < firstWrite, "the empty check runs after the first write");
  assert.ok(merge > -1 && merge < firstWrite, "the merge check runs after the first write");
});

test("the new name has to be a possible Minecraft name", () => {
  assert.ok(route.includes("/^\\w{3,16}$/"));
});

test("only admins can rename", () => {
  assert.ok(route.includes('requireRoleForApi(["ADMIN"])'));
});

test("the rename is recorded in the audit log", () => {
  assert.ok(route.includes('action: "player.rename"'));
});

test("the admin page offers the form, with archived names as well as current", () => {
  assert.ok(forms.includes("export function RenamePlayerForm"));
  assert.ok(page.includes("<RenamePlayerForm names={knownNames} />"));
  assert.ok(page.includes("historicalPlayerStats.playerName"));
});
