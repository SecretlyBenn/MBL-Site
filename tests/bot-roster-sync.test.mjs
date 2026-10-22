import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The MBL and the MCBA do their rosters in Discord; this site mirrors them.
 *
 * Two things can go wrong with that, and neither shows up as an error. The
 * site can accept a push for the off-season tournament, which borrows its
 * players and would have a man moved off his real club. Or the site can let
 * somebody edit an MBL roster here, which lasts until the next push and then
 * disappears with nothing recording that it ever happened.
 *
 * The club matching is the third: the two systems name clubs differently and
 * are joined on the last word, so that rule is worth exercising rather than
 * reading.
 */

const route = readFileSync("app/api/bot/roster-move/route.ts", "utf8");
const gmPage = readFileSync("app/gm/page.tsx", "utf8");
// The statements only: the comment above them explains why the bot gets no
// role, and that explanation must not be what satisfies the test.
const botUser = readFileSync("drizzle/0103_the_bot_is_an_account.sql", "utf8")
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

/**
 * The club matcher, lifted out of the route so it can actually be run rather
 * than read. Only the body is taken: the signature carries TypeScript types,
 * the body does not, so it runs as plain JavaScript.
 */
const clubNamed = (() => {
  const start = route.indexOf("export function clubNamed(");
  assert.ok(start > 0, "clubNamed is gone from the route");
  const open = route.indexOf("{", route.indexOf(")", start));
  return new Function("botName", "clubs", route.slice(open + 1, route.indexOf("\n}", open)));
})();

const MBL = [
  "Arizona Thunderbirds", "California Grizzlies", "Cincinnati Knights",
  "Colorado Blizzards", "Harlem Jazz", "Hershey Otters", "Louisiana Voodoo",
  "Miami Sunset", "Philadelphia Panthers", "Toronto Expos",
].map((name, id) => ({ id, name, leagueId: 1 }));

const MCBA = [
  "Bandits", "Batsmen", "Beavers", "Cacti", "Coyotes (MIBL)",
  "Hitmen", "Samurai", "Sentinels", "Spiders",
].map((name, id) => ({ id, name, leagueId: 2 }));

test("every MBL club the bot knows resolves to exactly one club here", () => {
  const botNames = [
    "thunderbirds", "grizzlies", "knights", "blizzards", "jazz",
    "otters", "voodoo", "sunset", "panthers", "expos",
  ];
  const landed = new Set();
  for (const name of botNames) {
    const club = clubNamed(name, MBL);
    assert.ok(club, `${name} matched no club`);
    landed.add(club.id);
  }
  assert.equal(landed.size, botNames.length, "two bot clubs landed on the same site club");
});

test("every MCBA club the bot knows resolves, and none of them is the Coyotes", () => {
  for (const name of ["spiders", "samurai", "sentinels", "hitmen", "bandits", "cacti", "batsmen", "beavers"]) {
    const club = clubNamed(name, MCBA);
    assert.ok(club, `${name} matched no club`);
    assert.notEqual(club.name, "Coyotes (MIBL)");
  }
});

test("a club the site does not have matches nothing rather than something close", () => {
  // The Dolphins and the Beacons were dropped from the league. A stale push
  // naming one has to be refused, not quietly applied to whoever sorts first.
  assert.equal(clubNamed("dolphins", MBL), undefined);
  assert.equal(clubNamed("beacons", MBL), undefined);
  // A nickname that is only part of another club's is not that club.
  assert.equal(clubNamed("birds", MBL), undefined);
  assert.equal(clubNamed("jaz", MBL), undefined);
});

test("the route refuses a push at the off-season tournament", () => {
  assert.match(route, /league\.isTournament/);
  const guard = route.slice(route.indexOf("league.isTournament"));
  assert.match(guard.slice(0, 300), /status: 400/);
});

test("the secret is compared without giving away where it stops matching", () => {
  const compare = route.slice(route.indexOf("function sameSecret"));
  assert.match(compare.slice(0, 400), /\^=|\|=/, "should xor every character rather than ===");
  assert.doesNotMatch(
    compare.slice(0, 400),
    /return given === expected/,
    "a plain comparison leaks the secret a character at a time",
  );
});

test("an unauthenticated push is refused before anything is read", () => {
  const post = route.slice(route.indexOf("export async function POST"));
  const auth = post.indexOf("Not authorised");
  const body = post.indexOf("request.json()");
  assert.ok(auth > 0 && body > 0 && auth < body, "the secret must be checked before the body is parsed");
});

test("both handlers require the secret", () => {
  for (const handler of ["export async function POST", "export async function GET"]) {
    const start = route.indexOf(handler);
    assert.ok(start > 0, `${handler} is missing`);
    assert.match(route.slice(start, start + 900), /sameSecret/);
  }
});

test("the bot's account is created idempotently and given no roles", () => {
  assert.match(botUser, /WHERE NOT EXISTS/);
  assert.doesNotMatch(botUser, /user_roles/, "the bot must not be granted a role");
  assert.doesNotMatch(botUser, /DELETE|UPDATE|DROP/i);
});

test("/gm offers no roster edits for a competition the bot owns", () => {
  assert.match(gmPage, /const fromDiscord = !isTournament/);
  // Both lists of a club's own players hide their buttons behind that check.
  assert.equal(
    gmPage.split("fromDiscord ? null : (").length - 1,
    2,
    "the active roster and the Triple-A list each need the guard",
  );
  // The pool is not even fetched for them, because it could not be used.
  assert.match(gmPage, /const pool = fromDiscord\s*\?\s*\[\]/);
});

test("a name this site already holds is never re-inserted over its league", () => {
  const lookup = route.slice(route.indexOf("let player ="), route.indexOf("if (!player)"));
  assert.match(lookup, /named\[0\]/, "a row found by name must be used even when its league disagrees");
  assert.ok(
    lookup.indexOf("named[0]") > lookup.indexOf("row.leagueId === null"),
    "the catch-all comes last, so a club or league match still wins",
  );
  // Falling past it reaches the insert, and `minecraft_username` is unique,
  // so the push dies on the constraint and is only ever seen in the debug
  // channel. That is how eight of nine signings went missing.
  assert.ok(route.indexOf("named[0]") < route.indexOf(".insert(players)"));
});

test("a push under a new name finds the man this site still calls something else", () => {
  const body = route.slice(route.indexOf("let player ="), route.indexOf(".insert(players)"));
  assert.match(body, /lookupAccounts/, "the account is the only thing two spellings share");
  assert.match(body, /adoptCurrentName/, "and the ordinary rename path is what moves him");
  // Ahead of the action split, not inside the SIGN branch: a release under a
  // new name has to find him too, or he stays on a roster he has left.
  assert.ok(
    route.indexOf("adoptCurrentName") < route.indexOf("there is nothing to"),
    "the rename lookup must run for every action, not only signings",
  );
});
