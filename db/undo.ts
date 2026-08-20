import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  fieldingChanges,
  plateAppearances,
  runnerOuts,
  scorecardActions,
  scorecardLineups,
} from "@/db/schema";

/**
 * Undo for the scoring screen.
 *
 * Every action an umpire takes snapshots the rows it is about to change and
 * names the rows it creates. Undoing restores the one and deletes the other.
 *
 * The alternative - an inverse operation written per action - means seven of
 * them, each free to drift from the thing it is meant to reverse, and each
 * needing to know what the forward operation happened to touch. A pitching
 * change alters a lineup row; so does a substitution, a position change, and
 * a player walking off. They are the same undo, and this way they share it.
 *
 * Nothing here recomputes the score or the innings. The caller does that
 * afterwards from the plate appearances, exactly as it does after a forward
 * action, so the restored state is re-derived rather than trusted.
 */

/** The rows an action touched, as they were before it touched them. */
export type UndoPayload = {
  /** Whole rows to put back, keyed by table. */
  lineups?: (typeof scorecardLineups.$inferSelect)[];
  plateAppearances?: (typeof plateAppearances.$inferSelect)[];
  /** Rows the action created, which undoing removes. */
  deletePlateAppearanceIds?: number[];
  deleteRunnerOutIds?: number[];
  deleteFieldingChangeIds?: number[];
};

/**
 * Records what an action is about to do. Called before the change, so the
 * snapshot is of the state being replaced.
 */
export async function recordAction(
  scorecardId: number,
  kind: string,
  summary: string,
  payload: UndoPayload,
) {
  const db = getDb();
  const [row] = await db
    .insert(scorecardActions)
    .values({ scorecardId, kind, summary, payload: JSON.stringify(payload) })
    .returning();
  return row;
}

/**
 * Adds the rows an action created to an entry already recorded.
 *
 * An insert has no id until it has happened, so the entry goes in first and is
 * completed afterwards. If the insert fails in between, the entry describes
 * nothing to delete and nothing to restore, which undoes correctly.
 */
export async function attachCreated(
  actionId: number,
  created: Pick<
    UndoPayload,
    "deletePlateAppearanceIds" | "deleteRunnerOutIds" | "deleteFieldingChangeIds"
  >,
) {
  const db = getDb();
  const existing = await db.query.scorecardActions.findFirst({
    where: eq(scorecardActions.id, actionId),
  });
  if (!existing) return;
  const payload = { ...(JSON.parse(existing.payload) as UndoPayload), ...created };
  await db
    .update(scorecardActions)
    .set({ payload: JSON.stringify(payload) })
    .where(eq(scorecardActions.id, actionId));
}

/** The action that would be undone next, or null when there is nothing to undo. */
export async function latestAction(scorecardId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(scorecardActions)
    .where(eq(scorecardActions.scorecardId, scorecardId))
    .orderBy(desc(scorecardActions.id));
  return rows.find((row) => row.undoneAt === null) ?? null;
}

/**
 * Reverses the most recent action that has not already been reversed.
 *
 * Deletions come first: a plate appearance cannot be removed while a runner
 * out still points at it, and a restored row must not collide with one the
 * action created.
 */
export async function undoLatest(scorecardId: number) {
  const db = getDb();
  const action = await latestAction(scorecardId);
  if (!action) return null;

  const payload = JSON.parse(action.payload) as UndoPayload;

  if (payload.deleteRunnerOutIds?.length) {
    await db.delete(runnerOuts).where(inArray(runnerOuts.id, payload.deleteRunnerOutIds));
  }
  if (payload.deletePlateAppearanceIds?.length) {
    // Any runner out hanging off a play being removed goes with it - the out
    // happened inside a plate appearance that is about to stop existing.
    await db
      .delete(runnerOuts)
      .where(inArray(runnerOuts.plateAppearanceId, payload.deletePlateAppearanceIds));
    await db
      .delete(plateAppearances)
      .where(inArray(plateAppearances.id, payload.deletePlateAppearanceIds));
  }
  if (payload.deleteFieldingChangeIds?.length) {
    await db
      .delete(fieldingChanges)
      .where(inArray(fieldingChanges.id, payload.deleteFieldingChangeIds));
  }

  for (const row of payload.lineups ?? []) {
    const { id, ...rest } = row;
    await db.update(scorecardLineups).set(rest).where(eq(scorecardLineups.id, id));
  }
  for (const row of payload.plateAppearances ?? []) {
    const { id, ...rest } = row;
    await db.update(plateAppearances).set(rest).where(eq(plateAppearances.id, id));
  }

  await db
    .update(scorecardActions)
    .set({ undoneAt: new Date().toISOString() })
    .where(eq(scorecardActions.id, action.id));

  return action;
}
