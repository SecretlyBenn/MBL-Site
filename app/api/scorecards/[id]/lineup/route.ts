import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { plateAppearances, scorecardLineups, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";
import { MINIMUM_LINEUP } from "@/app/scoring";

type LineupRow = {
  playerId: number;
  battingOrder: number | null;
  position: string;
  dhForPlayerId?: number | null;
  pitchingOrder?: number | null;
};

/** Replaces one side's lineup. Sent once at setup, and again on a substitution. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const scorecardId = Number((await params).id);
    const { isHome, rows } = (await request.json()) as { isHome: boolean; rows: LineupRow[] };
    const db = getDb();

    const scorecard = await db.query.scorecards.findFirst({ where: eq(scorecards.id, scorecardId) });
    if (!scorecard) return Response.json({ error: "No such scorecard." }, { status: 404 });
    if (scorecard.status === "APPROVED") {
      return Response.json({ error: "This scorecard is approved and locked." }, { status: 409 });
    }

    const batters = rows.filter((row) => row.battingOrder !== null);
    const orders = batters.map((row) => row.battingOrder);
    if (new Set(orders).size !== orders.length) {
      return Response.json({ error: "Two players share a batting order slot." }, { status: 400 });
    }
    // Short-handed games are ordinary here, so the order simply runs shorter -
    // but below four there is no game to score.
    if (batters.length < MINIMUM_LINEUP) {
      return Response.json(
        {
          error:
            batters.length === 0
              ? "Nobody is in the batting order."
              : `A side needs at least ${MINIMUM_LINEUP} in the order; this one has ${batters.length}.`,
        },
        { status: 400 },
      );
    }
    if (!rows.some((row) => row.pitchingOrder === 1)) {
      return Response.json({ error: "Pick a starting pitcher." }, { status: 400 });
    }

    // Replacing a lineup that already has at-bats behind it would leave those
    // at-bats pointing at players no longer listed.
    const scored = await db.query.plateAppearances.findFirst({
      where: eq(plateAppearances.scorecardId, scorecardId),
    });
    const existing = await db
      .select()
      .from(scorecardLineups)
      .where(and(eq(scorecardLineups.scorecardId, scorecardId), eq(scorecardLineups.isHome, isHome)));
    if (scored && existing.length > 0) {
      const kept = new Set(rows.map((row) => row.playerId));
      const dropped = existing.filter((row) => !kept.has(row.playerId));
      if (dropped.length > 0) {
        return Response.json(
          { error: "Scoring has started; add substitutes rather than removing players." },
          { status: 409 },
        );
      }
    }

    await db
      .delete(scorecardLineups)
      .where(and(eq(scorecardLineups.scorecardId, scorecardId), eq(scorecardLineups.isHome, isHome)));

    await db.insert(scorecardLineups).values(
      rows.map((row) => ({
        scorecardId,
        isHome,
        playerId: row.playerId,
        battingOrder: row.battingOrder,
        position: row.position,
        dhForPlayerId: row.dhForPlayerId ?? null,
        pitchingOrder: row.pitchingOrder ?? null,
        isStarter: !scored,
      })),
    );

    await logAudit({
      actingUserId: user.id,
      action: "scorecard.lineup",
      entityType: "scorecard",
      entityId: scorecardId,
      detail: { isHome, players: rows.length },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not save the lineup." }, { status: 500 });
  }
}
