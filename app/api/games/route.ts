import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
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
