import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { plateAppearances } from "@/db/schema";

/**
 * Recomputes which half-inning every at-bat belongs to, in sequence order.
 *
 * Innings cannot be fixed at the moment an at-bat is entered, because editing
 * an earlier one changes where every later inning boundary falls: correct a
 * groundout to a single and the third out moves, taking the rest of the game
 * with it. Deriving the innings from the outs keeps the card consistent no
 * matter which at-bat was edited.
 *
 * Returns the number of rows whose half-inning actually moved, so a caller can
 * tell the umpire the correction rippled.
 */
export async function resequenceInnings(scorecardId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(plateAppearances)
    .where(eq(plateAppearances.scorecardId, scorecardId))
    .orderBy(asc(plateAppearances.sequence));

  let inning = 1;
  let isHomeBatting = false;
  let outs = 0;
  let moved = 0;

  for (const row of rows) {
    if (row.inning !== inning || row.isHomeBatting !== isHomeBatting) {
      await db
        .update(plateAppearances)
        .set({ inning, isHomeBatting })
        .where(eq(plateAppearances.id, row.id));
      moved += 1;
    }

    outs += row.outsRecorded;
    if (outs >= 3) {
      outs = 0;
      if (isHomeBatting) {
        inning += 1;
        isHomeBatting = false;
      } else {
        isHomeBatting = true;
      }
    }
  }

  return { moved, rows: rows.length };
}
