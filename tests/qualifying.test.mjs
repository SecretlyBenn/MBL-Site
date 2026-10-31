import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { minInningsPitched, minPlateAppearances } from "../app/scoring.ts";

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
    leaders.includes("schedulesPlayed(row).reduce((total, games) => total + minimum(games), 0)"),
    "the leaders page no longer sums a career's seasons",
  );
  assert.ok(
    leaders.includes("careerGames.get(row.playerName)"),
    "the career bar is not built from the seasons he actually played",
  );
});
