import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  games,
  players,
  plateAppearances,
  runnerOuts,
  scorecardLineups,
  scorecards,
} from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { attachCreated, recordAction } from "@/db/undo";
import { currentBases, deriveBoxScore } from "@/app/derive-box-score";
import { BASE_NAMES, decodeBases, encodeBases, type BaseName } from "@/app/bases";
import { RUNNER_OUT_KINDS, putoutPosition, type RunnerOutKind } from "@/app/scoring";

type OutPayload = {
  playerId: number;
  kind: RunnerOutKind;
  /** Who applied the tag. Ignored where the convention decides the putout. */
  fielded?: string | null;
};

/**
 * Retires a runner away from the plate - tagged out, picked off, or caught
 * stealing.
 *
 * Recorded against the play that is standing rather than as a plate
 * appearance: nobody batted. The out counts towards the half-inning, the
 * runner comes off the bases, and the putout goes to whoever the league's
 * convention credits - the tagger, the catcher on a caught stealing, the
 * pitcher on a pickoff.
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

    const payload = (await request.json()) as OutPayload;
    if (!RUNNER_OUT_KINDS.includes(payload.kind)) {
      return Response.json({ error: "Unknown kind of out." }, { status: 400 });
    }

    const all = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));

    const bases = currentBases(all);
    const from = BASE_NAMES.find((base) => bases[base] === payload.playerId);
    if (!from) {
      return Response.json({ error: "That runner is not on base." }, { status: 409 });
    }

    const box = deriveBoxScore(all);
    const [standing] = await db
      .select()
      .from(plateAppearances)
      .where(
        and(
          eq(plateAppearances.scorecardId, scorecardId),
          eq(plateAppearances.inning, box.currentInning),
          eq(plateAppearances.isHomeBatting, box.isHomeBatting),
        ),
      )
      .orderBy(desc(plateAppearances.sequence))
      .limit(1);

    if (!standing) {
      return Response.json({ error: "No play to attach the out to." }, { status: 409 });
    }

    // The fielding side is the one not batting.
    const position = putoutPosition(payload.kind, payload.fielded ?? null);
    const fielder = position
      ? await db.query.scorecardLineups.findFirst({
          where: and(
            eq(scorecardLineups.scorecardId, scorecardId),
            eq(scorecardLineups.isHome, !box.isHomeBatting),
            eq(scorecardLineups.position, position),
          ),
        })
      : null;

    const next: Record<BaseName, number | null> = { ...bases, [from]: null };

    const retired = await db.query.players.findFirst({ where: eq(players.id, payload.playerId) });
    const action = await recordAction(
      scorecardId,
      "RUNNER_OUT",
      `${retired?.displayName ?? "Runner"} ${payload.kind.toLowerCase().replace("_", " ")}`,
      { plateAppearances: [standing] },
    );

    const [recordedOut] = await db.insert(runnerOuts).values({
      scorecardId,
      plateAppearanceId: standing.id,
      runnerPlayerId: payload.playerId,
      kind: payload.kind,
      base: from,
      putoutPlayerId: fielder?.playerId ?? null,
    }).returning();

    await attachCreated(action.id, {
      deleteRunnerOutIds: recordedOut ? [recordedOut.id] : [],
    });

    await db
      .update(plateAppearances)
      .set({
        // The out belongs to the half-inning, so it goes on the play that was
        // standing when the runner was retired.
        outsRecorded: standing.outsRecorded + 1,
        basesAfter: encodeBases(next),
      })
      .where(eq(plateAppearances.id, standing.id));

    const rows = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));
    const updated = deriveBoxScore(rows);
    await db
      .update(scorecards)
      .set({ homeScore: updated.homeScore, awayScore: updated.awayScore })
      .where(eq(scorecards.id, scorecardId));
    await db
      .update(games)
      .set({ homeScore: updated.homeScore, awayScore: updated.awayScore })
      .where(eq(games.id, scorecard.gameId));

    return Response.json({ ok: true, putoutPlayerId: fielder?.playerId ?? null });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not record the out." }, { status: 500 });
  }
}

/**
 * Takes a runner out back off the record.
 *
 * The runner returns to the base they were retired on and the out comes off
 * the half-inning. Without this a mistake here could only be cleared by
 * deleting the plate appearance it was attached to - which throws away the
 * batter's line as well, and every at-bat after it in the inning.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const { searchParams } = new URL(request.url);
    const outId = Number(searchParams.get("outId"));
    if (!Number.isInteger(outId)) {
      return Response.json({ error: "Which out?" }, { status: 400 });
    }

    const out = await db.query.runnerOuts.findFirst({ where: eq(runnerOuts.id, outId) });
    if (!out || out.scorecardId !== scorecardId) {
      return Response.json({ error: "No such out." }, { status: 404 });
    }

    const standing = await db.query.plateAppearances.findFirst({
      where: eq(plateAppearances.id, out.plateAppearanceId),
    });
    if (!standing) {
      return Response.json({ error: "The play it belonged to is gone." }, { status: 409 });
    }

    // Put the runner back where they were retired. The bases are a stored
    // snapshot, so the runner is restored into it rather than re-derived -
    // re-deriving would not know this out had ever happened.
    const restored = { ...decodeBases(standing.basesAfter), [out.base as BaseName]: out.runnerPlayerId };

    await db
      .update(plateAppearances)
      .set({
        outsRecorded: Math.max(0, standing.outsRecorded - 1),
        basesAfter: encodeBases(restored),
      })
      .where(eq(plateAppearances.id, standing.id));

    await db.delete(runnerOuts).where(eq(runnerOuts.id, outId));

    const rows = await db
      .select()
      .from(plateAppearances)
      .where(eq(plateAppearances.scorecardId, scorecardId));
    const updated = deriveBoxScore(rows);
    await db
      .update(scorecards)
      .set({ homeScore: updated.homeScore, awayScore: updated.awayScore })
      .where(eq(scorecards.id, scorecardId));
    await db
      .update(games)
      .set({ homeScore: updated.homeScore, awayScore: updated.awayScore })
      .where(eq(games.id, scorecard.gameId));

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not undo the out." }, { status: 500 });
  }
}
