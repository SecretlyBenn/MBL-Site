import test from "node:test";
import assert from "node:assert/strict";
import { buildBracket, splitsByLeague, stageLabel } from "../app/standings/build-bracket.ts";

/**
 * The bracket is read back out of who played whom, so these build small
 * postseasons the way the archive stores them and check what comes out.
 */

let id = 0;
const game = (away, home, awayScore = null, homeScore = null, status = null) => ({
  id: (id += 1), awayTeamId: away, homeTeamId: home, awayScore, homeScore, playedOn: null, status,
});
const teams = [
  { id: 1, name: "A1", league: "AMERICAN" }, { id: 2, name: "A2", league: "AMERICAN" },
  { id: 3, name: "A3", league: "AMERICAN" }, { id: 4, name: "A4", league: "AMERICAN" },
  { id: 5, name: "N1", league: "NATIONAL" }, { id: 6, name: "N2", league: "NATIONAL" },
  { id: 7, name: "N3", league: "NATIONAL" }, { id: 8, name: "N4", league: "NATIONAL" },
];
const labels = (rounds) =>
  rounds.map((round) => round.series.map((_, slot) => stageLabel(round.stage, round.leagues[slot])));

test("eight clubs: division series, championship series, then the World Series", () => {
  // Only the first round is on the schedule; the rest are open slots.
  const rounds = buildBracket([game(2, 1), game(4, 3), game(6, 5), game(8, 7)], teams);
  assert.deepEqual(labels(rounds), [["ALDS", "ALDS", "NLDS", "NLDS"], ["ALCS", "NLCS"], ["WS"]]);
  assert.equal(splitsByLeague(rounds), true);
});

test("six clubs with byes: the first round is the division series", () => {
  const rounds = buildBracket(
    [game(2, 1, 1, 2), game(6, 5, 1, 2), game(1, 3, 1, 2), game(5, 7, 1, 2), game(7, 3, 1, 2)],
    teams,
  );
  assert.deepEqual(labels(rounds), [["ALDS", "NLDS"], ["ALCS", "NLCS"], ["WS"]]);
});

test("a season with every club in one league is not split or labelled by league", () => {
  const oneLeague = teams.map((team) => ({ ...team, league: "AMERICAN" }));
  const rounds = buildBracket([game(2, 1), game(6, 5)], oneLeague);
  assert.equal(splitsByLeague(rounds), false);
  assert.equal(rounds[0].label, "Championship Series");
  assert.equal(stageLabel(rounds.at(-1).stage, null), "WS");
});

test("a best-of-three won 2-0 is won, once its third game is marked not needed", () => {
  // Club 1 wins at home 3-1, then away 4-2.
  const series = [game(2, 1, 1, 3), game(1, 2, 4, 2), game(2, 1, null, null, "NOT_NEEDED")];
  const [final] = buildBracket(series, teams);
  assert.equal(final.series[0].winnerId, 1);
  const open = buildBracket([game(2, 1, 1, 3), game(1, 2, 4, 2), game(2, 1)], teams);
  assert.equal(open[0].series[0].winnerId, null);
});
