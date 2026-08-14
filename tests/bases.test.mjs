import assert from "node:assert/strict";
import test from "node:test";
import { advance, EMPTY_BASES, forcedRunners, runnerCount } from "../app/bases.ts";

const on = (first = null, second = null, third = null) => ({ first, second, third });

test("a leadoff single puts the batter on first and drives nobody in", () => {
  const { bases, runs } = advance(EMPTY_BASES, {
    batterPlayerId: 1,
    result: "1B",
    scored: [],
  });
  assert.deepEqual(bases, on(1));
  assert.equal(runs, 0);
});

test("a home run clears the bases and scores everyone", () => {
  const { bases, runs } = advance(on(2, 3, 4), {
    batterPlayerId: 1,
    result: "HR",
    scored: [],
  });
  assert.deepEqual(bases, EMPTY_BASES);
  // Three runners score; the batter is recorded separately by the caller.
  assert.equal(runs, 3);
});

test("a walk with a runner on first forces them to second", () => {
  const { bases, runs } = advance(on(2), { batterPlayerId: 1, result: "BB", scored: [] });
  assert.deepEqual(bases, on(1, 2));
  assert.equal(runs, 0);
});

test("a walk with the bases loaded forces in a run", () => {
  const { bases, runs } = advance(on(2, 3, 4), {
    batterPlayerId: 1,
    result: "BB",
    scored: [],
  });
  // The runner from third is forced home; everyone else moves up one.
  assert.deepEqual(bases, on(1, 2, 3));
  assert.equal(runs, 1);
});

test("a walk with first and second occupied leaves third alone", () => {
  const { bases, runs } = advance(on(2, 3), { batterPlayerId: 1, result: "BB", scored: [] });
  assert.deepEqual(bases, on(1, 2, 3));
  assert.equal(runs, 0);
});

test("a runner the umpire says scored comes off the bases", () => {
  const { bases, runs } = advance(on(null, null, 4), {
    batterPlayerId: 1,
    result: "1B",
    scored: [4],
  });
  assert.deepEqual(bases, on(1));
  assert.equal(runs, 1);
});

test("a strikeout leaves the bases exactly as they were", () => {
  const { bases, runs } = advance(on(2, 3), { batterPlayerId: 1, result: "K", scored: [] });
  assert.deepEqual(bases, on(2, 3));
  assert.equal(runs, 0);
});

test("a runner retired on the play leaves without scoring", () => {
  const { bases, runs } = advance(on(2), {
    batterPlayerId: 1,
    result: "FC",
    scored: [],
    batterTo: "first",
    outRunners: [2],
  });
  assert.deepEqual(bases, on(1));
  assert.equal(runs, 0);
});

test("a skipped batter does not touch the bases", () => {
  const { bases, runs } = advance(on(2, 3), { batterPlayerId: 1, result: "SKIP", scored: [] });
  assert.deepEqual(bases, on(2, 3));
  assert.equal(runs, 0);
});

test("a double puts the batter on second and pushes nobody by force", () => {
  const { bases } = advance(on(2), { batterPlayerId: 1, result: "2B", scored: [] });
  // The runner from first is not forced past second by a double, but cannot
  // share it - the umpire states where they ended up, so the default keeps
  // them where the batter did not land.
  assert.equal(bases.second, 1);
});

test("forced runners are only those with nowhere to retreat", () => {
  assert.deepEqual(forcedRunners(EMPTY_BASES), []);
  assert.deepEqual(forcedRunners(on(2)), ["first"]);
  assert.deepEqual(forcedRunners(on(2, 3)), ["first", "second"]);
  assert.deepEqual(forcedRunners(on(2, 3, 4)), ["first", "second", "third"]);
  // A runner on second with first empty is not forced anywhere.
  assert.deepEqual(forcedRunners(on(null, 3)), []);
});

test("runner count reflects who is aboard", () => {
  assert.equal(runnerCount(EMPTY_BASES), 0);
  assert.equal(runnerCount(on(2, 3, 4)), 3);
});

test("a single with the bases empty leaves the batter on first", () => {
  // The regression this guards: the screen sent its own idea of the bases
  // along with the play, and an out-of-date one said the bases were still
  // empty after a single. The runner could then not be moved off first,
  // because as far as the record was concerned he was never on it.
  const { bases } = advance(EMPTY_BASES, {
    batterPlayerId: 77,
    result: "1B",
    scored: [],
  });
  assert.equal(bases.first, 77);
});

test("a runner who is not on base cannot score", () => {
  // The regression: the screen offered a stale list of runners, the umpire
  // ticked one who had already come off, and the play was credited with a run
  // nobody ran. The game read 3-0 with the bases still loaded.
  const { bases, runs } = advance(on(191, 190), {
    batterPlayerId: 999,
    result: "1B",
    scored: [190, 191, 192],
  });
  assert.equal(runs, 2);
  assert.equal(bases.first, 999);
});

test("a home run scores everyone aboard, and leaves the batter to the caller", () => {
  // The batter is recorded separately; counting them here as well would put
  // four runs on a grand slam and then a fifth.
  const { runs } = advance(on(2, 3, 4), {
    batterPlayerId: 1,
    result: "HR",
    scored: [2, 3, 4],
  });
  assert.equal(runs, 3);
});

test("a batter who scores does not also stand on a base", () => {
  // The regression: the batter reached on a single and was also ticked as
  // having come round. He was counted as a run and left on first, where the
  // next play could score him again. The game read 3-0 from one hit.
  const { bases, runs } = advance(on(191, 190), {
    batterPlayerId: 192,
    result: "1B",
    scored: [190, 191],
    batterTo: "home",
  });
  assert.deepEqual(bases, { first: null, second: null, third: null });
  // The two runners; the batter is counted by the caller.
  assert.equal(runs, 2);
});

test("a runner on second goes to third on a single", () => {
  // The runners go with the batter. This is what happens on the field nearly
  // every time, so it is where the play starts rather than something the
  // umpire has to enter by hand.
  const { bases, runs } = advance(on(null, 50), {
    batterPlayerId: 7,
    result: "1B",
    scored: [],
  });
  assert.equal(bases.third, 50);
  assert.equal(bases.first, 7);
  assert.equal(bases.second, null);
  assert.equal(runs, 0);
});

test("a runner on third scores on a single", () => {
  const { bases, runs } = advance(on(null, null, 50), {
    batterPlayerId: 7,
    result: "1B",
    scored: [],
  });
  assert.equal(runs, 1);
  assert.equal(bases.first, 7);
  assert.equal(bases.third, null);
});

test("a double moves everyone up two", () => {
  const { bases, runs } = advance(on(60, 50), {
    batterPlayerId: 7,
    result: "2B",
    scored: [],
  });
  // From second: home. From first: third. The batter takes second.
  assert.equal(runs, 1);
  assert.equal(bases.third, 60);
  assert.equal(bases.second, 7);
  assert.equal(bases.first, null);
});

test("a walk moves only the runners with nowhere to stand", () => {
  // A runner on second is not forced by a walk and stays put.
  const { bases, runs } = advance(on(null, 50), {
    batterPlayerId: 7,
    result: "BB",
    scored: [],
  });
  assert.equal(bases.second, 50);
  assert.equal(bases.first, 7);
  assert.equal(runs, 0);
});

test("an out leaves the runners where they were", () => {
  const { bases, runs } = advance(on(60, 50), { batterPlayerId: 7, result: "GO", scored: [] });
  assert.equal(bases.first, 60);
  assert.equal(bases.second, 50);
  assert.equal(runs, 0);
});
