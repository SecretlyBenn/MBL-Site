/** A straight draft runs the order again every round; a snake turns it round. */
export const DRAFT_MODES = ["STRAIGHT", "SNAKE"] as const;
export type DraftMode = (typeof DRAFT_MODES)[number];

/**
 * Every pick of a draft, in the order they will be used.
 *
 * A straight draft runs the order again each round - the club with the first
 * pick has the first pick of every round, which is how the regular season
 * does it. A snake turns the order round on the even rounds, so whoever picks
 * last in the first round picks first in the second and the wait between a
 * club's two picks is the same for everybody.
 *
 * `reversedByRound` overrules the mode for the rounds it names, which is how
 * a league runs a pattern neither mode describes. One in use here goes
 * forward, reversed, reversed, forward and then repeats, which is not a snake
 * and is not straight; saying it round by round covers it and covers whatever
 * is used next, where a third mode would only have covered this one.
 *
 * On its own, with nothing imported, because this is the whole of what
 * decides a draft's order and getting it wrong is not something a page would
 * show you - a snake drawn straight looks like a draft.
 */
export function draftSlots(
  teamIds: number[],
  rounds: number,
  mode: DraftMode,
  reversedByRound?: Map<number, boolean | null>,
): { overall: number; round: number; teamId: number }[] {
  const slots: { overall: number; round: number; teamId: number }[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    const said = reversedByRound?.get(round);
    const reversed =
      said === undefined || said === null ? mode === "SNAKE" && round % 2 === 0 : said;
    const order = reversed ? [...teamIds].reverse() : teamIds;
    for (const teamId of order) {
      slots.push({ overall: slots.length + 1, round, teamId });
    }
  }
  return slots;
}

/**
 * The directions of the first `cycle` rounds, repeated across `rounds`.
 *
 * What the admin page's repeat button does. A league running the same four
 * rounds over and over should say it once, not twenty times, and twenty
 * dropdowns set by hand is twenty chances to set one wrong.
 */
export function repeatRounds<T>(first: T[], rounds: number): Map<number, T> {
  const out = new Map<number, T>();
  if (first.length === 0) return out;
  for (let round = 1; round <= rounds; round += 1) {
    out.set(round, first[(round - 1) % first.length]);
  }
  return out;
}
