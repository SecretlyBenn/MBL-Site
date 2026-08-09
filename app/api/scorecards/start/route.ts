import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { games, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type StartPayload = { gameId?: number; awayTeamId?: number; homeTeamId?: number; playedOn?: string };

/**
 * Opens a scorecard for a game, creating the game first if the umpire is
 * scoring one that was never on the schedule.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const payload = (await request.json()) as StartPayload;
    const db = getDb();

    let gameId = payload.gameId ?? null;

    if (!gameId) {
      const { awayTeamId, homeTeamId } = payload;
      if (!awayTeamId || !homeTeamId) {
        return Response.json({ error: "Pick both teams." }, { status: 400 });
      }
      if (awayTeamId === homeTeamId) {
        return Response.json({ error: "A team cannot play itself." }, { status: 400 });
      }
      const [created] = await db
        .insert(games)
        .values({
          awayTeamId,
          homeTeamId,
          scheduledAt: payload.playedOn ?? new Date().toISOString(),
          status: "IN_PROGRESS",
        })
        .returning();
      gameId = created.id;
    }

    // Rejoin an open scorecard rather than starting a second one for the same
    // game - two live scorecards would each derive a different score.
    const existing = await db.query.scorecards.findFirst({
      where: and(eq(scorecards.gameId, gameId), inArray(scorecards.status, ["IN_PROGRESS", "PENDING"])),
    });
    if (existing) return Response.json({ scorecardId: existing.id, resumed: true });

    const [scorecard] = await db
      .insert(scorecards)
      .values({ gameId, submittedByUserId: user.id, status: "IN_PROGRESS", homeScore: 0, awayScore: 0 })
      .returning();

    await db.update(games).set({ status: "IN_PROGRESS" }).where(eq(games.id, gameId));
    await logAudit({
      actingUserId: user.id,
      action: "scorecard.start",
      entityType: "scorecard",
      entityId: scorecard.id,
      detail: { gameId },
    });

    return Response.json({ scorecardId: scorecard.id, resumed: false });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Could not start the scorecard." }, { status: 500 });
  }
}
