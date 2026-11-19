import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REAL_SEASON_GAMES, minInningsPitched, minPlateAppearances, countsAsASeason } from "../app/scoring.ts";

const leaders = readFileSync("app/[league]/statistics/leaders/page.tsx", "utf8");
const records = readFileSync("app/[league]/statistics/records/page.tsx", "utf8");
const boards = readFileSync("app/[league]/statistics/boards.ts", "utf8");

test("a batter needs one and a half plate appearances for every game", () => {
  // MBL Season XII was 22 games, so 33 - the figure the league asked for.
  assert.equal(minPlateAppearances(22), 33);
  assert.equal(minPlateAppearances(17), 26, "17 games rounds up, not down");
  assert.equal(minPlateAppearances(0), 0, "a season with no games recorded shuts nobody out");
});

test("a pitcher needs an inning for every game", () => {
  assert.equal(minInningsPitched(22), 22);
  assert.equal(minInningsPitched(0), 0);
});

test("the bar is the player's own club's games, not the season's", () => {
  // A club that played a shorter schedule - a forfeited week, a late entry -
  // is judged on the games it actually had rather than against clubs who
  // played more.
  assert.ok(leaders.includes("clubGames(row.teamName)"), "the leaders page judges everybody by one figure");
  assert.ok(records.includes("clubGames.get(row.seasonId)?.get(clubOf(row.teamName))"), "the records page judges everybody by one figure");

  // A traded player's line is filed under the club he finished with, and the
  // name carries how many others he turned out for.
  assert.ok(records.includes("clubOf(row.teamName)"), "a traded player's club never matches, so he is never qualified");
});

test("nothing is judged against the season's own average any more", () => {
  for (const [name, source] of [["leaders", leaders], ["records", records]]) {
    assert.ok(!source.includes("averageAtBats"), `${name} still averages at-bats`);
    assert.ok(!source.includes("averageInnings"), `${name} still averages innings`);
  }
});

test("only the rate boards ask for a minimum", () => {
  // A save, a win or a complete game is a thing that happened, and no number
  // of innings makes it more true. A closer would never reach a starter's bar
  // and his saves are not worth less for it.
  const saves = boards.slice(boards.indexOf('key: "saves"'), boards.indexOf('key: "saves"') + 90);
  assert.ok(!saves.includes("qualified"), "the save board now shuts out every closer who collects them");
  for (const rate of ["era", "whip"]) {
    const board = boards.slice(boards.indexOf(`key: "${rate}"`), boards.indexOf(`key: "${rate}"`) + 110);
    assert.ok(board.includes("qualified: true"), `${rate} takes anybody with one good inning`);
  }
});

test("a career is held to the sum of its seasons' bars", () => {
  // Five seasons of 22 games ask for five times a season's 33, not 33 once.
  // Judging a career by one season's bar would put a three-at-bat September
  // at the top of the all-time batting average.
  const seasons = [22, 22, 22, 22, 22];
  const careerBar = seasons.reduce((total, games) => total + minPlateAppearances(games), 0);
  assert.equal(careerBar, 165);
  assert.ok(
    leaders.includes("counted.reduce((total, games) => total + minimum(games), 0)"),
    "the leaders page no longer sums a career's seasons",
  );
  assert.ok(
    leaders.includes("careerGames.get(row.playerName)"),
    "the career bar is not built from the seasons he actually played",
  );
});

test("a club that played ten games or fewer did not play a season", () => {
  // A late entry, a season abandoned, a playoff round. One and a half of
  // nothing is a bar anybody clears, so those used to hand out rate titles
  // for four good at-bats.
  assert.equal(REAL_SEASON_GAMES, 10);
  assert.equal(countsAsASeason(10), false, "ten games is not a season");
  assert.equal(countsAsASeason(11), true);
  // Nought is no schedule rather than a short one: the off-season tournament
  // keeps no standings, and its own rate boards must still rank somebody.
  assert.equal(countsAsASeason(0), true);

  // A career of nothing but short schedules has no bar it could clear, so it
  // is left off the rate boards rather than let in on a bar of nought.
  assert.ok(leaders.includes("if (counted.length === 0) return Infinity;"), "a stub career still qualifies");
  assert.ok(records.includes("if (!countsAsASeason(games)) return false;"), "the records page does not know the rule");

  // A whole season that was short is still that season - the MCBA's early
  // years ran seven games and every playoff round is a handful - so nothing
  // is taken off anybody on their own season's page. The rule is for the club
  // that played four while the rest of its season played twenty.
  assert.ok(
    leaders.includes("!countsAsASeason(games) && !wholeSeasonWasShort"),
    "a seven-game season loses its own rate boards",
  );
});

/**
 * The boards you want fewest of read lowest first.
 *
 * They used to read most-first like every other counting board, which put
 * "Hits allowed" topped by the man who allowed the most among the records
 * for wins and shutouts - a leaderboard of badness among leaderboards of
 * goodness, and the first thing a reader said looked wrong.
 */
const allBoards = readFileSync("app/[league]/statistics/boards.ts", "utf8");

