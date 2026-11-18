import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "./index";
import { historicalGames, historicalTeams, teamLogos, teams } from "./schema";
import { logoKey } from "@/app/logo-key";

/**
 * Renaming a club, everywhere a club's name is written down.
 *
 * Three things, and missing any one of them leaves the site disagreeing with
 * itself:
 *
 * The club itself. The archive's copy of it, but only for seasons still being
 * played - a finished season keeps the name the club had when it played, which
 * is what its own screenshots and box scores say, and rewriting that would
 * make the record wrong rather than current. And the logo, which is filed
 * under the club's name rather than its id, so a rename without this step
 * leaves the crest behind on a name nothing points at.
 *
 * Shared because two routes rename clubs now - an admin through /admin/teams
 * and the Discord bot through /api/bot/club-rename - and two copies of this
 * would be two chances to forget the archive or the logo.
 */
export async function renameClub(
  club: { id: number; name: string; abbreviation: string },
  name: string,
  abbreviation = club.abbreviation,
) {
  const db = getDb();
  await db.update(teams).set({ name, abbreviation }).where(eq(teams.id, club.id));

  if (name === club.name && abbreviation === club.abbreviation) return 0;

  // A season with an unplayed game in it is still being played. NOT_NEEDED is
  // a game that will never be played - a sweep's fifth game - and does not
  // make a finished season look open.
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
    .where(and(eq(historicalTeams.name, club.name), inArray(historicalTeams.seasonId, openSeasons)))
    .returning({ id: historicalTeams.id });

  if (name !== club.name) {
    await db
      .update(teamLogos)
      .set({ teamName: logoKey(name) })
      .where(eq(teamLogos.teamName, logoKey(club.name)));
  }

  return renamed.length;
}

/**
 * What a club is called here once the bot has renamed it there.
 *
 * The bot files clubs under a nickname and this site under a city and a
 * nickname, so a bot rename changes only the last word: the Expos become the
 * Sasquatch, and "Toronto Expos" becomes "Toronto Sasquatch". The city is not
 * the bot's to change and it does not know one - an admin fixes that here
 * afterwards if the club has moved as well as been renamed.
 *
 * The MCBA uses the bare nickname on both sides, which is the first case.
 *
 * Pure, and tested as such: it decides what a club ends up called, and the
 * cost of getting it wrong is a name nothing matches afterwards.
 */
export function renamedTo(siteName: string, from: string, to: string): string | null {
  const current = siteName.trim();
  const was = from.trim();
  const now = to.trim();
  if (!was || !now) return null;
  if (current.toLowerCase() === was.toLowerCase()) return now;
  if (current.toLowerCase().endsWith(` ${was.toLowerCase()}`)) {
    return `${current.slice(0, current.length - was.length - 1)} ${now}`;
  }
  return null;
}
