import { eq, inArray } from "drizzle-orm";
import { getDb } from "./index";
import {
  fieldingChanges,
  games,
  plateAppearances,
  runnerOuts,
  scorecardActions,
  scorecardLines,
  scorecardLineups,
  scorecards,
} from "./schema";

/**
 * Deletes a live game and anything an umpire had started scoring for it.
 *
 * Refuses when a scorecard was approved: that game's result is already
 * published into the archive, and deleting the live row would leave the
 * published result with nothing behind it. Everything else - a scorecard in
 * progress, one returned for fixes - goes with the game. Children are removed
 * before their parents, because runner_outs points at plate_appearances,
 * which points at the scorecard, which points at the game.
 */
export async function removeLiveGame(gameId: number): Promise<{ error?: string; removedScorecards: number }> {
  const db = getDb();
  const cards = await db.select({ id: scorecards.id, status: scorecards.status }).from(scorecards).where(eq(scorecards.gameId, gameId));

  if (cards.some((card) => card.status === "APPROVED")) {
    return {
      error: "This game's scorecard has been approved and published, so it can't be deleted.",
      removedScorecards: 0,
    };
  }

  const ids = cards.map((card) => card.id);
  if (ids.length > 0) {
    await db.delete(runnerOuts).where(inArray(runnerOuts.scorecardId, ids));
    await db.delete(plateAppearances).where(inArray(plateAppearances.scorecardId, ids));
    await db.delete(fieldingChanges).where(inArray(fieldingChanges.scorecardId, ids));
    await db.delete(scorecardActions).where(inArray(scorecardActions.scorecardId, ids));
    await db.delete(scorecardLines).where(inArray(scorecardLines.scorecardId, ids));
    await db.delete(scorecardLineups).where(inArray(scorecardLineups.scorecardId, ids));
    await db.delete(scorecards).where(inArray(scorecards.id, ids));
  }
  await db.delete(games).where(eq(games.id, gameId));
  return { removedScorecards: ids.length };
}
