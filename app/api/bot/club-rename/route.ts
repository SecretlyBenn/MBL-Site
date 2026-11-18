import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { renameClub, renamedTo } from "@/db/rename-club";
import { leagues, teams, users } from "@/db/schema";
import { apiError } from "@/app/api-errors";
import { clubNamed } from "../roster-move/route";
import { notTheBot } from "../secret";

/**
 * A club renamed in the bot.
 *
 * The roster endpoint matches a club on the last word of its name, which is
 * the only thing the two sides share. So a club renamed in the bot and not
 * here stops matching, and every roster push for it afterwards is refused -
 * quietly, into a Discord channel, while its roster here goes stale. That is
 * what happened to the Expos.
 *
 * The bot knows its own name for a club and nothing else, so it sends what
 * the club was called and what it is called now, and the last word of the
 * name here is changed to match. A club that has moved city as well as
 * changed nickname needs an admin to finish the job on /admin/teams; this
 * keeps the two sides matched, which is the part that breaks things.
 */

type BotRename = {
  league?: string;
  from?: string;
  to?: string;
};

/** The bot's own account, which exists only to be named in the audit trail. */
const BOT_DISCORD_ID = "982120249006628866";

export async function POST(request: Request) {
  try {
    const refusal = notTheBot(request);
    if (refusal) return refusal;

    const payload = (await request.json()) as BotRename;
    const from = payload.from?.trim();
    const to = payload.to?.trim();
    if (!from || !to) {
      return Response.json({ error: "from and to are both required" }, { status: 400 });
    }

    const db = getDb();
    const league = await db.query.leagues.findFirst({
      where: eq(leagues.abbreviation, (payload.league ?? "").trim().toUpperCase()),
    });
    if (!league) {
      return Response.json({ error: `No competition called ${payload.league}.` }, { status: 404 });
    }
    // The bot knows nothing about the off-season and never names one of its
    // clubs, so a rename aimed at one is a mistake rather than a request.
    if (league.isTournament) {
      return Response.json(
        { error: `${league.name} is run on the site, not in Discord.` },
        { status: 400 },
      );
    }

    const clubs = await db
      .select({
        id: teams.id,
        name: teams.name,
        abbreviation: teams.abbreviation,
        leagueId: teams.leagueId,
      })
      .from(teams)
      .where(eq(teams.leagueId, league.id));

    const club = clubNamed(from, clubs);
    if (!club) {
      // It may already have been renamed here, in which case there is nothing
      // to do and saying so is better than an error the bot writes to Discord.
      const already = clubNamed(to, clubs);
      if (already) return Response.json({ ok: true, name: already.name, changed: false });
      return Response.json(
        { error: `No ${league.abbreviation} club matching "${from}".` },
        { status: 404 },
      );
    }

    const name = renamedTo(club.name, from, to);
    if (!name) {
      return Response.json({ error: `Cannot rename "${club.name}" from "${from}".` }, { status: 400 });
    }

    // `teams.name` is unique across the whole table rather than per
    // competition, so a name the other competition is already using is
    // refused here rather than failing on the constraint underneath.
    const taken = await db.query.teams.findFirst({ where: eq(teams.name, name) });
    if (taken && taken.id !== club.id) {
      return Response.json({ error: `Another club is already called ${name}.` }, { status: 409 });
    }

    const openSeasonRows = await renameClub(club, name);

    // The bot has an account here for exactly this: a rename in the audit
    // trail says who did it, and nobody pressed anything.
    const bot = await db.query.users.findFirst({ where: eq(users.discordId, BOT_DISCORD_ID) });
    if (bot) await logAudit({
      actingUserId: bot.id,
      action: "team.update",
      entityType: "team",
      entityId: club.id,
      detail: { from: club.name, to: name, openSeasonRows, viaBot: true },
    });

    return Response.json({ ok: true, name, changed: true, openSeasonRows });
  } catch (error) {
    return apiError(error, "Another club is already called that.");
  }
}