test("the allowed boards count up from fewest, over a real innings load", () => {
  const pitching = allBoards.slice(allBoards.indexOf("export const PITCHING"));
  const body = pitching.slice(0, pitching.indexOf("\n];"));
  for (const key of ["hitsAllowed", "runsAllowed", "earnedRuns", "homeRunsAllowed", "walksAllowed", "losses"]) {
    const line = body.split("\n").find((l) => l.includes(`key: "${key}"`));
    assert.ok(line, `${key} is gone from the pitching boards`);
    assert.match(line, /ascending: true/, `${key} still reads most first`);
    // Without the innings bar the fewest hits allowed is whoever threw one
    // inning, which is why these were most-first to begin with.
    assert.match(line, /qualified: true/, `${key} has no innings bar, so fewest means barely pitched`);
    // The record for the most of each is not lost, it moves to Worst.
    assert.match(line, /worstLabel: "Most /, `${key} has no worst end`);
  }
});

test("the good counting boards still read most first", () => {
  const pitching = allBoards.slice(allBoards.indexOf("export const PITCHING"));
  const body = pitching.slice(0, pitching.indexOf("\n];"));
  for (const key of ["wins", "saves", "shutouts", "strikeoutsPitched"]) {
    const line = body.split("\n").find((l) => l.includes(`key: "${key}"`));
    assert.doesNotMatch(line, /ascending: true/, `${key} was turned round too`);
  }
});

test("fielding percentage needs chances, and the errors stay beside it", () => {
  // Half the archive's fielding seasons are a clean 1.000, so unqualified
  // this board was a thousand-way tie.
  assert.ok(allBoards.includes("export const MIN_CHANCES"), "there is no chance minimum");
  const fielding = allBoards.slice(allBoards.indexOf("export const FIELDING"));
  const body = fielding.slice(0, fielding.indexOf("\n];"));
  assert.ok(body.includes('key: "fieldingPct"'), "fielding percentage is still missing");
  assert.match(body, /fieldingPct[\s\S]*?qualified: true/, "it is not held to a minimum");
  assert.ok(body.includes('key: "errors"'), "the errors were replaced rather than joined");

  // Worst only: even over twenty chances the top of it is two dozen men all
  // reading 1.000, which is what kept it off the site in the first place.
  assert.match(body, /fieldingPct[\s\S]*?worstOnly: true/, "the Best tab shows a board of ties");
  assert.ok(allBoards.includes("export function bestFirst"), "there is no way to leave a board off Best");
  for (const page of ["records", "leaders"]) {
    const source = readFileSync(`app/[league]/statistics/${page}/page.tsx`, "utf8");
    assert.ok(source.includes("bestFirst(boards)"), `${page} still shows every board on Best`);
  }

  for (const page of ["records", "leaders"]) {
    const source = readFileSync(`app/[league]/statistics/${page}/page.tsx`, "utf8");
    assert.ok(source.includes("qualifiedFielders"), `${page} reads the rate board off everybody`);
    assert.ok(source.includes("MIN_CHANCES"), `${page} does not apply the chance minimum`);
  }
});

test("a player page opens on the competition in the address", () => {
  // Switching leagues in the header took you to a page still showing the
  // other one, which looked like the switch had not worked.
  const tabs = readFileSync("app/[league]/players/PlayerLeagues.tsx", "utf8");
  assert.ok(tabs.includes("opensOn"), "the tabs ignore the address");
  assert.ok(
    tabs.includes("records.find((record) => record.slug === opensOn)?.slug ?? records[0]?.slug"),
    "the address does not pick the tab, or there is no fallback",
  );
  const page = readFileSync("app/[league]/players/history/[playerName]/page.tsx", "utf8");
  assert.ok(page.includes("opensOn={leagueSlug}"), "the page does not pass its own league down");
});

test("a box score shows putouts and errors when the game recorded them", () => {
  const box = readFileSync("app/[league]/games/[gameId]/page.tsx", "utf8");
  const batting = box.slice(box.indexOf("function BattingTable"), box.indexOf("function PitchingTable"));
  assert.ok(batting.includes("<th>PO</th>"), "the box score has no putouts column");
  assert.ok(batting.includes("<th>E</th>"), "the box score has no errors column");
  // Half the archive's box scores carry no fielding at all, and two columns
  // of dashes over a game that never recorded any is worse than not asking.
  assert.ok(batting.includes("const fielded = rows.some("), "the columns are drawn whatever the game has");
  // Nothing recorded is not the same as nothing handled.
  assert.ok(batting.includes('row.putouts ?? "-"'), "an unrecorded putout reads as a nought");
  assert.ok(batting.includes('row.errors ?? "-"'), "an unrecorded error reads as a nought");

  // The pitching table is the pitching line and gains nothing from them: a
  // pitcher who bats is already in the batting table above.
  const pitching = box.slice(box.indexOf("function PitchingTable"));
  assert.ok(!pitching.slice(0, pitching.indexOf("</table>")).includes("<th>PO</th>"));
});
