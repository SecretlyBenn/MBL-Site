import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { logAudit } from "@/db/audit";
import { leagues, players, rosterMoves, teams, users, ROSTER_MOVE_TYPES, type RosterMoveType } from "@/db/schema";
import { apiError } from "@/app/api-errors";

/**
 * Roster moves pushed from the Discord bot.
 *
 * The MBL and the MCBA do their rosters in Discord and always have - a GM
 * asks, an admin runs `/sign`, and the bot's DynamoDB is what the league
 * believes. This site has been keeping its own copy by hand, which drifts the
 * moment anyone forgets. So the bot is the source of truth for those two
 * competitions and this route is how it says so; `/gm` no longer offers to
 * edit them. The off-season tournament is the other way round - it has no
 * presence in the bot at all and is run entirely here.
 *
 * Nothing about this route trusts the caller beyond the shared secret. It
 * resolves the club and the player itself rather than taking ids, because the
 * bot does not know this site's ids and never should.
 */

type BotMove = {
  league?: string;
  team?: string | null;
  ign?: string;
  action?: RosterMoveType;
};

/** The bot's own account, which exists only to be named in the audit trail. */
const BOT_DISCORD_ID = "982120249006628866";

/**
 * Compared character by character to the end, so a wrong secret takes the
 * same time as a right one whatever it starts with.
 */
