import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * The site read on a phone.
 *
 * Most of the league reads the site on one, and four things were wrong in a
 * way that cannot be seen from a laptop: figures cut off with no way to reach
 * them, a page that scrolled sideways, a menu you could read the page through,
 * and tables squeezed past legibility. Each of these holds the fix in place.
 */

const css = readFileSync("app/globals.css", "utf8");

/** The phone-sized rules for stat tables, from their comment to the next one. */
function phoneTableRules() {
  const at = css.indexOf("A stat table on a phone");
  assert.ok(at > 0, "the phone sizing for stat tables is gone");
  const end = css.indexOf("/* The line score", at);
  assert.ok(end > at, "the block after the phone sizing has moved");
  return css.slice(at, end);
}
const menu = readFileSync("app/MobileMenu.tsx", "utf8");
const game = readFileSync("app/[league]/games/[gameId]/page.tsx", "utf8");
const player = readFileSync("app/[league]/players/history/[playerName]/page.tsx", "utf8");
const standings = readFileSync("app/[league]/standings/StandingsTable.tsx", "utf8");
const board = readFileSync("app/umpire/[scorecardId]/ScoringBoard.tsx", "utf8");

test("a wide stat table keeps the figures reachable on a phone", () => {
  // The two label columns are measured from the longest name in the table.
  // On a laptop that is right; on a phone they came to 500px of a 343px
  // screen, so a reader saw a list of names and not one number beside them.
  const block = phoneTableRules();
  assert.match(block, /@media \(width < 40rem\)/);
  assert.match(block, /has-two-labels col:first-child/, "the player column is no longer capped");
  assert.match(block, /has-two-labels col:nth-child\(2\)/, "the club column is no longer narrowed");
  // Only the tables that state every width from their data, never the ones
  // that merely borrow `stat-table` - the head umpire's review does, and its
  // second column is a figure, not a club.
  for (const [rule] of block.matchAll(/^\s*\.data-table\.stat-table[^{\n]*(?:col|nth-child)[^{\n]*$/gm)) {
    assert.match(rule, /\.is-measured/, `${rule.trim()} reaches tables it was not meant for`);
  }
});

test("a table cell is never hidden, only what is inside it", () => {
  // A td or th set to display:none drops out of its row but leaves its column
  // behind in the colgroup, so every figure after it slides one column left
  // and the headings stop belonging to the numbers under them. Hiding the
  // cell's contents keeps the column and empties it.
  const block = phoneTableRules();
  const rule = /^\s*(\.data-table[^\n{]*(?:th|td):nth-child\(\d+\)[^\n{,]*)\s*[,{]\s*$/gm;
  let found = 0;
  for (const [, raw] of block.matchAll(rule)) {
    const selector = raw.trim();
    found += 1;
    assert.ok(
      / > \*$/.test(selector) || /\s\.[\w-]+$/.test(selector),
      `${selector} hides a cell rather than its contents`,
    );
  }
  assert.ok(found >= 2, "the rule this is checking has moved, so it is checking nothing");
});

test("the box score scrolls rather than being cut off", () => {
  // Nine batting columns want about 430px and a phone has 340. The card they
  // sit in is overflow-hidden for its rounded corners, so what did not fit was
  // simply gone - there was no run batted in on a phone at all.
  const wrapped = game.match(/<div className="overflow-x-auto">\s*\n\s*<table className="data-table w-full table-auto">/g);
  assert.equal(wrapped?.length, 2, "the batting and pitching tables are not both in a scroller");
});

test("every table shell scrolls rather than hiding what will not fit", () => {
  // It was plain `overflow: hidden`, which is what rounds a table's corners
  // off against its card, and the wide tables mostly had an overflow-x-auto
  // added by hand on top. The ones that did not - the head umpire's review of
  // a box score, a season's own stat tables - lost their last columns on a
  // narrow screen with no scrollbar and no way to reach them.
  const at = css.indexOf(".data-table-shell {");
  assert.ok(at > 0, "the table shell is gone");
  const rule = css.slice(at, css.indexOf("}", at));
  assert.match(rule, /overflow-x: auto/);
  assert.match(rule, /overflow-y: clip/, "hidden on one axis becomes auto when the other scrolls");
});

test("a bleeding banner matches the padding it is pulling against", () => {
  // The shell is px-4 on a phone and px-6 from sm. A -mx-6 against px-4 put
  // the banner 8px past the right edge, which gave the page a sideways scroll
  // of its own on every player.
  const at = player.indexOf("-mx-");
  assert.ok(at > 0, "the banner no longer bleeds");
  const classes = player.slice(at - 40, at + 200);
  assert.match(classes, /-mx-4/, "the phone bleed does not match px-4");
  assert.match(classes, /sm:-mx-6/, "the wider bleed does not match sm:px-6");
});

test("the menu over the page is opaque", () => {
  // It was a 98% slate over a backdrop blur, which should have been as good as
  // solid and was not: the page showed through plainly enough to read, its
  // headings running into the links drawn on top of them.
  const at = menu.indexOf("absolute inset-x-0 top-full");
  assert.ok(at > 0, "the menu panel is gone");
  const classes = menu.slice(at, menu.indexOf('"', at));
  assert.match(classes, /bg-slate-950(?![/\d])/, "the panel background carries an alpha again");
  assert.doesNotMatch(classes, /backdrop-blur/, "there is nothing to blur behind an opaque panel");
});

test("the menu stops the page scrolling underneath it", () => {
  assert.match(menu, /document\.body\.style\.overflow = "hidden"/);
  assert.match(menu, /document\.body\.style\.overflow = wasOverflow/, "the page never gets its scroll back");
});

test("the scoring board shows one part at a time until it fits", () => {
  // Stacked into one column the board is about three thousand pixels: an
  // umpire on a phone scrolled past the bases and both lineups to change a
  // pitcher, and the scorecards were somewhere off the bottom.
  assert.match(board, /const PARTS = \[/, "the board no longer has parts");
  assert.match(board, /part === which \? "" : "hidden xl:block"/, "a part is no longer put away");
  // Every one of them, or a tab leads to a blank screen.
  for (const key of ["bat", "bases", "mound", "field", "cards"]) {
    assert.ok(board.includes(`only("${key}")`), `the ${key} tab shows nothing`);
  }
  // The tabs and the four-column board must never both be on screen.
  assert.match(board, /role="tablist"[\s\S]{0,400}?xl:hidden/);
  assert.match(board, /grid items-start gap-3 xl:grid-cols-4/);
});

test("picking a cell on the scorecard opens the panel that edits it", () => {
  // The cell is tapped on one tab and answered on another, so without this
  // tapping it looks as though it did nothing at all.
  const at = board.indexOf("function pick(");
  assert.ok(at > 0, "the board no longer opens an earlier at-bat");
  assert.match(board.slice(at, at + 600), /setPart\("bat"\)/);
});

test("the standings drop columns on a phone rather than crushing them", () => {
  // Eight columns across 343px leaves 25px each, and the table is table-fixed,
  // so it crushes rather than scrolls. Both tables are rendered and one is
  // hidden - see the comment on Standing for why not CSS.
  assert.match(standings, /function Standing\(/, "the phone standings are gone");
  assert.match(standings, /<div className="sm:hidden"><Table \{\.\.\.props\} compact \/><\/div>/);
  assert.match(standings, /<div className="hidden sm:block"><Table \{\.\.\.props\} \/><\/div>/);
  assert.doesNotMatch(
    standings,
    /<Table\s+key=\{division\}/,
    "a division still renders the full table directly, so it is not responsive",
  );
});
