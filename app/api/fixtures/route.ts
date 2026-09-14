import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { seasonTeamId } from "@/db/publish";
import { removeLiveGame } from "@/db/remove-game";
import { games, historicalGames, historicalSeasons } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { requireRoleForApi } from "@/app/roles";

/**
 * A season's schedule: the fixtures clubs arrange dates for and umpires score.
 *
 * Imported seasons arrived with their fixtures. A season run on this site from
 * the start - Season XIII onward - gets its fixtures here. Each carries a
 * source_game_id, which is the key the scheduling flow finds a fixture by and
 * publishing writes the result back into.
 */

function failure(error: unknown) {
  return apiError(error);
}

export async function POST(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const payload = (await request.json()) as {
      seasonId: number;
      awayTeamId: number;
      homeTeamId: number;
      /** How many copies of the matchup - a series of three is three fixtures. */
      count?: number;
      /** Free text shown as the fixture's date, e.g. "Friday September 4, 2026". */
      playedOn?: string;
    };

    const seasonId = Number(payload.seasonId);
    const awayTeamId = Number(payload.awayTeamId);
    const homeTeamId = Number(payload.homeTeamId);
    const count = Math.min(9, Math.max(1, Math.round(Number(payload.count ?? 1))));
    if (!awayTeamId || !homeTeamId) return Response.json({ error: "Pick both teams." }, { status: 400 });
    if (awayTeamId === homeTeamId) return Response.json({ error: "A team cannot play itself." }, { status: 400 });

    const db = getDb();
    const season = await db.query.historicalSeasons.findFirst({ where: eq(historicalSeasons.id, seasonId) });
    if (!season) return Response.json({ error: "That season does not exist." }, { status: 404 });

    const away = await seasonTeamId(seasonId, awayTeamId);
    const home = await seasonTeamId(seasonId, homeTeamId);
    const [{ last }] = await db
      .select({ last: sql<number>`coalesce(max(${historicalGames.sortOrder}), -1)` })
      .from(historicalGames)
      .where(eq(historicalGames.seasonId, seasonId));

    const stamp = Date.now().toString(36);
    const created = [];
    for (let index = 0; index < count; index += 1) {
      // Alternating home and away, the way a series is played: game 1 at the
      // home club, game 2 at the other, and so on.
      const swap = index % 2 === 1;
      const [row] = await db
        .insert(historicalGames)
        .values({
          seasonId,
          sourceGameId: `site-${seasonId}-${stamp}-${index}`,
          awayTeamId: swap ? home : away,
          homeTeamId: swap ? away : home,
          playedOn: payload.playedOn?.trim() || null,
          sortOrder: Number(last) + 1 + index,
        })
        .returning({ id: historicalGames.id });
      created.push(row.id);
    }

    await logAudit({
      actingUserId: leagueUser.id,
      action: "fixture.create",
      entityType: "season",
      entityId: seasonId,
      detail: { awayTeamId, homeTeamId, count, fixtures: created },
    });
    return Response.json({ created: created.length }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

/**
 * Removes a fixture that should never have been on the schedule.
 *
 * Only an unplayed fixture can go - a played one is a result. If a club had
 * already arranged a date, that live game goes too, unless an umpire's
 * approved scorecard stands behind it. For a game that was scheduled but not
 * reached, retiring it keeps the record; this is for mistakes.
 */
export async function DELETE(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const fixtureId = Number(new URL(request.url).searchParams.get("fixtureId"));

    const db = getDb();
    const fixture = await db.query.historicalGames.findFirst({ where: eq(historicalGames.id, fixtureId) });
    if (!fixture) return Response.json({ error: "That fixture does not exist." }, { status: 404 });
    if (fixture.homeScore !== null || fixture.awayScore !== null) {
      return Response.json({ error: "That game has been played, so it can't be removed." }, { status: 409 });
    }

    if (fixture.sourceGameId) {
      const live = await db.query.games.findFirst({ where: eq(games.sourceGameId, fixture.sourceGameId) });
      if (live) {
        const result = await removeLiveGame(live.id);
        if (result.error) return Response.json({ error: result.error }, { status: 409 });
      }
    }

    await db.delete(historicalGames).where(eq(historicalGames.id, fixtureId));
    await logAudit({
      actingUserId: leagueUser.id,
      action: "fixture.delete",
      entityType: "fixture",
      entityId: fixtureId,
      detail: fixture,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
