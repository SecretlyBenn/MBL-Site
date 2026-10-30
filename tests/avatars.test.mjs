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

test("a player with no account on file is asked for by name, and files himself", () => {
  const head = readFileSync("app/PlayerHead.tsx", "utf8");
  const byName = readFileSync("app/api/head/by-name/[name]/route.ts", "utf8");

  // The six-hourly refresh that keeps every account current is keyed by the
  // uuid, so a player with no profile row cannot reach it - and he is the one
  // who needs it. Asking by name is the way in, and it writes the account down
  // so the next page uses his uuid like anybody else's.
  assert.ok(head.includes("/api/head/by-name/"), "a player with no account is never asked about");
  assert.ok(byName.includes("insert(minecraftProfiles)"), "the lookup is not written down, so every view repeats it");
  assert.ok(byName.includes("adoptCurrentName"), "an account already on file under an old name is not merged");

  // Only a name Mojang could have issued. The MCBA's seasons are full of
  // hand-typed nicknames and anything from Season VI or earlier is a Discord
  // name, so sending those to the relay would be asking a question with no
  // answer, on every page, forever.
  assert.ok(head.includes("MINECRAFT_NAME.test(name)"), "any string at all is sent to the relay");
  assert.ok(byName.includes("MINECRAFT_NAME") && byName.includes("{3,16}"), "the route does not check the name it was given");
});

test("an unresolvable name answers with nothing, and is not asked again soon", () => {
  const byName = readFileSync("app/api/head/by-name/[name]/route.ts", "utf8");

  // It has to be an image: a 404 puts a broken-image icon in the middle of a
  // roster. One transparent pixel leaves the neutral box showing, and a
  // default skin would put a stranger's face there instead.
  assert.ok(byName.includes('"Content-Type": "image/png"'), "an unknown name does not answer with an image");
  assert.ok(byName.includes("UNRESOLVED_CACHE_SECONDS"), "an unknown name is asked about again on the next view");

  // But a relay that is merely busy must not be cached as an answer about the
  // player, or a bad minute becomes a bad week.
  const busy = byName.slice(byName.indexOf("} catch {"), byName.indexOf("if (!account)"));
  assert.ok(busy.includes("max-age=300"), "a busy relay is cached as though it were an answer");
});
