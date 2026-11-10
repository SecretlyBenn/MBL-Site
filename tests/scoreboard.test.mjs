import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { boardShape, shapeFor } from "../app/scoreboard/[teamId]/shape.ts";

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
  // The count is in this list now. It used to be asserted separately, on the
  // grounds that it existed nowhere but the plugin, and that stopped being
  // true when the plugin started posting it to /api/plugin/count for the OBS
  // bug. It is the plugin's number either way - the fallback reads the
  // plugin's own last push back off the site - so the rule this test is named
  // for is unchanged, and a board opened in a browser no longer sits on 0-0.
  for (const field of ["awayScore", "homeScore", "outs", "balls", "strikes"]) {
    assert.ok(
      merge.includes(`(connected ? plugin?.${field} : undefined) ??`),
      `${field} no longer prefers the plugin's reading`,
    );
    assert.ok(
      merge.includes(`?? board?.${field} ?? 0`),
      `${field} no longer falls back to the site when no plugin is attached`,
    );
  }
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

test("every board shape is sized from whichever of width and height runs out first", () => {
  // A screen in Minecraft is whatever shape somebody built. Height alone shrank
  // the panels to nothing on a long screen; width alone made the type so large
  // on a near-square one that every name truncated to four letters. Each shape
  // has its own unit now, and every one of them still has to be capped both
  // ways - the ribbon's is five times the ordinary board's and would run off
  // the sides of a merely wide screen without the vw half.
  const table = (board.match(/const UNIT[^=]*=\s*\{[\s\S]*?\n\};/) ?? [""])[0];
  const units = table.match(/"min\([^"]*\)"/g) ?? [];
  assert.ok(units.length >= 3, "the board's scale units are no longer declared in one table");
  for (const unit of units) {
    assert.match(unit, /min\([0-9.]+vh,\s*[0-9.]+vw\)/, `${unit} is not capped on both dimensions`);
  }
  assert.ok(board.includes('"--u": UNIT['), "the board no longer takes its unit from that table");
  assert.ok(
    !/text-\[(length:)?[0-9.]+v[hw]\]/.test(board),
    "some type is sized straight from the viewport again, which breaks one shape or the other",
  );
});

