import test from "node:test";
import assert from "node:assert/strict";
import { basesBefore } from "../app/derive-box-score.ts";
import { runnersOn } from "../app/bases.ts";
import { readFileSync } from "node:fs";

/**
 * Adding a run that was missed at the time, to a half-inning that is already
 * over.
 *
 * Built from the seventh of scorecard 3, where CookieTheDavid was placed on
 * second to open extra innings, went to third on a single, and scored on an
 * error that never reached the card. The entry form offered the runners on
 * base *now* rather than the ones standing when that play began - and with the
 * half-inning long finished, that list was empty, so there was no way to tick
 * the man who scored.
 */

const COOKIE = 99;
const ONE_TWENTY_FIVE = 198;

const seventh = [
  {
    // The last man to bat in the sixth, which is what makes him the runner
    // placed on second to open the seventh.
    sequence: 40, inning: 6, isHomeBatting: false, batterPlayerId: COOKIE,
    pitcherPlayerId: 1, result: "K", fielders: null, rbis: 0, batterScored: false,
    otherRunsScored: 0, unearnedRuns: 0, outsRecorded: 1, errorPosition: null,
    errorPlayerId: null, stolenBases: 0, runnersScored: "[]", basesAfter: null,
  },
  {
    sequence: 47, inning: 7, isHomeBatting: false, batterPlayerId: 97,
    pitcherPlayerId: 1, result: "K", fielders: null, rbis: 0, batterScored: false,
    otherRunsScored: 0, unearnedRuns: 0, outsRecorded: 1, errorPosition: null,
    errorPlayerId: null, stolenBases: 0, runnersScored: "[]",
    basesAfter: '{"first":null,"second":99,"third":null}',
  },
  {
    sequence: 48, inning: 7, isHomeBatting: false, batterPlayerId: ONE_TWENTY_FIVE,
    pitcherPlayerId: 1, result: "1B", fielders: null, rbis: 0, batterScored: false,
    otherRunsScored: 0, unearnedRuns: 0, outsRecorded: 0, errorPosition: null,
    errorPlayerId: null, stolenBases: 0, runnersScored: "[]",
    basesAfter: '{"first":198,"second":null,"third":99}',
  },
  {
    sequence: 49, inning: 7, isHomeBatting: false, batterPlayerId: 100,
    pitcherPlayerId: 1, result: "K", fielders: null, rbis: 0, batterScored: false,
    otherRunsScored: 0, unearnedRuns: 0, outsRecorded: 1, errorPosition: null,
    errorPlayerId: null, stolenBases: 0, runnersScored: "[]", basesAfter: null,
  },
  {
    sequence: 50, inning: 7, isHomeBatting: false, batterPlayerId: 101,
    pitcherPlayerId: 1, result: "K", fielders: null, rbis: 0, batterScored: false,
    otherRunsScored: 0, unearnedRuns: 0, outsRecorded: 1, errorPosition: null,
    errorPlayerId: null, stolenBases: 0, runnersScored: "[]", basesAfter: null,
  },
];

test("the placed runner is on second when the inning's first batter comes up", () => {
  // He is found from the half-inning before, so that has to be in the record
  // too - the placement is not written down anywhere, it is derived from who
  // batted last.
  const withSixth = [
    {
      sequence: 40, inning: 6, isHomeBatting: false, batterPlayerId: COOKIE,
      pitcherPlayerId: 1, result: "K", fielders: null, rbis: 0, batterScored: false,
      otherRunsScored: 0, unearnedRuns: 0, outsRecorded: 3, errorPosition: null,
      errorPlayerId: null, stolenBases: 0, runnersScored: "[]", basesAfter: null,
    },
    ...seventh,
  ];
  assert.equal(basesBefore(withSixth, 47).second, COOKIE);
});

test("he is on second when the single is reopened, so he can be ticked", () => {
  // This is the whole fix. The play put him on third, but what the form needs
  // is where he stood when the play *began*.
  const bases = basesBefore(seventh, 48);
  const names = runnersOn(bases).map((runner) => runner.playerId);
  assert.deepEqual(names, [COOKIE]);
});

test("the batter of the play is not offered as a runner on it", () => {
  const bases = basesBefore(seventh, 48);
  assert.ok(!runnersOn(bases).some((runner) => runner.playerId === ONE_TWENTY_FIVE));
});

test("a later play in the same half sees who reached ahead of it", () => {
  // The strikeout after the single: two men aboard, both offerable.
  const bases = basesBefore(seventh, 49);
  const aboard = runnersOn(bases).map((runner) => runner.playerId).sort();
  assert.deepEqual(aboard, [COOKIE, ONE_TWENTY_FIVE].sort());
});

test("the third out does not empty the bases for a play being corrected", () => {
  // currentBases returns nothing once a half-inning is over, which is correct
  // for the live diamond and useless for a correction. This is why the form
  // cannot use it.
  const bases = basesBefore(seventh, 50);
  assert.ok(runnersOn(bases).length > 0);
});

test("the diamond is told when it is drawing a past moment", () => {
  // The form offered the runner who was on then while the diamond beside it
  // drew whoever is on now, and the disagreement read as the form naming the
  // wrong man.
  const board = readFileSync(
    new URL("../app/umpire/[scorecardId]/ScoringBoard.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(board.includes("bases={entryBases}"));
  assert.ok(board.includes("asOf={editing ?"));
  // And it cannot be dragged while it is showing one, since the move would go
  // against the live half-inning instead.
  assert.ok(board.includes("busy={busy || Boolean(editing)}"));
});
