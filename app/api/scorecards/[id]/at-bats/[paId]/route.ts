import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, plateAppearances, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { deriveBoxScore } from "@/app/derive-box-score";
import { resequenceInnings } from "@/db/resequence";
import { RESULT_BY_CODE, type PlateAppearanceInput, type ResultCode } from "@/app/scoring";

async function openScorecard(scorecardId: number) {
  const db = getDb();
  const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
  if (!scorecard) throw new RoleError(404, "No such scorecard.");
  if (scorecard.status === "APPROVED") {
    throw new RoleError(409, "This scorecard is approved and locked.");
  }
  return scorecard;
}

/** Recomputes the score after any change, so it never drifts from the at-bats. */
async function syncScore(scorecardId: number, gameId: number) {
  const db = getDb();
  const rows = await db.select().from(plateAppearances).where(eq(plateAppearances.scorecardId, scorecardId));
  const box = deriveBoxScore(rows);
  await db
    .update(scorecards)
    .set({ homeScore: box.homeScore, awayScore: box.awayScore })
    .where(eq(scorecards.id, scorecardId));
  await db
    .update(games)
    .set({ homeScore: box.homeScore, awayScore: box.awayScore })
    .where(eq(games.id, gameId));
  return box;
}

/** Edits one at-bat, wherever it sits in the game. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; paId: string }> },
) {
  try {
    await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const { id, paId } = await params;
    const scorecardId = Number(id);
    const scorecard = await openScorecard(scorecardId);
    const db = getDb();

    const existing = await db.query.plateAppearances.findFirst({
      where: eq(plateAppearances.id, Number(paId)),
    });
    if (!existing || existing.scorecardId !== scorecardId) {
      return Response.json({ error: "No such at-bat." }, { status: 404 });
    }

    const body = (await request.json()) as Partial<PlateAppearanceInput> & {
      batterPlayerId?: number;
      pitcherPlayerId?: number;
    };

    if (body.result && !RESULT_BY_CODE.has(body.result as ResultCode)) {
      return Response.json({ error: "Unknown result." }, { status: 400 });
    }
    const outs = body.outsRecorded ?? existing.outsRecorded;
    if (outs < 0 || outs > 3) {
      return Response.json({ error: "Outs must be between 0 and 3." }, { status: 400 });
    }
    const result = (body.result ?? existing.result) as ResultCode;
    if (result === "OTHER" && !(body.note ?? existing.note)?.trim()) {
      return Response.json({ error: "Describe what happened when using Other." }, { status: 400 });
    }

    await db
      .update(plateAppearances)
      .set({
        batterPlayerId: body.batterPlayerId ?? existing.batterPlayerId,
        pitcherPlayerId: body.pitcherPlayerId ?? existing.pitcherPlayerId,
        result,
        fielders: body.fielders !== undefined ? body.fielders?.trim() || null : existing.fielders,
        rbis: body.rbis ?? existing.rbis,
        batterScored: body.batterScored ?? existing.batterScored,
        otherRunsScored: body.otherRunsScored ?? existing.otherRunsScored,
        unearnedRuns: body.unearnedRuns ?? existing.unearnedRuns,
        outsRecorded: outs,
        errorPosition: body.errorPosition !== undefined ? body.errorPosition : existing.errorPosition,
        stolenBases: body.stolenBases ?? existing.stolenBases,
        note: body.note !== undefined ? body.note?.trim() || null : existing.note,
      })
      .where(eq(plateAppearances.id, existing.id));

    // Changing the outs moves every later inning boundary.
    const { moved } = await resequenceInnings(scorecardId);
    const box = await syncScore(scorecardId, scorecard.gameId);

    return Response.json({
      ok: true,
      inningsShifted: moved,
      score: { home: box.homeScore, away: box.awayScore },
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not edit the at-bat." }, { status: 500 });
  }
}

/** Removes one at-bat from anywhere in the game. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; paId: string }> },
) {
  try {
    await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const { id, paId } = await params;
    const scorecardId = Number(id);
    const scorecard = await openScorecard(scorecardId);
    const db = getDb();

    const existing = await db.query.plateAppearances.findFirst({
      where: eq(plateAppearances.id, Number(paId)),
    });
    if (!existing || existing.scorecardId !== scorecardId) {
      return Response.json({ error: "No such at-bat." }, { status: 404 });
    }

    await db.delete(plateAppearances).where(eq(plateAppearances.id, existing.id));
    const { moved } = await resequenceInnings(scorecardId);
    const box = await syncScore(scorecardId, scorecard.gameId);

    return Response.json({
      ok: true,
      inningsShifted: moved,
      score: { home: box.homeScore, away: box.awayScore },
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not remove the at-bat." }, { status: 500 });
  }
}
