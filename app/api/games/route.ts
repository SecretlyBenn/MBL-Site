import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { removeLiveGame } from "@/db/remove-game";
import { apiError } from "@/app/api-errors";
import { games } from "@/db/schema";
import { RoleError, requireRoleForApi } from "@/app/roles";

type GamePayload = {
  homeTeamId: number;
  awayTeamId: number;
  scheduledAt: string;
};

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as GamePayload;

    if (!Number.isInteger(payload.homeTeamId) || !Number.isInteger(payload.awayTeamId)) {
      return Response.json(
        { error: "homeTeamId and awayTeamId are required" },
        { status: 400 },
      );
    }
    if (payload.homeTeamId === payload.awayTeamId) {
      return Response.json({ error: "A team cannot play itself" }, { status: 400 });
    }
    if (!payload.scheduledAt) {
      return Response.json({ error: "scheduledAt is required" }, { status: 400 });
    }

    const db = getDb();
    const [game] = await db
      .insert(games)
      .values({
        homeTeamId: payload.homeTeamId,
        awayTeamId: payload.awayTeamId,
        scheduledAt: payload.scheduledAt,
      })
      .returning();

    await logAudit({
      actingUserId: leagueUser.id,
      action: "game.schedule",
      entityType: "game",
      entityId: game.id,
      detail: payload,
    });

    return Response.json({ game }, { status: 201 });
  } catch (error) {
    if (error instanceof RoleError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * Deletes a live game - one scheduled by mistake, or a duplicate of a result
 * already in the archive. Any unapproved scorecard goes with it; an approved
 * one blocks the delete. The archive fixture a game was scheduled from is left
 * alone, so the game can simply be scheduled again.
 */
export async function DELETE(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const gameId = Number(new URL(request.url).searchParams.get("gameId"));

    const game = await getDb().query.games.findFirst({ where: eq(games.id, gameId) });
    if (!game) return Response.json({ error: "That game does not exist." }, { status: 404 });

    const result = await removeLiveGame(gameId);
    if (result.error) return Response.json({ error: result.error }, { status: 409 });

    await logAudit({
      actingUserId: leagueUser.id,
      action: "game.delete",
      entityType: "game",
      entityId: gameId,
      detail: { game, removedScorecards: result.removedScorecards },
    });
    return Response.json({ ok: true, removedScorecards: result.removedScorecards });
  } catch (error) {
    return apiError(error);
  }
}
