import test from "node:test";
import assert from "node:assert/strict";

import { readPlay, thirds } from "../scripts/import-umpire-cards.mjs";

/**
 * The reconciliation the importer prints already checks hits, strikeouts and
 * walks against the other side's pitching line on every card, so a cell read
 * as the wrong one of those cannot get past it. These are the two readings
 * nothing else catches: how many at bats a cell is worth, and what "4.2"
 * innings means.
 */

test("a pitcher's innings are thirds, not decimals", () => {
  assert.equal(thirds("4.0"), 4);
  assert.equal(thirds("5"), 5);
  // 4.2 is four and two thirds - fourteen outs. Read as a decimal it writes a
  // sixth of an inning too few and an ERA a sixth too high.
  assert.equal(Math.round(thirds("4.2") * 3), 14);
  assert.equal(Math.round(thirds("0.1") * 3), 1);
  assert.equal(Math.round(thirds("6.1") * 3), 19);
  assert.equal(thirds(""), null);
});

test("a hit is an at bat and a hit", () => {
  assert.deepEqual(
    { ...readPlay("2B+RBI+adv 3 on E7+R") },
    { ab: 1, hit: 1, double: 1, triple: 0, homer: 0, walk: 0, strikeout: 0, sacFly: 0, sacBunt: 0, rbis: 1, run: 1, caughtStealing: 0 },
  );
  assert.equal(readPlay("3B+RBI+R").triple, 1);
  assert.equal(readPlay("HR+2 RBIs+R").homer, 1);
});

test("a walk and a sacrifice are not at bats", () => {
  assert.equal(readPlay("BB+adv 2").ab, 0);
  assert.equal(readPlay("BB+adv 2").walk, 1);
  assert.equal(readPlay("SF+RBI").ab, 0);
  assert.equal(readPlay("SF+RBI").rbis, 1);
  assert.equal(readPlay("SAC+RBI").ab, 0);
});

test("every way of being retired is an at bat and no hit", () => {
  for (const cell of ["K", "F8", "P2", "L8", "G1", "G1-3", "GO 4-3", "GO 3U", "FC 5-3", "FC 4U", "FO 8-4", "PO3"]) {
    const play = readPlay(cell);
    assert.equal(play.ab, 1, `${cell} should be an at bat`);
    assert.equal(play.hit, 0, `${cell} is not a hit`);
  }
  assert.equal(readPlay("K").strikeout, 1);
});

test("reaching on an error is an at bat and no hit", () => {
  assert.equal(readPlay("E3+adv 2").ab, 1);
  assert.equal(readPlay("E3+adv 2").hit, 0);
  // "R2 on E1" is the same thing written out: reached second on an error.
  assert.equal(readPlay("R2 on E1+R").ab, 1);
  assert.equal(readPlay("R2 on E1+R").hit, 0);
  assert.equal(readPlay("R2 on E1+R").run, 1);
});

test("a skipped batter had no turn at all", () => {
  assert.equal(readPlay("skip"), null);
  assert.equal(readPlay("SKIP"), null);
  assert.equal(readPlay(""), null);
});

test("a pitching change before the pitch does not hide the play", () => {
  assert.equal(readPlay("(RP1) 2B").hit, 1);
  assert.equal(readPlay("(SP > RP1) 1B+RBI+SB+R").hit, 1);
  assert.equal(readPlay("(SP > RP1) 1B+RBI+SB+R").run, 1);
  assert.equal(readPlay("RP1: K").strikeout, 1);
});

test("what the umpire wrote in an inning nobody played is a note", () => {
  assert.equal(readPlay("Hitmen win 4-3").note, "Hitmen win 4-3");
  assert.equal(readPlay("WP: cleanfel").note, "WP: cleanfel");
  assert.equal(readPlay("Series Tied 1-1").note, "Series Tied 1-1");
});

test("being thrown out advancing costs the batter nothing he earned", () => {
  // He singled and was out stretching it. The out belongs to the bases, not
  // to his line: it is still a hit and still one at bat.
  const play = readPlay("1B+out adv");
  assert.equal(play.ab, 1);
  assert.equal(play.hit, 1);
  assert.equal(readPlay("1B+adv 3+out adv Home 7-3-6").hit, 1);
  assert.equal(readPlay("E6 + OADV 2").ab, 1);
  // Two errors' worth of advancing on one double, written without a space.
  assert.equal(readPlay("2B+advE6+advE3(oop)+R+RBI").double, 1);
  assert.equal(readPlay("2B+advE6+advE3(oop)+R+RBI").rbis, 1);
});

test("caught stealing is counted, and a steal is left to the card's own column", () => {
  assert.equal(readPlay("1B+SB+CS5").caughtStealing, 1);
  assert.equal(readPlay("2B+CS+C->T5").caughtStealing, 1);
  assert.equal(readPlay("BB+CS6").caughtStealing, 1);
});
