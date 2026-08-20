import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, plateAppearances, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { deriveBoxScore } from "@/app/derive-box-score";
import { resequenceInnings } from "@/db/resequence";
import { latestAction, undoLatest } from "@/db/undo";

/**
 * Takes back the last thing the umpire did, whatever it was.
 *
 * One button rather than one per panel. An umpire scoring live does not think
 * in terms of which subsystem a mistake belonged to - they think "that was
 * wrong, put it back" - and every panel having its own half-measure meant some
 * actions could be reversed, some needed an at-bat deleted to get at them, and
 * a few could not be undone at all.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const action = await undoLatest(scorecardId);
    if (!action) {
      return Response.json({ error: "There is nothing to undo." }, { status: 409 });
    }

    // Everything derived is derived again rather than adjusted: the innings
    // re-sequence around whatever outs now exist, and the score comes back off
    // the plate appearances. Undo therefore cannot leave the card in a state
    // the forward path could not have produced.
    await resequenceInnings(scorecardId);
    const rows = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));
    const box = deriveBoxScore(rows);
    await db
      .update(scorecards)
      .set({ homeScore: box.homeScore, awayScore: box.awayScore })
      .where(eq(scorecards.id, scorecardId));
    await db
      .update(games)
      .set({ homeScore: box.homeScore, awayScore: box.awayScore })
      .where(eq(games.id, scorecard.gameId));

    const next = await latestAction(scorecardId);

    return Response.json({
      ok: true,
      undone: action.summary,
      /** What the button will offer next, so it can relabel without a round trip. */
      next: next?.summary ?? null,
      score: { home: box.homeScore, away: box.awayScore },
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not undo that." }, { status: 500 });
  }
}
