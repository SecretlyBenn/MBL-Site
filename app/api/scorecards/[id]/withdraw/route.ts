import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { plateAppearances, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { deriveBoxScore } from "@/app/derive-box-score";
import { MINIMUM_LINEUP } from "@/app/scoring";

type WithdrawPayload = {
  playerId: number;
  /** Set to put them back, for a misclick. */
  undo?: boolean;
};

/**
 * Takes a player out of the game with nobody replacing them.
 *
 * Neither of the existing routes covers this. A substitution needs someone
 * coming in off the bench, and a position change leaves the player standing
 * somewhere - so a player who had gone home was still occupying his base and
 * blocking anyone else from being moved there.
 *
 * The lineup row stays. Everything already on the card belongs to it: the
 * at-bats he took, the outs he served at his position, the putouts he made.
 * Only what comes after stops counting, which is what leaving the game means.
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
      await db
        .update(scorecardLineups)
        .set({ leftAtSequence: null })
        .where(eq(scorecardLineups.id, row.id));
      return Response.json({ ok: true, remaining: null });
    }

    // A side has to keep enough players to go on. Below the minimum the game
    // cannot continue, so the umpire is told rather than left to discover it
    // when the batting order runs out.
    const staying = await db
      .select({ playerId: scorecardLineups.playerId })
      .from(scorecardLineups)
      .where(
        and(
          eq(scorecardLineups.scorecardId, scorecardId),
          eq(scorecardLineups.isHome, row.isHome),
          isNull(scorecardLineups.leftAtSequence),
        ),
      );
    const remaining = staying.filter((entry) => entry.playerId !== payload.playerId).length;
    if (remaining < MINIMUM_LINEUP) {
      return Response.json(
        {
          error: `That would leave ${remaining} player${remaining === 1 ? "" : "s"}, and ${MINIMUM_LINEUP} is the minimum to play. Take the game as a forfeit instead.`,
        },
        { status: 409 },
      );
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
      remaining,
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
