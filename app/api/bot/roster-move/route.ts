import { env } from "cloudflare:workers";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adoptCurrentName } from "@/db/adopt-name";
import { logAudit } from "@/db/audit";
import { lookupAccounts } from "@/db/minecraft";
import { leagues, minecraftProfiles, players, rosterMoves, teams, users, ROSTER_MOVE_TYPES, type RosterMoveType } from "@/db/schema";
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
  // Outside the try so a failure can say who the push was about. The bot
  // writes that answer into a Discord channel for somebody to act on.
  let ign: string | undefined;
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
    ign = payload.ign?.trim();
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
    // The exact spelling first, because `minecraft_username` is unique and so
    // this is one row off an index. Folding both columns with `lower()` means
    // neither index can be used and the whole player pool is walked instead -
    // 1,171 rows every push, which came to 283,382 rows read in a single
    // /sitecheck run. The bot sends the spelling this site already holds
    // almost every time, so almost every push now settles here.
    let named = await db.select().from(players).where(eq(players.minecraftUsername, ign));

    // Only when that finds nobody: the same question asked case-insensitively,
    // which is what keeps a name the two systems capitalise differently from
    // reading as a man this site has never seen.
    if (named.length === 0) {
      named = await db
        .select()
        .from(players)
        .where(
          sql`lower(${players.minecraftUsername}) = ${ign.toLowerCase()} OR lower(${players.displayName}) = ${ign.toLowerCase()}`,
        );
    }

    // One name can exist twice over, once per competition, because the
    // archive filed a man under whatever each league called him. Take the one
    // already at this club, then the one in this competition, then one
    // belonging to no competition yet.
    //
    // And failing all three, take him anyway. `players.league_id` is where he
    // played last, not a wall: the MBL signs out of the MCBA every season, so
    // insisting on a match meant an MCBA man signed to an MBL club was read
    // as somebody this site had never seen, and the signing fell through to
    // the insert below - which `minecraft_username` being unique then
    // refused. Eight of nine signings were lost that way on the first full
    // push, in silence, because a failed push only writes to the debug
    // channel. The update underneath files him in the club's league.
    let player =
      named.find((row) => club && row.teamId === club.id) ??
      named.find((row) => row.leagueId === league.id) ??
      named.find((row) => row.leagueId === null) ??
      named[0] ??
      null;

    // Nobody here by that name, which is exactly what a rename looks like
    // from this side. The bot follows a Discord nickname the same minute it
    // changes, and a verified player's nickname is his IGN, so the bot has
    // the new name immediately. This site only hears about it when somebody
    // happens to load that player's head and the six-hourly skin check
    // notices. Between the two, every push about him misses: a release gets
    // a 404 and the man stays on a roster he has left, and a signing opens a
    // second row beside a career that already exists.
    //
    // The account is the one thing the two spellings share, so ask Mojang
    // who holds the name and let the ordinary rename path move him. It is
    // the same call the skin refresh makes and it refuses a merge on the
    // same terms, which is the behaviour wanted here too: a name that
    // already belongs to somebody else leaves him where he is rather than
    // welding two careers together.
    // Held outside the block below because a signing that turns out to be a
    // brand new player wants the same answer: the account was already asked
    // for here, and throwing it away left every new man on the site with no
    // head and no account on file.
    let account: { uuid: string; name: string } | undefined;

    if (!player) {
      const { found } = await lookupAccounts([ign]);
      account = found.get(ign.toLowerCase());
      if (account && (await adoptCurrentName(account.uuid, account.name)) === "renamed") {
        [player] = await db
          .select()
          .from(players)
          .where(eq(players.minecraftUsername, account.name));
      }
    }

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

    // Every push is another chance to put an account on file, not only the one
    // that creates the player.
    //
    // The lookup above happens once, at the moment a row is created, and if it
    // comes back empty - the relay busy, Mojang refusing, a timeout - the
    // player is created anyway, because a signing must not fail over a head.
    // Nothing ever asked again. `/api/head/[uuid]` is what keeps an account
    // current and notices a rename, and it is keyed by the uuid, so a player
    // with no row has no way back into the one mechanism that would fix him:
    // he stays a grey square until somebody writes a migration. That is how
    // PhantomKirk ended up needing one, and he was not special - any signing
    // whose single lookup happened to miss would have.
    //
    // Asking here costs one request to a relay, and only for a player who has
    // no account on file at all, which after the first push about him is
    // nobody.
    const [onFile] = await db
      .select({ name: minecraftProfiles.playerName })
      .from(minecraftProfiles)
      .where(eq(minecraftProfiles.playerName, player.displayName));

    if (!onFile) {
      const name = player.displayName;
      const resolved = account ?? (await lookupAccounts([name])).found.get(name.toLowerCase());
      if (resolved) {
        // The account may already be on file under the name he went by
        // before, which is a rename that split him in two. `adoptCurrentName`
        // merges that rather than refusing it now, and the row it keeps is
        // whichever one holds his career - which can be a different row from
        // the one resolved above, so he is read again before his id is used
        // for the move below.
        if ((await adoptCurrentName(resolved.uuid, name)) === "renamed") {
          [player] = await db.select().from(players).where(eq(players.displayName, name));
        } else {
          await db
            .insert(minecraftProfiles)
            .values({
              playerName: name,
              uuid: resolved.uuid,
              currentName: resolved.name,
              source: "mojang",
            })
            // A name already on file is left exactly as it is. This is the one
            // place a wrong answer would be hard to spot, so it never
            // overwrites.
            .onConflictDoNothing();
        }
      }
    }

    // Only reachable if the merge above kept a row under a name this push did
    // not ask about, which would mean the account disagrees with itself.
    if (!player) {
      return Response.json(
        { error: `${ign} could not be resolved on this site. Nothing was changed.` },
        { status: 409 },
      );
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
    // Named, because the bot writes this answer straight into a Discord
    // channel where somebody has to act on it. "That already exists" about an
    // unnamed row told whoever read it nothing at all.
    return apiError(
      error,
      `Could not record that move for ${ign ?? "that player"}: this site already holds a row that collides with it. Nothing was changed.`,
    );
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
    // The IL keeps a man on his club; he simply cannot be picked. `/deactivate`
    // and `/activate` in the bot are the two ends of it.
    case "INJURE":
      return { teamId: player.teamId, status: "INJURED" };
    case "ACTIVATE":
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
    // Told apart on purpose: "not set here" and "does not match" are
    // different jobs to go and do, and the bot prints whichever it gets.
    const expected = (env as unknown as { BOT_SECRET?: string }).BOT_SECRET;
    if (!expected) {
      return Response.json({ error: "BOT_SECRET is not set on this Worker." }, { status: 503 });
    }
    if (!sameSecret(request.headers.get("x-bot-secret") ?? "", expected)) {
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
