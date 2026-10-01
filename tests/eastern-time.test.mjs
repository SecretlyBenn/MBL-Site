import test from "node:test";
import assert from "node:assert/strict";
import {
  EASTERN_LABEL,
  easternInputToIso,
  inEastern,
  instantFrom,
  toEasternInputValue,
} from "../app/eastern.ts";

/**
 * Every time on this site is Eastern, because that is the time the league is
 * run in: games are arranged in Eastern in Discord and a player in California
 * knows to take three hours off. Showing each reader their own clock meant two
 * people looking at one fixture saw different hours and neither label said
 * which was which.
 *
 * These are about the two halves of that rule pulling in opposite directions.
 * The *label* never changes with the season - the league asked for "ET" in June
 * and December alike - but the *offset* behind it has to, or the hour printed
 * would be wrong for half the year.
 */

test("the label is ET in summer and in winter", () => {
  // Not EDT and EST. A schedule that renames its timezone halfway through the
  // year reads as though something changed when nothing did.
  assert.ok(inEastern("2026-07-15T18:00:00.000Z").endsWith(` ${EASTERN_LABEL}`));
  assert.ok(inEastern("2026-01-15T18:00:00.000Z").endsWith(` ${EASTERN_LABEL}`));
  for (const stored of ["2026-07-15T18:00:00.000Z", "2026-01-15T18:00:00.000Z"]) {
    assert.doesNotMatch(inEastern(stored), /EDT|EST/, "the label followed the clocks");
  }
});

test("but the hour behind the label does follow the clocks", () => {
  // The same instant is an hour apart either side of the change. If this ever
  // stops being true, the fixed label has quietly become a fixed offset and
  // every summer game is listed an hour out.
  assert.match(inEastern("2026-07-15T18:00:00.000Z"), /2:00 PM/);
  assert.match(inEastern("2026-01-15T18:00:00.000Z"), /1:00 PM/);
});

test("ten at night Eastern is ten at night whatever the season", () => {
  // Four hours behind UTC in summer, five in winter. This is the whole point of
  // asking the platform for the offset rather than keeping a number here.
  assert.equal(easternInputToIso("2026-07-15T22:00"), "2026-07-16T02:00:00.000Z");
  assert.equal(easternInputToIso("2026-01-15T22:00"), "2026-01-16T03:00:00.000Z");
});

test("the hour is still right on the two days the clocks move", () => {
  // The offset before and after the time being converted is not the same on
  // these days, so a single pass guesses from the wrong side of the change and
  // lands an hour out. In 2026 the clocks go forward on 8 March and back on
  // 1 November.
  assert.equal(easternInputToIso("2026-03-08T01:30"), "2026-03-08T06:30:00.000Z");
  assert.equal(easternInputToIso("2026-03-08T03:00"), "2026-03-08T07:00:00.000Z");
  assert.equal(easternInputToIso("2026-11-01T03:00"), "2026-11-01T08:00:00.000Z");
});

test("a time an admin opens is the time they typed", () => {
  // The box is shown in Eastern and read back as Eastern, so opening a fixture
  // and saving it without touching anything cannot move it.
  for (const stored of ["2026-03-08T07:00:00.000Z", "2026-07-16T02:00:00.000Z", "2026-01-16T03:00:00.000Z"]) {
    assert.equal(easternInputToIso(toEasternInputValue(stored)), stored);
  }
});

test("a bare time from the archive import is read as Eastern, not as UTC", () => {
  // The older rows are wall-clock strings with no zone on them at all. They
  // were written in the league's own time; reading them as UTC - which the site
  // used to do - moved every one of them by four or five hours.
  assert.equal(instantFrom("2026-09-13T22:30").toISOString(), "2026-09-14T02:30:00.000Z");
  // Anything carrying a zone is already an instant and is taken at face value.
  assert.equal(instantFrom("2026-09-13T22:30:00.000Z").toISOString(), "2026-09-13T22:30:00.000Z");
});

test("nothing to show is shown as nothing", () => {
  // These run against form fields that start empty, and "Invalid Date" on a
  // scheduling page reads as though the fixture is broken.
  assert.equal(inEastern(""), "");
  assert.equal(inEastern(null), "");
  assert.equal(toEasternInputValue(undefined), "");
  assert.equal(easternInputToIso(""), null);
});

test("a date with no time on it carries no timezone label", () => {
  // There is no hour for a timezone to be about, and "September 13, 2026 ET"
  // reads like a mistake.
  assert.doesNotMatch(inEastern("2026-09-13T22:30:00.000Z", "dateOnly"), /ET/);
});
