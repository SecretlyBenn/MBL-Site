import { and, asc, desc, eq, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/db";
import { historicalGames, historicalSeasons, historicalTeams, leagues } from "@/db/schema";
import { apiError } from "@/app/api-errors";

/**
 * A season's standings table, for the Discord bot's standings message.
 *
 * The bot used to scrape these off mystatsonline, which is the system this
 * league left: it showed whatever that site still had rather than what has
 * been played here, and no amount of fixing the bot was going to change that.
 *
 * Everything comes out of the archive, because that is where this site keeps
 * standings for *every* season including the one being played - the standings
 * page itself reads nothing else. A season is a `historical_seasons` row that
 * games are published into as they are scored, so the table for a season in
 * progress and the table for one finished ten seasons ago are built the same
 * way and need no special case between them. That is what lets the bot keep a
 * message per season: the newest one moves as games are published and then
 * simply stops when the season does.
 *
 * Two shapes, chosen by the query:
 *
 * - `?league=mbl` lists the competition's seasons, newest first, so the bot can
 *   see when a new one has appeared without being told.
 * - `?season=<id>` is the table itself.
 *
 * Public, like every other page of standings on this site. There is nothing
 * here a reader could not get by opening `/mbl/standings`.
 */

/** W, L, runs and the rest as the archive published them. */
type Row = {
  team: string;
  abbreviation: string | null;
  league: string | null;
  gp: number;
  w: number;
  l: number;
  pct: number;
  home: string;
  away: string;
  rs: number;
  ra: number;
  streak: string;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const leagueSlug = url.searchParams.get("league");
    const seasonParam = url.searchParams.get("season");
    const db = getDb();

    if (!seasonParam) {
      if (!leagueSlug) {
        return Response.json({ error: "Name a league or a season." }, { status: 400 });
      }
      const league = await db.query.leagues.findFirst({ where: eq(leagues.slug, leagueSlug) });
      if (!league) return Response.json({ error: "No such league." }, { status: 404 });

      // Newest first, ordered exactly as `getHistoricalSeasons` orders the
      // site's own season picker. The ids are no guide at all - MBL Season XII
      // is id 1 and Season X is id 5 - so anything deciding which season is the
      // current one has to go by `sort_order` or it will pick a season from
      // years ago and be confident about it.
      const seasons = await db
        .select({
          id: historicalSeasons.id,
          name: historicalSeasons.name,
          isPlayoffs: historicalSeasons.isPlayoffs,
          sortOrder: historicalSeasons.sortOrder,
        })
        .from(historicalSeasons)
        .where(eq(historicalSeasons.leagueId, league.id))
        .orderBy(desc(historicalSeasons.sortOrder));

      return Response.json({ seasons });
    }

    const seasonId = Number(seasonParam);
    if (!Number.isInteger(seasonId) || seasonId <= 0) {
      return Response.json({ error: "Not a season." }, { status: 400 });
    }

    const season = await db.query.historicalSeasons.findFirst({
      where: eq(historicalSeasons.id, seasonId),
    });
    if (!season) return Response.json({ error: "No such season." }, { status: 404 });

    const clubs = await db
      .select()
      .from(historicalTeams)
      .where(eq(historicalTeams.seasonId, seasonId));
    if (clubs.length === 0) return Response.json({ season: season.name, rows: [] });

    // A fixture a series never reached is published as an unplayed row, and
    // counting it would hand somebody a loss in a game nobody turned up to.
    const played = await db
      .select({
        homeTeamId: historicalGames.homeTeamId,
        awayTeamId: historicalGames.awayTeamId,
        homeScore: historicalGames.homeScore,
        awayScore: historicalGames.awayScore,
      })
      .from(historicalGames)
      .where(
        and(
          eq(historicalGames.seasonId, seasonId),
          // An ordinary fixture has no status at all, and in SQL a NULL
          // compared to anything is NULL rather than true - so testing only
          // `status <> 'NOT_NEEDED'` throws away every normal game and keeps
          // the handful with a note on them. Ask for the nulls explicitly.
          or(isNull(historicalGames.status), ne(historicalGames.status, "NOT_NEEDED")),
        ),
      )
      .orderBy(asc(historicalGames.sortOrder), asc(historicalGames.id));

    // Home record, away record and the current streak are the three columns the
    // archive does not store - it keeps a club's totals, not where each win
    // happened - so they are counted back out of the results. Everything else
    // is taken as published rather than recomputed, so this table and the
    // standings page can never disagree about a club's record.
    const splits = new Map(
      clubs.map((club) => [
        club.id,
        { homeW: 0, homeL: 0, awayW: 0, awayL: 0, results: [] as ("W" | "L")[] },
      ]),
    );

    for (const game of played) {
      const { homeTeamId, awayTeamId, homeScore, awayScore } = game;
      if (homeTeamId == null || awayTeamId == null) continue;
      if (homeScore == null || awayScore == null) continue;
      // Baseball has no ties, so equal scores mean a game that was not decided
      // rather than one both clubs half-won.
      if (homeScore === awayScore) continue;

      const homeWon = homeScore > awayScore;
      const home = splits.get(homeTeamId);
      const away = splits.get(awayTeamId);
      if (home) {
        if (homeWon) home.homeW += 1;
        else home.homeL += 1;
        home.results.push(homeWon ? "W" : "L");
      }
      if (away) {
        if (homeWon) away.awayL += 1;
        else away.awayW += 1;
        away.results.push(homeWon ? "L" : "W");
      }
    }

    const rows: Row[] = clubs.map((club) => {
      const split = splits.get(club.id);
      const w = club.wins ?? 0;
      const l = club.losses ?? 0;
      const ties = club.ties ?? 0;
      const decided = w + l;
      return {
        team: club.name,
        abbreviation: club.abbreviation,
        league: club.league,
        gp: decided + ties,
        w,
        l,
        pct: decided > 0 ? Number((w / decided).toFixed(3)) : 0,
        home: split ? `${split.homeW}-${split.homeL}` : "-",
        away: split ? `${split.awayW}-${split.awayL}` : "-",
        rs: club.runsScored ?? 0,
        ra: club.runsAllowed ?? 0,
        streak: split ? streakOf(split.results) : "-",
      };
    });

    rows.sort((a, b) => b.pct - a.pct || b.w - a.w || a.l - b.l || a.team.localeCompare(b.team));

    return Response.json({
      season: season.name,
      seasonId: season.id,
      isPlayoffs: season.isPlayoffs,
      rows,
    });
  } catch (error) {
    return apiError(error, "Could not build the standings.");
  }
}

/**
 * How a club is going right now, as "W3" or "L2".
 *
 * Counted back from the most recent result, which is the last game published
 * for them. A club that has not finished a game yet has no streak rather than
 * a streak of nought.
 */
function streakOf(results: ("W" | "L")[]): string {
  if (results.length === 0) return "-";
  const last = results[results.length - 1];
  let run = 0;
  for (let index = results.length - 1; index >= 0 && results[index] === last; index -= 1) run += 1;
  return `${last}${run}`;
}
