import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { seasonTeamId } from "@/db/publish";
import { leagueSlugFor } from "@/db/queries";
import {
  historicalGames,
  historicalPlayerStats,
  historicalRosterEntries,
  historicalSeasons,
  historicalTeams,
  leagues,
  teams,
} from "@/db/schema";
import { currentSeasonName, setCurrentSeasonName } from "@/db/settings";
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
    const payload = (await request.json()) as {
      name: string;
      leagueId?: number;
      isPlayoffs?: boolean;
      includeTeams?: boolean;
    };

    const name = payload.name?.trim().replace(/\s+/g, " ");
    if (!name) return Response.json({ error: "Name the season, e.g. MBL Season XIII." }, { status: 400 });

    const db = getDb();

    // Which competition a season belongs to is how the archive tells the two
    // apart, and every page reads its seasons by it. A season created without
    // one is not merely unfiled - it appears in neither league's archive, so
    // it would be made and then be invisible.
    if (!Number.isInteger(payload.leagueId)) {
      return Response.json({ error: "Which competition is this season for?" }, { status: 400 });
    }
    const league = await db.query.leagues.findFirst({ where: eq(leagues.id, payload.leagueId!) });
    if (!league) return Response.json({ error: "No such competition." }, { status: 400 });

    const [{ last }] = await db
      .select({ last: sql<number>`coalesce(max(${historicalSeasons.sortOrder}), 0)` })
      .from(historicalSeasons);

    const [season] = await db
      .insert(historicalSeasons)
      .values({
        name,
        leagueId: league.id,
        // The name still decides it when nothing is said, because that is how
        // every season imported from the old site was named and the archive
        // reads the same way either side of this.
        isPlayoffs: Boolean(payload.isPlayoffs ?? /playoffs?$/i.test(name)),
        sortOrder: Number(last) + 1,
        // No upstream export behind a season run on this site; the id only has
        // to be unique so a later import could still match rows.
        sourceSeasonId: `site-${Date.now().toString(36)}`,
      })
      .returning();

    // Only this competition's clubs. Entering all nineteen would put the MCBA
    // in the MBL's standings at 0-0 and vice versa.
    let entered = 0;
    if (payload.includeTeams ?? true) {
      const clubs = await db.select({ id: teams.id }).from(teams).where(eq(teams.leagueId, league.id));
      for (const team of clubs) {
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

/**
 * Says which season the league is playing.
 *
 * A fixture already on a published schedule carries its own season, so this
 * only decides where a game the archive has never seen is filed - and which
 * schedule the umpire page numbers its series from. It used to be a line of
 * code, so the first Season XIII game scored would have landed in Season XII
 * until someone edited and redeployed the site.
 */
export async function PATCH(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const { seasonId } = (await request.json()) as { seasonId: number };
    if (!Number.isInteger(seasonId)) {
      return Response.json({ error: "Which season?" }, { status: 400 });
    }

    const season = await getDb().query.historicalSeasons.findFirst({
      where: eq(historicalSeasons.id, seasonId),
    });
    if (!season) return Response.json({ error: "No such season." }, { status: 404 });

    // The season says which competition it is current for, so an admin cannot
    // set the MBL's season as the MCBA's by picking the wrong list.
    const slug = await leagueSlugFor(season.leagueId);
    if (!slug) {
      return Response.json(
        { error: "That season is not filed under a competition, so it cannot be the current one." },
        { status: 400 },
      );
    }
    await setCurrentSeasonName(slug, season.name);
    await logAudit({
      actingUserId: leagueUser.id,
      action: "season.set_current",
      entityType: "season",
      entityId: season.id,
      detail: { name: season.name },
    });
    return Response.json({ ok: true, name: season.name });
  } catch (error) {
    return apiError(error);
  }
}

/**
 * Removes a season that was started by mistake.
 *
 * The archive is published history and there is no staging copy of it, so a
 * season holding any of it is refused rather than deleted: games, player
 * totals and roster entries each block, and the message says which, so the
 * admin can see what they would have destroyed. What a season started here and
 * never played holds instead is the clubs entered at 0-0 when it was created -
 * standings for games that never happened - and those go with it, the way
 * deleting a club takes its uploaded logo.
 *
 * Deliberately not a cascade. Everything in the archive hangs off a season, so
 * a cascading delete here would be the one button on the site that could erase
 * a competition's whole history, and 0003 is already a lesson in how easily
 * that gets run by mistake.
 */
export async function DELETE(request: Request) {
  try {
    const leagueUser = await requireRoleForApi(["ADMIN"]);
    const seasonId = Number(new URL(request.url).searchParams.get("seasonId"));
    if (!Number.isInteger(seasonId)) {
      return Response.json({ error: "Which season?" }, { status: 400 });
    }

    const db = getDb();
    const season = await db.query.historicalSeasons.findFirst({
      where: eq(historicalSeasons.id, seasonId),
    });
    if (!season) return Response.json({ error: "No such season." }, { status: 404 });

    // The current season is recorded by name, not by id, so deleting the one a
    // competition is playing would leave that setting pointing at a season
    // that no longer exists and the next game scored would have nowhere to go.
    const slug = await leagueSlugFor(season.leagueId);
    if (slug && (await currentSeasonName(slug)) === season.name) {
      return Response.json(
        { error: `${season.name} is the season being played. Make another one current first.` },
        { status: 409 },
      );
    }

    const count = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
    const n = sql<number>`count(*)`;
    const attached = {
      games: await count(
        db.select({ n }).from(historicalGames).where(eq(historicalGames.seasonId, seasonId)),
      ),
      playerTotals: await count(
        db.select({ n }).from(historicalPlayerStats).where(eq(historicalPlayerStats.seasonId, seasonId)),
      ),
      rosterEntries: await count(
        db.select({ n }).from(historicalRosterEntries).where(eq(historicalRosterEntries.seasonId, seasonId)),
      ),
    };
    const blocking = Object.entries(attached).filter(([, value]) => value > 0);
    if (blocking.length > 0) {
      const labels: Record<string, string> = {
        games: "game",
        playerTotals: "player total",
        rosterEntries: "roster entry",
      };
      const list = blocking
        .map(([key, value]) => `${value} ${labels[key]}${value === 1 ? "" : "s"}`)
        .join(", ");
      return Response.json(
        { error: `${season.name} still has ${list}. A season with history in it is not deleted from here.` },
        { status: 409 },
      );
    }

    const removed = await db
      .delete(historicalTeams)
      .where(eq(historicalTeams.seasonId, seasonId))
      .returning({ id: historicalTeams.id });
    await db.delete(historicalSeasons).where(eq(historicalSeasons.id, seasonId));

    await logAudit({
      actingUserId: leagueUser.id,
      action: "season.delete",
      entityType: "season",
      entityId: seasonId,
      detail: { name: season.name, leagueId: season.leagueId, teams: removed.length },
    });
    return Response.json({ ok: true, teams: removed.length });
  } catch (error) {
    return apiError(error);
  }
}
