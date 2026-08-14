import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, plateAppearances, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { currentBases, deriveBoxScore, gameState } from "@/app/derive-box-score";
import { advance, decodeRunners, encodeBases, encodeRunners, runnersOn } from "@/app/bases";
import { resequenceInnings } from "@/db/resequence";
import { validatePlateAppearance, type PlateAppearanceInput } from "@/app/scoring";

async function open(scorecardId: number) {
  const db = getDb();
  const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
  if (!scorecard) throw new RoleError(404, "No such scorecard.");
  if (scorecard.status === "APPROVED") throw new RoleError(409, "This scorecard is approved and locked.");
  return scorecard;
}

/**
 * Keeps the game's public score in step with the at-bats. The score is derived,
 * never accumulated, so an undo or a correction lands correctly instead of
 * leaving a running total that drifted.
 */
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const scorecardId = Number((await params).id);
    const scorecard = await open(scorecardId);
    const body = (await request.json()) as PlateAppearanceInput & {
      batterPlayerId: number;
      pitcherPlayerId: number;
    };
    const db = getDb();

    const rows = await db.select().from(plateAppearances).where(eq(plateAppearances.scorecardId, scorecardId));
    const state = gameState(rows);

    const problem = validatePlateAppearance(body, state.outs);
    if (problem) return Response.json({ error: problem }, { status: 400 });

    const sequence = rows.length === 0 ? 1 : Math.max(...rows.map((row) => row.sequence)) + 1;

    // Where the runners end up is worked out here rather than taken from the
    // screen, for the same reason the half-inning is: a browser running an
    // older copy of the page can send a state that does not follow from the
    // play, and once stored it is trusted over anything derived. One did -
    // a single with the bases empty arrived saying the bases were still
    // empty, and the batter could not then be moved off first.
    // Only runners actually on base can have scored. The screen can offer a
    // stale list - it did, and a name that was never out there was credited
    // with a run.
    const before = currentBases(rows);
    const aboard = new Set(runnersOn(before).map((runner) => runner.playerId));
    const scored = decodeRunners(body.runnersScored ?? null).filter((id) => aboard.has(id));
    const after = advance(before, {
      batterPlayerId: body.batterPlayerId,
      result: body.result,
      scored,
      // A batter who came all the way round is not also standing on a base.
      // Leaving him on one counted him twice: once as a run and again as a
      // runner the next play could score.
      batterTo: body.batterScored ? "home" : undefined,
    });

    // The slot is pinned to the play now, while the lineup still describes
    // this batter. A substitution later hands the slot to someone else, and
    // this at-bat must stay where it happened.
    const slot = await db.query.scorecardLineups.findFirst({
      where: and(
        eq(scorecardLineups.scorecardId, scorecardId),
        eq(scorecardLineups.playerId, body.batterPlayerId),
      ),
    });

    await db.insert(plateAppearances).values({
      scorecardId,
      sequence,
      // The half-inning comes from the recorded at-bats, not the client, so a
      // stale screen cannot file an at-bat into the wrong inning.
      inning: state.inning,
      isHomeBatting: state.isHomeBatting,
      batterPlayerId: body.batterPlayerId,
      battingSlot: slot?.battingOrder ?? null,
      pitcherPlayerId: body.pitcherPlayerId,
      result: body.result,
      fielders: body.fielders?.trim() || null,
      rbis: body.rbis,
      batterScored: body.batterScored,
      // The runs on the play are counted from the bases, not taken from the
      // screen: a runner the screen still shows but who is no longer out there
      // cannot cross the plate, and trusting the count let one do exactly that.
      otherRunsScored: after.runs,
      unearnedRuns: body.unearnedRuns,
      outsRecorded: body.outsRecorded,
      errorPosition: body.errorPosition,
      stolenBases: body.stolenBases,
      basesAfter: encodeBases(after.bases),
      runnersScored: encodeRunners(scored),
      note: body.note?.trim() || null,
    });

    await resequenceInnings(scorecardId);
    const box = await syncScore(scorecardId, scorecard.gameId);
    return Response.json({ ok: true, score: { home: box.homeScore, away: box.awayScore } });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not record the at-bat." }, { status: 500 });
  }
}

/** Undo: removes the most recent at-bat. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const scorecardId = Number((await params).id);
    const scorecard = await open(scorecardId);
    const db = getDb();

    const [last] = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId))
      .orderBy(desc(plateAppearances.sequence))
      .limit(1);
    if (!last) return Response.json({ error: "Nothing to undo." }, { status: 400 });

    await db.delete(plateAppearances).where(eq(plateAppearances.id, last.id));
    await resequenceInnings(scorecardId);
    const box = await syncScore(scorecardId, scorecard.gameId);
    return Response.json({ ok: true, score: { home: box.homeScore, away: box.awayScore } });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not undo." }, { status: 500 });
  }
}