function sameSecret(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let differences = 0;
  for (let index = 0; index < given.length; index += 1) {
    differences |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return differences === 0;
}

/**
 * The club the bot means.
 *
 * The bot files clubs under a nickname (`panthers`) and this site under a
 * city and a nickname (`Philadelphia Panthers`), so the two are matched on
 * the last word. That holds for all twenty clubs in both competitions today,
 * and the MCBA's names are the bare nickname on both sides, which the same
 * rule covers. Matching on anything looser would one day put a player on the
 * wrong club, so an unrecognised name is refused rather than guessed at.
 */
export function clubNamed(botName: string, clubs: { id: number; name: string; leagueId: number | null }[]) {
  const wanted = botName.trim().toLowerCase();
  return clubs.find((club) => {
    const name = club.name.toLowerCase();
    return name === wanted || name.endsWith(` ${wanted}`);
  });
}

export async function POST(request: Request) {
  try {
    const expected = (env as unknown as { BOT_SECRET?: string }).BOT_SECRET;
    if (!expected) {
      return Response.json(
        { error: "BOT_SECRET is not set on this Worker." },
        { status: 503 },
      );
    }
    const given = request.headers.get("x-bot-secret") ?? "";
    if (!sameSecret(given, expected)) {
      return Response.json({ error: "Not authorised." }, { status: 401 });
    }

    const payload = (await request.json()) as BotMove;
    const ign = payload.ign?.trim();
    if (!ign) {
      return Response.json({ error: "ign is required" }, { status: 400 });
    }
    if (!payload.action || !ROSTER_MOVE_TYPES.includes(payload.action)) {
      return Response.json({ error: "Invalid action" }, { status: 400 });
    }

    const db = getDb();

    const league = await db.query.leagues.findFirst({
      where: eq(leagues.abbreviation, (payload.league ?? "").trim().toUpperCase()),
    });
    if (!league) {
      return Response.json({ error: `No competition called ${payload.league}.` }, { status: 404 });
    }
    // The bot knows nothing about the off-season, and a tournament borrows
    // its players rather than owning them, so a push at one would move a
    // player's real club. Refused outright rather than half-handled.
    if (league.isTournament) {
      return Response.json(
        { error: `${league.name} is run on the site, not in Discord.` },
        { status: 400 },
      );
    }

    const clubs = await db
      .select({ id: teams.id, name: teams.name, leagueId: teams.leagueId })
      .from(teams)
      .where(eq(teams.leagueId, league.id));

    // A release says which club he is leaving, which is worth checking even
    // though the answer is the same either way: it catches a club name the
    // site does not know before it becomes a silent no-op.
    const club = (payload.team ? clubNamed(payload.team, clubs) : null) ?? null;
    if (payload.team && !club) {
      return Response.json(
        { error: `No ${league.abbreviation} club matching "${payload.team}".` },
        { status: 404 },
      );
    }
    if (payload.action === "SIGN" && !club) {
      return Response.json({ error: "A signing needs a club." }, { status: 400 });
    }

    // Found by name, because the IGN is the only thing the two systems share.
    // Both sides now follow a player's renames on their own - the bot through
    // its nickname listener, this site through `adoptCurrentName` - which is
    // what keeps a join on the name from coming apart.
    const named = await db
      .select()
      .from(players)
      .where(
        sql`lower(${players.minecraftUsername}) = ${ign.toLowerCase()} OR lower(${players.displayName}) = ${ign.toLowerCase()}`,
      );

    // One name can exist twice over, once per competition, because the
    // archive filed a man under whatever each league called him. Take the one
    // already at this club, then the one in this competition, then one
    // belonging to no competition yet.
    let player =
      named.find((row) => club && row.teamId === club.id) ??
      named.find((row) => row.leagueId === league.id) ??
      named.find((row) => row.leagueId === null) ??
      null;

    if (!player) {
      if (payload.action !== "SIGN") {
        return Response.json(
          { error: `${ign} is not on this site, so there is nothing to ${payload.action.toLowerCase()}.` },
          { status: 404 },
        );
      }
      // An MCBA club can sign somebody who has never played here, and there
      // is no pool for him to be in. He joins as a player of this league.
      [player] = await db
        .insert(players)
        .values({
          minecraftUsername: ign,
          displayName: ign,
          leagueId: league.id,
          status: "FREE_AGENT",
        })
        .returning();
    }

    const { teamId, status } = settle(payload.action, player, club);

    await db
      .update(players)
      .set({ teamId, status, ...(club ? { leagueId: club.leagueId } : {}) })
      .where(eq(players.id, player.id));

    const bot = await db.query.users.findFirst({ where: eq(users.discordId, BOT_DISCORD_ID) });
    if (!bot) {
      return Response.json(
        { error: "The bot has no account on this site. Apply drizzle/0103." },
        { status: 503 },
      );
    }

    const [move] = await db
      .insert(rosterMoves)
      .values({
        playerId: player.id,
        teamId,
        moveType: payload.action,
        actingUserId: bot.id,
        note: "From Discord",
      })
      .returning();

    await logAudit({
      actingUserId: bot.id,
      action: `roster.${payload.action.toLowerCase()}`,
      entityType: "player",
      entityId: player.id,
      detail: { moveType: payload.action, teamId, ign, fromBot: true },
    });

    return Response.json({ move, playerId: player.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

/** Where the player ends up. The same four moves `/api/roster-moves` has. */
function settle(
  action: RosterMoveType,
  player: { teamId: number | null },
  club: { id: number } | null,
): { teamId: number | null; status: string } {
  switch (action) {
    case "SIGN":
      return { teamId: club?.id ?? null, status: "ACTIVE" };
    case "RELEASE":
      return { teamId: null, status: "FREE_AGENT" };
    case "SEND_DOWN":
      return { teamId: player.teamId, status: "TRIPLE_A" };
    case "RECALL":
      return { teamId: player.teamId, status: "ACTIVE" };
  }
}

/**
 * Every MBL and MCBA roster as this site holds it, for the bot to compare
 * against its own.
 *
 * A push that never arrives - the site down, a deploy, a network blip - is
 * invisible on both sides and stays wrong forever, so something has to be
 * able to ask the whole question again. This is the half of that the site
 * can answer; the bot does the comparing, because the bot is right.
 */
export async function GET(request: Request) {
  try {
    const expected = (env as unknown as { BOT_SECRET?: string }).BOT_SECRET;
    if (!expected || !sameSecret(request.headers.get("x-bot-secret") ?? "", expected)) {
      return Response.json({ error: "Not authorised." }, { status: 401 });
    }

    const db = getDb();
    const rows = await db
      .select({
        league: leagues.abbreviation,
        club: teams.name,
        ign: players.minecraftUsername,
        status: players.status,
      })
      .from(players)
      .innerJoin(teams, eq(teams.id, players.teamId))
      .innerJoin(leagues, and(eq(leagues.id, teams.leagueId), eq(leagues.isTournament, false)));

    return Response.json({ rosters: rows });
  } catch (error) {
    return apiError(error);
  }
}
