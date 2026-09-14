import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { seasonTeamId } from "@/db/publish";
import { historicalSeasons, teams } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * Starts a new season - the next regular season, or its playoffs.
 *
 * It is placed after every existing season, so it becomes the one the schedule,
 * standings and statistics pages open on. Every current club is entered into it
 * straight away, so the standings show the whole league at 0-0 before a game
 * is played, and fixtures can be added between any two clubs.
 */
export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as { name: string; isPlayoffs?: boolean; includeTeams?: boolean };

    const name = payload.name?.trim().replace(/\s+/g, " ");
    if (!name) return Response.json({ error: "Name the season, e.g. MBL Season XIII." }, { status: 400 });

    const db = getDb();
    const [{ last }] = await db
      .select({ last: sql<number>`coalesce(max(${historicalSeasons.sortOrder}), 0)` })
      .from(historicalSeasons);

    const [season] = await db
      .insert(historicalSeasons)
      .values({
        name,
        isPlayoffs: Boolean(payload.isPlayoffs ?? /playoffs?$/i.test(name)),
        sortOrder: Number(last) + 1,
        // No upstream export behind a season run on this site; the id only has
        // to be unique so a later import could still match rows.
        sourceSeasonId: `site-${Date.now().toString(36)}`,
      })
      .returning();

    let entered = 0;
    if (payload.includeTeams ?? true) {
      for (const team of await db.select({ id: teams.id }).from(teams)) {
        await seasonTeamId(season.id, team.id);
        entered += 1;
      }
    }

    await logAudit({
      actingUserId: leagueUser.id,
      action: "season.create",
      entityType: "season",
      entityId: season.id,
      detail: { name, teams: entered },
    });
    return Response.json({ season, teams: entered }, { status: 201 });
  } catch (error) {
    return apiError(error, "A season with that name already exists.");
  }
}
