import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { games, scorecards } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type StartPayload = { gameId?: number };

/**
 * Opens a scorecard for a game already on the schedule.
 *
 * Only a scheduled fixture can be scored. A game invented here would carry no
 * link back to the season's schedule, so publishing it could only append a
 * duplicate at the end of the archive rather than filling in the fixture it was
 * meant to be - which is exactly what happened when this route accepted a pair
 * of team ids instead.
 */
export async function POST(request: Request) {
  try {
    const user = await requireRoleForApi(["UMPIRE", "HEAD_UMPIRE", "ADMIN"]);
    const payload = (await request.json()) as StartPayload;
    const db = getDb();

    const gameId = payload.gameId ?? null;
    if (!gameId) {
      return Response.json({ error: "Pick a game from the schedule." }, { status: 400 });
    }

    const game = await db.query.games.findFirst({ where: eq(games.id, gameId) });
    if (!game) {
      return Response.json({ error: "That game is not on the schedule." }, { status: 404 });
    }
    if (game.status === "FINAL") {
      return Response.json(
        { error: "That game is already final. Ask a head umpire to reopen it." },
        { status: 409 },
      );
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
