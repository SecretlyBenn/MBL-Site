import test from "node:test";
import assert from "node:assert/strict";
import { MODPACK } from "../app/client/modpack.ts";

/**
 * The modpack list is read by every launcher on every start, and a mistake in
 * it is league-wide and silent - the launcher either refuses the mod or
 * installs the wrong build, and the player sees neither. These are the three
 * ways the list has actually been wrong, rather than every way it could be.
 */

test("every mod pins an exact build", () => {
  // `client-fabric`'s own list spells this key `version` for two mods, which
  // reads as no build at all, and the launcher fails the whole install on it.
  for (const mod of MODPACK.mods) {
    assert.ok(mod.versionId, `${mod.id} has no versionId`);
    assert.equal(mod.source, "modrinth", `${mod.id} is not from Modrinth`);
  }
});

test("no placeholder survived into the list", () => {
  // MBL Utils' build id is written as `${versionId}` in client-fabric and
  // substituted by its release workflow. A copy taken before that step would
  // carry the placeholder through and pin the league to a mod that does not
  // exist.
  for (const mod of MODPACK.mods) {
    assert.doesNotMatch(mod.versionId, /\$\{/, `${mod.id} still holds a placeholder`);
  }
});

test("a mod is listed once", () => {
  // Adding a mod means appending to the list, and appending one that is
  // already there is the easy mistake. Modrinth would be asked for the same
  // project twice with two different builds pinned.
  const ids = MODPACK.mods.map((mod) => mod.id);
  assert.equal(new Set(ids).size, ids.length, "a project id appears twice");
});

test("the launcher's required fields are all present", () => {
  // The three versions are not optional in the launcher's parser, so an empty
  // one fails the install before any mod is fetched.
  assert.ok(MODPACK.gameVersion);
  assert.ok(MODPACK.loaderVersion);
  assert.ok(MODPACK.apiVersion);
  assert.ok(MODPACK.mods.length > 0);
});
