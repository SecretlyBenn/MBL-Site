import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inningsPerGameForScorecard } from "@/db/queries";
import { logAudit } from "@/db/audit";
import { games, plateAppearances, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { deriveBoxScore } from "@/app/derive-box-score";

/** Ends scoring and sends the card to the head umpire. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const scorecardId = Number((await params).id);
    const inningsPerGame = await inningsPerGameForScorecard(scorecardId);
    const db = getDb();

    const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
    if (!scorecard) return Response.json({ error: "No such scorecard." }, { status: 404 });
    // A card sent back for correction is submitted again the same way, so
    // RETURNED is as valid a starting point here as IN_PROGRESS. Refusing it
    // left a returned game with no way back to review.
    if (scorecard.status !== "IN_PROGRESS" && scorecard.status !== "RETURNED") {
      return Response.json({ error: `Already ${scorecard.status.toLowerCase()}.` }, { status: 409 });
    }

    const appearances = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));
    if (appearances.length === 0) {
      return Response.json({ error: "Nothing has been scored yet." }, { status: 400 });
    }
    const box = deriveBoxScore(appearances, { inningsPerGame });

    // The card belongs to whoever sends it up, not whoever opened it. An
    // umpire who claims a game and then cannot see it through is replaced at
    // the plate, and the head umpire needs the name of the person who actually
    // scored it - that is who they send it back to.
    await db
      .update(scorecards)
      .set({
        status: "PENDING",
        submittedByUserId: user.id,
        homeScore: box.homeScore,
        awayScore: box.awayScore,
      })
      .where(eq(scorecards.id, scorecardId));
    await db
      .update(games)
      .set({ status: "AWAITING_REVIEW", homeScore: box.homeScore, awayScore: box.awayScore })
      .where(eq(games.id, scorecard.gameId));

    await logAudit({
      actingUserId: user.id,
      action: "scorecard.finish",
      entityType: "scorecard",
      entityId: scorecardId,
      detail: { away: box.awayScore, home: box.homeScore },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not finish the game." }, { status: 500 });
  }
}
