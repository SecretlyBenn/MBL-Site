/**
 * Every pick of a draft, in the order they will be used.
 *
 * Each round says which way round it runs, and a round that says nothing runs
 * the order as it was entered. There is no straight-or-snake setting above
 * this: a snake is rounds 2, 4, 6 reversed, a straight draft is no round
 * reversed, and the pattern this league actually uses - forward, reversed,
 * reversed, forward, repeating - is neither, which is what a mode could not
 * say. One place decides the order, so there is nothing for a second place to
 * disagree with.
 *
 * On its own, with nothing imported, because this is the whole of what decides
 * a draft's order and getting it wrong is not something a page would show you:
 * a reversed round drawn forward still looks like a draft.
 */
export function draftSlots(
  teamIds: number[],
  rounds: number,
  reversedByRound?: Map<number, boolean | null>,
): { overall: number; round: number; teamId: number }[] {
  const slots: { overall: number; round: number; teamId: number }[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    const order = reversedByRound?.get(round) ? [...teamIds].reverse() : teamIds;
    for (const teamId of order) {
      slots.push({ overall: slots.length + 1, round, teamId });
    }
  }
  return slots;
}

/**
 * The first `first.length` rounds, laid over all of them again and again.
 *
 * What the admin page's repeat button does, and the only shortcut there is now
 * that nothing sits above the rounds: a twenty-round snake would otherwise be
 * ten dropdowns set one at a time, and this league's four-round pattern would
 * be twenty. Setting the first few and repeating them is both quicker and
 * harder to get wrong, because the pattern is written once.
 */
export function repeatRounds<T>(first: T[], rounds: number): Map<number, T> {
  const out = new Map<number, T>();
  if (first.length === 0) return out;
  for (let round = 1; round <= rounds; round += 1) {
    out.set(round, first[(round - 1) % first.length]);
  }
  return out;
}
