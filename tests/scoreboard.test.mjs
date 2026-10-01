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
const css = readFileSync("app/globals.css", "utf8");

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

test("the line score's runs column is the plugin's total, not the sum beside it", () => {
  // The plugin is a play ahead, so for a second or two after a run scores the
  // total is right and the inning it belongs to is still a nought. Totalling
  // the innings here instead would make this disagree with the big score in
  // the club's own panel, which is the one people are looking at.
  assert.ok(
    board.includes("awayScore={view.awayScore}") && board.includes("homeScore={view.homeScore}"),
    "the line score no longer takes its totals from the merged view",
  );
  const linescore = board.slice(board.indexOf("function LinescoreBoard("));
  assert.ok(
    !/line\.(away|home)\.reduce/.test(linescore),
    "the runs column is being totalled from the innings again",
  );
});

test("a half-inning nobody has batted in is a gap, not a nought", () => {
  // The difference between being held scoreless and still being in the dugout.
  // deriveBoxScore only pads the array as far as a side has batted, so the
  // length is the whole signal and an index past it must not read as zero.
  const linescore = board.slice(board.indexOf("function LinescoreBoard("));
  assert.ok(
    linescore.includes("frame <= runs.length"),
    "an unplayed half-inning no longer shows as blank",
  );
});

test("season figures are held rather than read on every poll", () => {
  // The query is cheap - the archive indexes player_name and a game's worth of
  // players is a couple of hundred rows - but this endpoint is polled every few
  // seconds for a whole evening, and a couple of hundred rows two thousand
  // times over is a quarter of the day's read budget for one game. A season
  // total cannot move while the game is being played: it changes when a
  // scorecard is approved, which is after the last pitch.
  assert.ok(query.includes("seasonCache"), "season figures are read on every poll again");
  assert.ok(query.includes("SEASON_HELD_MS"), "the figures are no longer held for a while");
});

test("the day's figures still cost nothing, because the box score is derived anyway", () => {
  assert.ok(query.includes("state.awayBatting"), "the day's batting lines are no longer reused");
  assert.ok(query.includes("state.awayInnings"), "the line score is no longer reused");
});

test("the averages come from whichever season the league has set", () => {
  // Not a season named in the code. During the playoffs the setting says
  // playoffs, and the board should not quietly disagree with the rest of the
  // site about what is being played.
  assert.ok(query.includes("currentSeasonName"), "the board picks its own season again");
  assert.doesNotMatch(query, /Season X[I]*["']/, "a season is named in the code");
});

test("one competition's averages cannot land on the other's board", () => {
  // current_season names one season for the whole site, and the MCBA's seasons
  // are not the MBL's. A club whose league that season does not belong to gets
  // no averages rather than somebody else's.
  const held = query.slice(query.indexOf("async function seasonLines"));
  assert.ok(
    held.includes("season.leagueId !== leagueId"),
    "the season is no longer checked against the club's competition",
  );
});

test("the order shows the season, the man at the plate shows his day", () => {
  // Which is how a ballpark board splits it: the column beside each name is
  // what he hits, and what he has done tonight belongs to whoever is up.
  assert.ok(
    board.includes("detail={average(row.season)}"),
    "the order is back to showing tonight's line beside every name",
  );
  assert.ok(board.includes("dayLine(batter.line)"), "the man at the plate lost his day");
});

test("heads come from the account id, batched, and by an absolute address", () => {
  // Names get reused by strangers, which is why nothing on this site draws a
  // head from one. The address has to be absolute for the same reason the
  // crests do: the mod can be pointed at a bundled file:// page.
  assert.ok(query.includes("getAvatarsFor"), "heads are looked up one at a time again");
  assert.ok(
    board.includes("${origin}/api/head/${uuid}"),
    "a head address is relative again, which breaks a file:// board",
  );
});

test("the board is sized from whichever of width and height runs out first", () => {
  // A screen in Minecraft is whatever shape somebody built. Height alone shrank
  // the panels to nothing on a long screen; width alone made the type so large
  // on a near-square one that every name truncated to four letters.
  assert.ok(
    /--u["\s:]+.*min\(.*vh.*vw/.test(board),
    "the scale unit no longer takes the smaller of the two dimensions",
  );
  assert.ok(
    !/text-\[(length:)?[0-9.]+v[hw]\]/.test(board),
    "some type is sized straight from the viewport again, which breaks one shape or the other",
  );
});

test("the board's condensed face is served, not left to next/font", () => {
  // vinext writes the developer's own filesystem path into an @font-face it
  // generates, so the live site asked browsers for
  // file:///C:/Users/.../.vinext/fonts/... and got nothing. Every width on this
  // board is measured against the condensed face; falling back to an ordinary
  // sans truncates half the names on it.
  assert.ok(
    !page.includes("next/font"),
    "the jumbotron loads its face through next/font again, which does not reach the browser",
  );
  assert.ok(css.includes('font-family: "Barlow Condensed"'), "the face is no longer declared");
  assert.ok(
    css.includes('url("/fonts/barlow-condensed-700.woff2")'),
    "the face is no longer served from this site",
  );
  assert.ok(
    board.includes('"Barlow Condensed"'),
    "the board no longer asks for the face it is measured against",
  );
});
