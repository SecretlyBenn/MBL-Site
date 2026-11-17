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
 * On its own, with nothing imported, because it is the whole of what
 * distinguishes the two modes and getting it wrong is not something a page
 * would show you - a snake drawn straight looks like a draft.
 */
export function draftSlots(
  teamIds: number[],
  rounds: number,
  mode: DraftMode,
): { overall: number; round: number; teamId: number }[] {
  const slots: { overall: number; round: number; teamId: number }[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    const order = mode === "SNAKE" && round % 2 === 0 ? [...teamIds].reverse() : teamIds;
    for (const teamId of order) {
      slots.push({ overall: slots.length + 1, round, teamId });
    }
  }
  return slots;
}
