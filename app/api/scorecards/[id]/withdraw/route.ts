import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { plateAppearances, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { deriveBoxScore } from "@/app/derive-box-score";
import { POSITIONS, type Position } from "@/app/scoring";

type WithdrawPayload = {
  playerId: number;
  /** Set to put them back on the field. */
  undo?: boolean;
  /** Where they are standing on their return; defaults to where they were. */
  position?: string;
};

/**
 * Takes a player off the field, and puts them back on when they return.
 *
 * Neither of the existing routes covers this. A substitution needs someone
 * coming in off the bench, and a position change leaves the player standing
 * somewhere - so a player who had walked away was still occupying his
 * position and blocking anyone else from being moved there.
 *
 * They keep their lineup row and their batting slot throughout. Players in
 * this league wander off and come back, and dropping them out of the order
 * would mean rebuilding it twice; while they are gone their turn is skipped,
 * and everything already on the card - the at-bats taken, the outs served at
 * that position, the putouts made - stays theirs.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const { id } = await params;
    const scorecardId = Number(id);

    const db = getDb();
    const scorecard = await db.query.scorecards.findFirst({
      where: eq(scorecards.id, scorecardId),
    });
    if (!scorecard) return Response.json({ error: "No such scorecard." }, { status: 404 });
    if (scorecard.status === "APPROVED") {
      return Response.json({ error: "This scorecard is approved and locked." }, { status: 409 });
    }

    const payload = (await request.json()) as WithdrawPayload;
    if (!Number.isInteger(payload.playerId)) {
      return Response.json({ error: "Which player?" }, { status: 400 });
    }

    const row = await db.query.scorecardLineups.findFirst({
      where: and(
        eq(scorecardLineups.scorecardId, scorecardId),
        eq(scorecardLineups.playerId, payload.playerId),
      ),
    });
    if (!row) {
      return Response.json({ error: "That player is not in the lineup." }, { status: 404 });
    }

    if (payload.undo) {
      if (payload.position && !POSITIONS.includes(payload.position as Position)) {
        return Response.json({ error: "Unknown position." }, { status: 400 });
      }
      // Somebody may have taken their position while they were gone, so the
      // spot they are given on the way back is stated rather than assumed -
      // two players on one base is exactly what this route exists to prevent.
      const taken =
        payload.position &&
        (await db.query.scorecardLineups.findFirst({
          where: and(
            eq(scorecardLineups.scorecardId, scorecardId),
            eq(scorecardLineups.isHome, row.isHome),
            eq(scorecardLineups.position, payload.position),
            isNull(scorecardLineups.leftAtSequence),
          ),
        }));
      if (taken && taken.playerId !== row.playerId) {
        return Response.json(
          { error: `Somebody is already at ${payload.position}.` },
          { status: 409 },
        );
      }

      await db
        .update(scorecardLineups)
        .set({ leftAtSequence: null, position: payload.position ?? row.position })
        .where(eq(scorecardLineups.id, row.id));
      return Response.json({ ok: true, back: true, position: payload.position ?? row.position });
    }

    // Recorded against where the game has got to, so the outs he served and
    // the plays he made before walking off all still stand.
    const appearances = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));
    const sequence = appearances.reduce((highest, pa) => Math.max(highest, pa.sequence), 0);

    await db
      .update(scorecardLineups)
      .set({ leftAtSequence: sequence })
      .where(eq(scorecardLineups.id, row.id));

    const box = deriveBoxScore(appearances);

    return Response.json({
      ok: true,
      inning: box.currentInning,
      position: row.position,
      battingOrder: row.battingOrder,
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not take that player out of the game." }, { status: 500 });
  }
}
