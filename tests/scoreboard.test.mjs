import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The stadium jumbotron reads from two sources that each know half the game:
 * the Minecraft plugin owns the count and the score, the site owns every name.
 * Most of what can go wrong here is one of them being trusted for something it
 * does not actually know.
 */

const query = readFileSync("db/scoreboard.ts", "utf8");
const board = readFileSync("app/scoreboard/[teamId]/Jumbotron.tsx", "utf8");
const route = readFileSync("app/api/scoreboard/[teamId]/route.ts", "utf8");
const layout = readFileSync("app/layout.tsx", "utf8");
const page = readFileSync("app/scoreboard/[teamId]/page.tsx", "utf8");

test("the board never polls the site on its own", () => {
  // One fetch per player watching is what would actually take the site down:
  // the whole plan is that the plugin polls once for everybody.
  const fetches = [...board.matchAll(/fetch\(/g)];
  assert.equal(fetches.length, 1, "the board fetches from somewhere new");

  const preview = board.slice(board.indexOf("if (!preview) return;"));
  assert.ok(
    preview.indexOf("fetch(") < preview.indexOf("}, [preview,"),
    "the only fetch is no longer inside the preview-only effect",
  );
});

test("both sides carry their own next batter and pitcher", () => {
  // The plugin is normally a play ahead - the third out is called on the field
  // before it is written down - so the board has to be able to name the other
  // side's leadoff man without waiting for the site to catch up.
  assert.ok(query.includes("nextBatter"), "a side no longer carries its next batter");
  const side = query.slice(query.indexOf("const sideOf ="), query.indexOf("return {\n    clubId"));
  assert.ok(side.includes("nextBatter:"), "the next batter is not worked out per side");
  assert.ok(side.includes("pitcher:"), "the pitcher is not worked out per side");
});

test("runners are dropped when the plugin has moved on to the next half", () => {
  // The site's runners belong to the half the site thinks is being played.
  // Once the plugin has rolled over they are last half's runners, and drawing
  // them puts a man on second who is already in the dugout.
  assert.ok(board.includes("sameHalf"), "the half-inning agreement check is gone");
  const merge = board.slice(board.indexOf("function merge("));
  assert.ok(
    /const bases = sameHalf \? board\?\.bases \?\? \[\] : \[\]/.test(merge),
    "stale runners are no longer blanked on a half-inning disagreement",
  );
});

test("the plugin wins on what it owns and the site on what it names", () => {
  const merge = board.slice(board.indexOf("function merge("));
  for (const field of ["awayScore", "homeScore", "outs"]) {
    assert.ok(
      merge.includes(`(connected ? plugin?.${field} : undefined) ??`),
      `${field} no longer prefers the plugin's reading`,
    );
  }
  // The count exists nowhere else - the site does not record pitches.
  assert.ok(merge.includes("balls: plugin?.balls"), "the count is no longer taken from the plugin");
  assert.ok(merge.includes("strikes: plugin?.strikes"), "the count is no longer taken from the plugin");
});

test("a three-digit club colour cannot silently lose the panel its tint", () => {
  // The panels build a gradient by appending an alpha pair, and "#abc" plus
  // "44" is not a colour at all.
  const safe = board.slice(board.indexOf("function safeColor("));
  assert.ok(safe.includes("hex.length === 4"), "short hex colours are no longer expanded");
});

test("the endpoint is public and says so, and a quiet stadium is not an error", () => {
  assert.ok(!route.includes("requireRole"), "the scoreboard endpoint now demands a role");
  assert.ok(route.includes("live: board !== null"), "an idle ground no longer reports itself");
  assert.ok(route.includes("s-maxage"), "the endpoint lost its floor under a polling mistake");
});

test("site furniture stays off the stadium screens", () => {
  // A cookie notice over the score, and every player's client counted as a
  // visitor, are both things nobody would think to look for.
  assert.ok(layout.includes("<OffBoard>"), "the board no longer opts out of the site chrome");
  const wrapped = layout.slice(layout.indexOf("<OffBoard>"), layout.indexOf("</OffBoard>"));
  assert.ok(wrapped.includes("<CookieNotice />"), "the cookie notice is back on the jumbotron");
  assert.ok(wrapped.includes("<Analytics />"), "the analytics beacon is back on the jumbotron");
});

test("logos are absolute, because the mod's own page is a file:// document", () => {
  assert.ok(query.includes("new URL(path, origin)"), "logo addresses are relative again");
  assert.ok(page.includes("new URL(path, origin)"), "the idle board's logo is relative again");
  assert.ok(page.includes('headers()'), "the origin is no longer taken from the request");
});

test("the club's own ground is preferred over a game they are away at", () => {
  assert.ok(
    query.includes("live.find((row) => row.homeTeamId === clubId) ?? live[0]"),
    "a club's home game is no longer the one their own screen shows",
  );
});