test("the ordinary board's unit fits the column down its middle", () => {
  // The column stacking "at bat", the batter, the diamond and the pitcher is
  // fifty-seven units tall, and it gets the middle row of the board, which is
  // about sixty hundredths of the height. So a unit above roughly 1.06vh draws
  // the diamond through the pitcher's line underneath it.
  //
  // This was 1.25vh and looked right for a year because every screen was
  // sixteen by nine, where the vw cap bit first at 1.03vh and hid it. The
  // first board built wider than that was pinned by the height instead, got
  // the full 1.25, and overflowed. Measured on the live board at 1680x620:
  // fifty-seven units wanted 443px of a 376px row.
  const table = (board.match(/const UNIT[^=]*=\s*\{[\s\S]*?\n\};/) ?? [""])[0];
  const height = Number((table.match(/default:\s*"min\(([0-9.]+)vh/) ?? [])[1]);
  assert.ok(Number.isFinite(height), "the ordinary board no longer has a height figure");
  assert.ok(
    height <= 1.06,
    `the ordinary board's unit is ${height}vh, which overflows the middle column on anything wider than 16:9`,
  );
});

test("an unknown shape falls back to the ordinary board", () => {
  // A shape is typed into a plugin's configuration by hand, and the cost of a
  // typo is a screen the size of a wall in the middle of a ballpark. Anything
  // unrecognised has to render the board everybody already knows rather than an
  // empty one.
  assert.equal(boardShape("wide"), "wide");
  assert.equal(boardShape("tall"), "tall");
  assert.equal(boardShape(undefined), null, "an address with no shape is the original board");
  assert.equal(boardShape("Wide"), null, "a shape is matched exactly, not by case");
  assert.equal(boardShape("ribbon"), null, "an unrecognised shape is not the original board");
  assert.equal(boardShape(""), null);
});

test("the board picks its own shape from the screen it is on", () => {
  // Whoever builds a screen should not have to write its proportions down
  // anywhere: the board can see them. These are the three real boards.
  assert.equal(shapeFor(1920, 1080), null, "an ordinary 16:9 board is the ordinary layout");
  assert.equal(shapeFor(1600, 230), "wide", "a ribbon is not being recognised");
  assert.equal(shapeFor(620, 620), "tall", "a square board is not being recognised");

  // The ordinary board holds across a wide span, because the layouts either
  // side of it are drastic and a screen near a boundary should not flip between
  // them as a window is dragged.
  assert.equal(shapeFor(1600, 800), null, "twice as wide as tall is still an ordinary board");
  assert.equal(shapeFor(1660, 1000), null, "1.66 is near 16:9 and should not change layout");

  // A board three times as wide as it is tall used to lose both batting orders,
  // which is the half of the screen people read. Nothing about the ordinary
  // board breaks at this shape - its unit is pinned to the height above about
  // 1.72, so the rows are the same size as on a 16:9 screen and the extra width
  // only spreads the columns - so it keeps the full layout now.
  assert.equal(shapeFor(1920, 640), null, "a board three times as wide should keep its lineups");
  assert.equal(shapeFor(1920, 548), null, "3.5 is a scoreboard, not a ribbon");

  // Four times as wide is where a real ribbon starts: thirty-two blocks by
  // eight is too short for nine names down each side.
  assert.equal(shapeFor(1920, 480), "wide", "four times as wide as tall is a ribbon");

  // Narrower than about 1.5 and the ordinary board's unit is pinned to the
  // width, so the type shrinks with every block lost while the height goes
  // unused. The orders come off and the middle gets the room instead.
  assert.equal(shapeFor(1200, 900), "tall", "a 4:3 board is squeezed by the two orders");

  // A screen that has not been laid out yet. Dividing by a zero height gives
  // Infinity, which would read as the widest ribbon there is and draw the
  // wrong board for a frame.
  assert.equal(shapeFor(1920, 0), null);
  assert.equal(shapeFor(0, 0), null);
});

test("the shape is read somewhere the server can read it", () => {
  // The page reads the shape out of the address on the server and the board
  // uses it in the browser. Exporting the parser from the board itself made it
  // a client reference, and calling one of those on the server fails the whole
  // render - which is a blank screen in a ballpark, found only by looking.
  assert.ok(
    !/export function boardShape/.test(board),
    "the shape parser is back inside the client board, which breaks the server render",
  );
});

test("a board only shows a game its own club is playing in", () => {
  // The plugin pushes the arena's game into every screen in that arena. A
  // screen pointed at a club that is not in that game used to show it anyway,
  // so a second board in the same ground could not be given a different club.
  // Whose ground it is comes from the address, and that has to win.
  assert.ok(
    board.includes("state.site.clubId !== club.id"),
    "a pushed game is no longer checked against the club in the address",
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

/**
 * The scorebug is the same data wearing a different face, and it breaks the
 * jumbotron's one hard rule on purpose: it polls. These guard the reason that
 * is allowed, which is that a bug has one viewer however many people watch the
 * stream, where a stadium board has one viewer per player in the ground.
 */
const bug = readFileSync("app/scorebug/[teamId]/ScoreBug.tsx", "utf8");

test("the scorebug polls, and the jumbotron still does not", () => {
  assert.match(bug, /setInterval\(/, "a bug that never re-reads shows the first pitch all night");
  // The board next door keeps its single fetch, behind ?preview=1.
  assert.equal([...board.matchAll(/fetch\(/g)].length, 1);
});

test("the scorebug draws nothing when no game is on", () => {
  // An OBS source that is "off" has to be invisible. An idle card would sit
  // over somebody's broadcast saying there is no game during the game.
  assert.match(bug, /if \(!board\) return null;/);
});

test("the count reaches the bug and nothing else reads it", () => {
  assert.match(query, /balls: scorecard\.balls/, "the payload must carry the typed-in count");
  // Nothing may derive from it: it is two numbers for a graphic, and a box
  // score that started reading them would be recording pitches by the back door.
  const boxScore = readFileSync("app/derive-box-score.ts", "utf8");
  assert.doesNotMatch(boxScore, /\bballs\b|\bstrikes\b/);
});

test("recording an at-bat clears the count", () => {
  // Otherwise the umpire has to remember, every batter, all game.
  const atBats = readFileSync("app/api/scorecards/[id]/at-bats/route.ts", "utf8");
  assert.match(atBats, /set\(\{ balls: 0, strikes: 0 \}\)/);
});

test("site furniture stays off both kinds of board", () => {
  const offBoard = readFileSync("app/OffBoard.tsx", "utf8");
  assert.match(offBoard, /scoreboard\|scorebug/, "a cookie banner over a broadcast");
});

test("a home run graphic is fitted to the board, not drawn at its own size", () => {
  // Two mistakes, one after the other. max-height and max-width only ever
  // shrink a picture, so artwork smaller than the cap was drawn at its own
  // pixel size - a 300px gif came out 300px across on a screen the size of a
  // wall. Sizing it instead fixed that but kept the cap at a fraction of the
  // height, which left a postage stamp in a black field. A call takes the
  // whole board.
  // Up to the preview badge, because the call itself contains a `) : null}`
  // of its own and a lazy match stops at the artwork instead of the word.
  const call = (board.match(/\{event \?[\s\S]*?\{preview \?/) ?? [""])[0];
  assert.ok(call.includes("h-full w-full object-contain"), "artwork no longer fills the board");
  assert.ok(
    !/max-h-\[[0-9.]+vh\]/.test(call),
    "artwork is back to a max-height, which cannot scale a small picture up",
  );
  assert.ok(
    call.includes("object-contain"),
    "artwork is no longer fitted, so a gif can be stretched to the screen",
  );

  // The word sits over the foot of the picture rather than taking a row of its
  // own, because that row is what there was no height for on a ribbon.
  assert.ok(/event\.image \? "bottom-/.test(call), "the word takes a row from the artwork again");
});
