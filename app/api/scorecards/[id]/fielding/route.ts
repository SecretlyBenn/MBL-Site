import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { inningsPerGameForScorecard } from "@/db/queries";
import { logAudit } from "@/db/audit";
import { fieldingChanges, plateAppearances, players, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { attachCreated, recordAction } from "@/db/undo";
import { gameState } from "@/app/derive-box-score";
import { POSITIONS } from "@/app/scoring";
import { BENCH } from "@/app/fielding-history";

type Assignment = { playerId: number; position: string };

/**
 * Records a defensive rearrangement for the fielding team, effective from the
 * next at-bat. Only the positions that actually changed are stored, so the log
 * reads as a list of moves rather than a repeated full alignment.
 *
 * The bench is one of the destinations. Somebody can walk out of a game with
 * nobody to replace them, and a substitution needs an incoming player, so
 * without this they stayed standing where they were and blocked the position
 * for anyone else. Sending a man to the bench is the same kind of move as
 * sending him to right field, and it is recorded in the same breath - a
 * rearrangement that benches one player and shifts two others is one moment on
 * the card and one thing to undo.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const scorecardId = Number((await params).id);
    const inningsPerGame = await inningsPerGameForScorecard(scorecardId);
    const db = getDb();

    const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
    if (!scorecard) return Response.json({ error: "No such scorecard." }, { status: 404 });
    if (scorecard.status === "APPROVED") {
      return Response.json({ error: "This scorecard is approved and locked." }, { status: 409 });
    }

    const { isHome, assignments } = (await request.json()) as {
      isHome: boolean;
      assignments: Assignment[];
    };

    const valid = new Set<string>([...POSITIONS, BENCH]);
    for (const assignment of assignments) {
      if (!valid.has(assignment.position)) {
        return Response.json({ error: `Unknown position ${assignment.position}.` }, { status: 400 });
      }
    }
    // The bench is left out of this: it is not a position, and a whole side can
    // be sitting on it at once. Two men at shortstop is still a mistake.
    const filled = assignments
      .map((assignment) => assignment.position)
      .filter((position) => position !== BENCH);
    if (new Set(filled).size !== filled.length) {
      return Response.json({ error: "Two players are assigned the same position." }, { status: 400 });
    }
    const people = assignments.map((assignment) => assignment.playerId);
    if (new Set(people).size !== people.length) {
      return Response.json({ error: "A player is assigned two positions." }, { status: 400 });
    }

    const appearances = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));
    const state = gameState(appearances, inningsPerGame);
    // The sequence of the last play, not how many plays there are. Those are
    // the same number only until an at-bat is deleted, and everything that
    // reads it - who was standing where when a play happened, which inning the
    // move belongs to, and from which play a benched man stops taking his turn
    // - compares it against real sequences.
    const sequence = appearances.reduce((last, pa) => Math.max(last, pa.sequence), 0);

    // Snapshotted before anything moves, so undo can put every position back
    // as one action rather than leaving half a rearrangement behind.
    const affected = await db
      .select()
      .from(scorecardLineups)
      .where(
        and(
          eq(scorecardLineups.scorecardId, scorecardId),
          inArray(
            scorecardLineups.playerId,
            assignments.map((assignment) => assignment.playerId),
          ),
        ),
      );
    const nameOf = new Map(
      (await db.select().from(players)).map((player) => [player.id, player.displayName]),
    );
    const summary = assignments
      .map(
        (assignment) =>
          `${nameOf.get(assignment.playerId) ?? "Player"} to ${
            assignment.position === BENCH ? "the bench" : assignment.position
          }`,
      )
      .join(", ");
    const action = await recordAction(scorecardId, "POSITION_CHANGE", summary, {
      lineups: affected,
    });

    const created = await db.insert(fieldingChanges).values(
      assignments.map((assignment) => ({
        scorecardId,
        isHome,
        inning: state.inning,
        appliedAtSequence: sequence,
        playerId: assignment.playerId,
        position: assignment.position,
      })),
    ).returning();

    await attachCreated(action.id, {
      deleteFieldingChangeIds: created.map((row) => row.id),
    });

    // The change also has to reach the lineup, which is where every other
    // part of the game reads a player's position from - the diamond, the tag
    // pickers, the scorecard. Recording only the history left the move visible
    // nowhere: the panel said it had happened and every position stayed put.
    // Moving somebody to P is a pitching change, whatever panel it was done
    // from. The mound has an order of its own - who came in after whom - and a
    // position change that did not touch it left the new pitcher standing on
    // the mound while every at-bat was still charged to the man he replaced.
    const side = await db
      .select()
      .from(scorecardLineups)
      .where(
        and(eq(scorecardLineups.scorecardId, scorecardId), eq(scorecardLineups.isHome, isHome)),
      );
    const highest = Math.max(0, ...side.map((row) => row.pitchingOrder ?? 0));
    const takingTheMound = assignments.find((assignment) => assignment.position === "P");
    const alreadyPitching =
      takingTheMound &&
      side.find((row) => row.playerId === takingTheMound.playerId)?.pitchingOrder === highest &&
      highest > 0;

    for (const assignment of assignments) {
      const arriving = assignment.position === "P" && !alreadyPitching;
      const benched = assignment.position === BENCH;
      await db
        .update(scorecardLineups)
        .set({
          // A benched man keeps the position he was standing in, because that
          // is where he is put back if he comes out again, and his row is what
          // "Back on" reads. What marks him as gone is the sequence: from the
          // next play his turn in the order is skipped and his position is
          // free for somebody else. Being given a position is the other
          // direction, so it clears that - otherwise a man moved back onto the
          // field would be standing there and still being skipped.
          ...(benched ? { leftAtSequence: sequence } : { position: assignment.position, leftAtSequence: null }),
          ...(arriving ? { pitchingOrder: highest + 1 } : {}),
        })
        .where(
          and(
            eq(scorecardLineups.scorecardId, scorecardId),
            eq(scorecardLineups.playerId, assignment.playerId),
          ),
        );
    }

    await logAudit({
      actingUserId: user.id,
      action: "scorecard.fielding",
      entityType: "scorecard",
      entityId: scorecardId,
      detail: { isHome, inning: state.inning, moves: assignments.length },
    });

    return Response.json({ ok: true, inning: state.inning, moves: assignments.length });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not record the position change." }, { status: 500 });
  }
}
