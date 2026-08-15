import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { fieldingChanges, plateAppearances, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { gameState } from "@/app/derive-box-score";
import { POSITIONS } from "@/app/scoring";

type Assignment = { playerId: number; position: string };

/**
 * Records a defensive rearrangement for the fielding team, effective from the
 * next at-bat. Only the positions that actually changed are stored, so the log
 * reads as a list of moves rather than a repeated full alignment.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const scorecardId = Number((await params).id);
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

    const valid = new Set<string>(POSITIONS);
    for (const assignment of assignments) {
      if (!valid.has(assignment.position)) {
        return Response.json({ error: `Unknown position ${assignment.position}.` }, { status: 400 });
      }
    }
    const filled = assignments.map((assignment) => assignment.position);
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
    const state = gameState(appearances);

    await db.insert(fieldingChanges).values(
      assignments.map((assignment) => ({
        scorecardId,
        isHome,
        inning: state.inning,
        appliedAtSequence: appearances.length,
        playerId: assignment.playerId,
        position: assignment.position,
      })),
    );

    // The change also has to reach the lineup, which is where every other
    // part of the game reads a player's position from - the diamond, the tag
    // pickers, the scorecard. Recording only the history left the move visible
    // nowhere: the panel said it had happened and every position stayed put.
    for (const assignment of assignments) {
      await db
        .update(scorecardLineups)
        .set({ position: assignment.position })
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
