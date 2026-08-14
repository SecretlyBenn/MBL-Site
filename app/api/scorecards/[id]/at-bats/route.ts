import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { games, plateAppearances, runnerOuts, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { currentBases, deriveBoxScore, gameState } from "@/app/derive-box-score";
import {
  advance,
  BASE_NAMES,
  decodeRunners,
  encodeBases,
  encodeRunners,
  runnersOn,
} from "@/app/bases";
import { resequenceInnings } from "@/db/resequence";
import { putoutPosition, validatePlateAppearance, type PlateAppearanceInput } from "@/app/scoring";

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

    // Whose turn it is is worked out here, not taken from the screen. The
    // browser was deciding it from its own count of plate appearances, so a
    // page a beat behind named the batter who had just hit - and he was
    // recorded twice while the man after him never came up at all.
    //
    // The order is taken from the last slot this side used rather than from a
    // count, because a count only holds while every trip through the lineup is
    // exactly its length: deleting an at-bat, or a lineup that is not nine
    // long, shifts everyone after it.
    const lineup = await db
      .select()
      .from(scorecardLineups)
      .where(
        and(
          eq(scorecardLineups.scorecardId, scorecardId),
          eq(scorecardLineups.isHome, state.isHomeBatting),
        ),
      );
    const order = lineup
      .filter((row) => row.battingOrder !== null)
      .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));

    if (order.length === 0) {
      return Response.json({ error: "That side has no batting order." }, { status: 409 });
    }

    const lastForSide = rows
      .filter((row) => row.isHomeBatting === state.isHomeBatting)
      .sort((a, b) => b.sequence - a.sequence)[0];

    const lastIndex = lastForSide
      ? order.findIndex((row) => row.battingOrder === lastForSide.battingSlot)
      : -1;
    const dueUp = order[(lastIndex + 1) % order.length];
    const batterPlayerId = dueUp.playerId;

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
    // Runners retired on the play, limited to those actually on base.
    const outRunners = (body.outRunners ?? []).filter((id) => aboard.has(id));

    const after = advance(before, {
      batterPlayerId,
      result: body.result,
      scored,
      outRunners,
      // A batter who came all the way round is not also standing on a base.
      // Leaving him on one counted him twice: once as a run and again as a
      // runner the next play could score.
      //
      // On a fielder's choice he reaches instead, and on a double play he
      // usually does not - the umpire says which, so the bases follow the play
      // rather than the result code deciding for them.
      batterTo: body.batterScored ? "home" : body.batterOut ? null : undefined,
    });

    // The slot is pinned to the play now, while the lineup still describes
    // this batter. A substitution later hands the slot to someone else, and
    // this at-bat must stay where it happened.
    const slot = await db.query.scorecardLineups.findFirst({
      where: and(
        eq(scorecardLineups.scorecardId, scorecardId),
        eq(scorecardLineups.playerId, batterPlayerId),
      ),
    });

    // One putout per play, to whoever the league credits - the fielder who
    // made the play, and nobody at all on a strikeout.
    const putout = putoutPosition(body.result, body.fielders ?? null);
    const putoutFielder = putout
      ? await db.query.scorecardLineups.findFirst({
          where: and(
            eq(scorecardLineups.scorecardId, scorecardId),
            eq(scorecardLineups.isHome, !state.isHomeBatting),
            eq(scorecardLineups.position, putout),
          ),
        })
      : null;

    const [inserted] = await db.insert(plateAppearances).values({
      scorecardId,
      sequence,
      // The half-inning comes from the recorded at-bats, not the client, so a
      // stale screen cannot file an at-bat into the wrong inning.
      inning: state.inning,
      isHomeBatting: state.isHomeBatting,
      batterPlayerId,
      battingSlot: slot?.battingOrder ?? null,
      putoutPlayerId: putoutFielder?.playerId ?? null,
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
    })
      // The row is read back so the outs recorded on this play can point at
      // it; destructuring an insert that returns nothing throws, which is what
      // turned a fielder's choice into "could not record the at-bat".
      .returning();

    await resequenceInnings(scorecardId);
    const box = await syncScore(scorecardId, scorecard.gameId);
    if (outRunners.length > 0 && inserted) {
      const retiredAt = (playerId: number) =>
        BASE_NAMES.find((base) => before[base] === playerId) ?? "first";
      await db.insert(runnerOuts).values(
        outRunners.map((playerId) => ({
          scorecardId,
          plateAppearanceId: inserted.id,
          runnerPlayerId: playerId,
          kind: "FORCED" as const,
          base: retiredAt(playerId),
          putoutPlayerId: putoutFielder?.playerId ?? null,
        })),
      );
    }

    return Response.json({ ok: true, score: { home: box.homeScore, away: box.awayScore } });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    // The reason is passed on rather than swallowed: a bare "could not record
    // the at-bat" gives an umpire mid-game nothing to act on and nothing to
    // report.
    return Response.json(
      {
        error: `Could not record the at-bat: ${
          error instanceof Error ? error.message : "unexpected error"
        }`,
      },
      { status: 500 },
    );
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
