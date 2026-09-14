import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { logoKey } from "@/db/logos";
import { games, historicalGames, historicalTeams, players, rosterMoves, teamLogos, teams, users } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

type TeamPayload = {
  name: string;
  abbreviation: string;
  color?: string;
  logoUrl?: string;
};

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as TeamPayload;

    const name = payload.name?.trim();
    const abbreviation = payload.abbreviation?.trim().toUpperCase();
    if (!name || !abbreviation) {
      return Response.json(
        { error: "name and abbreviation are required" },
        { status: 400 },
      );
    }

    const db = getDb();
    const [team] = await db
      .insert(teams)
      .values({
        name,
        abbreviation,
        color: payload.color?.trim() || null,
        logoUrl: payload.logoUrl?.trim() || null,
      })
      .returning();

    await logAudit({
      actingUserId: leagueUser.id,
      action: "team.create",
      entityType: "team",
      entityId: team.id,
      detail: { name, abbreviation },
    });

    return Response.json({ team }, { status: 201 });
  } catch (error) {
    return apiError(error, "A team with that name already exists.");
  }
}

function failure(error: unknown) {
  return apiError(error, "A team with that name already exists.");
}

/**
 * Edits a club's name, abbreviation or colour.
 *
 * A live club is matched to its archive rows by name - that is how a fixture
 * on the schedule finds the clubs to create a scoreable game for. So a rename
 * also renames the club in every season that still has games to play, or those
 * games could no longer be scheduled. Finished seasons keep the name the club
 * had then, which is the history. An uploaded logo follows the rename too.
 */
export async function PATCH(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as {
      teamId: number;
      name?: string;
      abbreviation?: string;
      color?: string | null;
    };

    const db = getDb();
    const team = await db.query.teams.findFirst({ where: eq(teams.id, Number(payload.teamId)) });
    if (!team) return Response.json({ error: "That team does not exist." }, { status: 404 });

    const name = payload.name?.trim() || team.name;
    const abbreviation = payload.abbreviation?.trim().toUpperCase() || team.abbreviation;
    const color = payload.color === undefined ? team.color : payload.color?.trim() || null;

    await db.update(teams).set({ name, abbreviation, color }).where(eq(teams.id, team.id));

    let openSeasonRows = 0;
    if (name !== team.name) {
      const openSeasons = db
        .selectDistinct({ id: historicalGames.seasonId })
        .from(historicalGames)
        .where(
          and(
            isNull(historicalGames.homeScore),
            or(isNull(historicalGames.status), sql`${historicalGames.status} <> 'NOT_NEEDED'`),
          ),
        );
      const renamed = await db
        .update(historicalTeams)
        .set({ name, abbreviation })
        .where(and(eq(historicalTeams.name, team.name), inArray(historicalTeams.seasonId, openSeasons)))
        .returning({ id: historicalTeams.id });
      openSeasonRows = renamed.length;

      await db
        .update(teamLogos)
        .set({ teamName: logoKey(name) })
        .where(eq(teamLogos.teamName, logoKey(team.name)));
    }

    await logAudit({
      actingUserId: leagueUser.id,
      action: "team.update",
      entityType: "team",
      entityId: team.id,
      detail: { from: { name: team.name, abbreviation: team.abbreviation }, to: { name, abbreviation, color }, openSeasonRows },
    });

    return Response.json({ ok: true, openSeasonRows });
  } catch (error) {
    return failure(error);
  }
}

/**
 * Removes a club that was added by mistake or never took the field.
 *
 * A club with players, games, a GM or roster history is refused rather than
 * deleted: removing it would orphan that record. The message says what is
 * still attached, so the admin knows what to move first.
 */
export async function DELETE(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const teamId = Number(new URL(request.url).searchParams.get("teamId"));

    const db = getDb();
    const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
    if (!team) return Response.json({ error: "That team does not exist." }, { status: 404 });

    const count = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
    const n = sql<number>`count(*)`;
    const attached = {
      players: await count(db.select({ n }).from(players).where(eq(players.teamId, teamId))),
      games: await count(
        db.select({ n }).from(games).where(or(eq(games.homeTeamId, teamId), eq(games.awayTeamId, teamId))),
      ),
      accounts: await count(db.select({ n }).from(users).where(eq(users.teamId, teamId))),
      rosterMoves: await count(db.select({ n }).from(rosterMoves).where(eq(rosterMoves.teamId, teamId))),
    };
    const blocking = Object.entries(attached).filter(([, value]) => value > 0);
    if (blocking.length > 0) {
      const labels: Record<string, string> = {
        players: "player",
        games: "game",
        accounts: "GM account",
        rosterMoves: "roster move",
      };
      const list = blocking.map(([key, value]) => `${value} ${labels[key]}${value === 1 ? "" : "s"}`).join(", ");
      return Response.json(
        { error: `${team.name} still has ${list}. Move or remove those first.` },
        { status: 409 },
      );
    }

    await db.delete(teamLogos).where(eq(teamLogos.teamName, logoKey(team.name)));
    await db.delete(teams).where(eq(teams.id, teamId));
    await logAudit({
      actingUserId: leagueUser.id,
      action: "team.delete",
      entityType: "team",
      entityId: teamId,
      detail: { name: team.name },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
