import type { FieldingSlot } from "./derive-box-score.ts";

/**
 * Where everybody stood, and from which play, for a scored game.
 *
 * The lineup is the wrong place to read this from on its own. It holds where a
 * player is standing now: a position change overwrites it, and a substitution
 * hands the whole row to the man coming in. Read as the starting alignment it
 * credited a whole game to the positions players ended it in - a pitcher and
 * catcher who swapped for the last two outs were each given the other's
 * position for all eighteen, and a first baseman substituted in the fifth was
 * given every out at first while the starter he replaced got none.
 *
 * So the start comes from what the lineup row held before anything moved, and
 * everything after it from the moves themselves, each taking effect from the
 * play after the one it was recorded against.
 */

export type LineupHistoryRow = {
  isHome: boolean;
  playerId: number;
  position: string;
  isStarter: boolean;
  /** Who held the row when the game began; null on rows from before this was kept. */
  startingPlayerId: number | null;
  startingPosition: string | null;
  leftAtSequence: number | null;
};

export type FieldingMove = {
  isHome: boolean;
  playerId: number;
  position: string;
  /** The last play before the move. */
  appliedAtSequence: number;
};

/** Not a position: where a player goes when he leaves the field. */
export const BENCH = "BENCH";

export function fieldingHistory(lineups: LineupHistoryRow[], moves: FieldingMove[]): FieldingSlot[] {
  const slots: FieldingSlot[] = [];

  for (const row of lineups) {
    const starter = row.startingPlayerId ?? (row.isStarter ? row.playerId : null);
    if (starter !== null) {
      slots.push({
        isHome: row.isHome,
        playerId: starter,
        position: row.startingPosition ?? row.position,
        fromSequence: 0,
        // Only the man still holding the row can be the one who walked off.
        untilSequence: starter === row.playerId ? row.leftAtSequence : null,
      });
    } else if (row.leftAtSequence !== null) {
      slots.push({
        isHome: row.isHome,
        playerId: row.playerId,
        position: BENCH,
        fromSequence: row.leftAtSequence + 1,
      });
    }
  }

  // A move recorded against a play is made after it: that play's outs were
  // served by whoever was standing there when it happened.
  for (const move of moves) {
    slots.push({
      isHome: move.isHome,
      playerId: move.playerId,
      position: move.position,
      fromSequence: move.appliedAtSequence + 1,
    });
  }

  return slots;
}
