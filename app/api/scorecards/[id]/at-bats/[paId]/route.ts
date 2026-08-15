import { and, desc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { games, plateAppearances, runnerOuts, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { currentBases, deriveBoxScore } from "@/app/derive-box-score";
import { advance, decodeRunners, encodeBases, encodeRunners, runnersOn } from "@/app/bases";
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

/**
 * Drops the stored base state from every play after `from` in the same
 * half-inning, so they fall back to being inferred from the corrected play
 * rather than repeating bases that no longer follow from it.
 */
async function clearLaterBaseStates(
  scorecardId: number,
  from: { sequence: number; inning: number; isHomeBatting: boolean },
) {
  const db = getDb();
  await db
    .update(plateAppearances)
    .set({ basesAfter: null })
    .where(
      and(
        eq(plateAppearances.scorecardId, scorecardId),
        eq(plateAppearances.inning, from.inning),
        eq(plateAppearances.isHomeBatting, from.isHomeBatting),
        gt(plateAppearances.sequence, from.sequence),
      ),
    );
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

    const before = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));

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

    // Recomputed from the bases as they stood before this play, and limited
    // to runners who were actually on them.
    const standing = currentBases(before.filter((row) => row.sequence < existing.sequence));
    const aboard = new Set(runnersOn(standing).map((runner) => runner.playerId));
    const scoredHere = decodeRunners(body.runnersScored ?? existing.runnersScored).filter((id) =>
      aboard.has(id),
    );
    const corrected = advance(standing, {
      batterPlayerId: body.batterPlayerId ?? existing.batterPlayerId,
      result,
      scored: scoredHere,
      // See the note in the POST route: scoring the batter takes him off the
      // bases rather than leaving him on one to be scored again.
      batterTo: (body.batterScored ?? existing.batterScored) ? "home" : undefined,
    });

    await db
      .update(plateAppearances)
      .set({
        batterPlayerId: body.batterPlayerId ?? existing.batterPlayerId,
        pitcherPlayerId: body.pitcherPlayerId ?? existing.pitcherPlayerId,
        result,
        fielders: body.fielders !== undefined ? body.fielders?.trim() || null : existing.fielders,
        rbis: body.rbis ?? existing.rbis,
        batterScored: body.batterScored ?? existing.batterScored,
        unearnedRuns: body.unearnedRuns ?? existing.unearnedRuns,
        outsRecorded: outs,
        errorPosition: body.errorPosition !== undefined ? body.errorPosition : existing.errorPosition,
        errorPlayerId:
          body.errorPlayerId !== undefined ? body.errorPlayerId : existing.errorPlayerId,
        stolenBases: body.stolenBases ?? existing.stolenBases,
        note: body.note !== undefined ? body.note?.trim() || null : existing.note,
        // Derived here rather than taken from the screen - see the note in
        // the POST route. Recomputed from the bases as they stood before this
        // play, so a corrected result moves the runners with it.
        basesAfter: encodeBases(corrected.bases),
        otherRunsScored: corrected.runs,
        runnersScored: encodeRunners(scoredHere),
      })
      .where(eq(plateAppearances.id, existing.id));

    // A stored end-state is trusted over inference, so the plays after the one
    // just corrected would keep describing bases that the correction has
    // changed. Clearing theirs lets the half-inning re-derive forward from the
    // corrected play; the runners each play scored are stated by the umpire and
    // are kept.
    await clearLaterBaseStates(scorecardId, existing);

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

    // A runner retired during this plate appearance goes with it. The out
    // happened inside the play - a tag on a ball that was never hit cannot
    // stand on its own - so removing the at-bat removes the outs it contained,
    // along with the outs they contributed to the inning.
    const attached = await db
      .select()
      .from(runnerOuts)
      .where(eq(runnerOuts.plateAppearanceId, existing.id));

    if (attached.length > 0) {
      await db.delete(runnerOuts).where(eq(runnerOuts.plateAppearanceId, existing.id));
    }
    const removedOuts = attached.length;

    await db.delete(plateAppearances).where(eq(plateAppearances.id, existing.id));
    // Removing a play changes the bases every later play in the half started
    // from, so their stored end-states no longer follow and are re-derived.
    await clearLaterBaseStates(scorecardId, existing);
    const { moved } = await resequenceInnings(scorecardId);
    const box = await syncScore(scorecardId, scorecard.gameId);

    return Response.json({
      ok: true,
      inningsShifted: moved,
      removedOuts,
      score: { home: box.homeScore, away: box.awayScore },
    });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not remove the at-bat." }, { status: 500 });
  }
}
