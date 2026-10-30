import { and, eq, ne, or, sql } from "drizzle-orm";
import { getDb } from "./index";
import {
  fieldingChanges,
  historicalGameStats,
  historicalPlayerStats,
  historicalRosterEntries,
  minecraftProfiles,
  plateAppearances,
  players,
  rosterMoves,
  rosterSpots,
  scorecardBench,
  scorecardLines,
  scorecardLineups,
  runnerOuts,
} from "./schema";

/**
 * Moves a player to the name their Minecraft account now carries.
 *
 * The league's rule is that a player appears under the name they go by today,
 * everywhere, however old the season. The archive is keyed by name rather than
 * by id, so honouring that means rewriting the string in every table that
 * holds it - otherwise a rename splits a career in two, the old seasons under
 * one name and the recent games under another, and the half that no longer
 * matches a profile row loses its head as well.
 *
 * This is the automatic half of /api/players/rename. That route is an admin
 * typing a name; this one is the six-hourly skin refresh noticing that Mojang
 * reports a different name than the site has, which is how a rename reaches
 * the site with nobody doing anything.
 *
 * **An empty duplicate under the new name is absorbed rather than refused.**
 * This used to refuse any name already present, on the grounds that joining
 * two sets of rows is irreversible. That was right about the danger and wrong
 * about the common case. A player who renames and is then signed under the new
 * name gets a second, empty `players` row from the roster bot, and refusing
 * left him as two people: the career and the account under the old name, the
 * club under the new one, and a grey square where his head should be. It
 * happened twice in one week and both took a hand-written migration, which is
 * the thing this function exists to avoid.
 *
 * So the rule is narrower than "refuse anything taken". A shell is absorbed -
 * no archive line, no game, no other account - because joining nothing to
 * something cannot lose anybody's record. Anything with substance under that
 * name is still refused, and that refusal is what matters: Minecraft names get
 * recycled, so a career filed under the name our account happens to hold today
 * may belong to whoever held it before, and welding a stranger's seasons onto
 * this player is exactly the damage no later edit could undo.
 */

/** The archive tables that key a player by name. */
const NAMED = [
  { table: historicalPlayerStats, column: historicalPlayerStats.playerName },
  { table: historicalGameStats, column: historicalGameStats.playerName },
  { table: historicalRosterEntries, column: historicalRosterEntries.playerName },
] as const;

/**
 * Whether a live player row has anything behind it.
 *
 * Only a row with nothing behind it is safe to absorb. A row that has batted
 * is somebody, whatever the name says, and its scorecard rows cannot be moved
 * without rewriting a published box score.
 */
async function hasPlayed(playerId: number): Promise<boolean> {
  const db = getDb();
  const one = { one: sql`1` };
  const played = await Promise.all([
    db.select(one).from(scorecardLines).where(eq(scorecardLines.playerId, playerId)).limit(1),
    db.select(one).from(scorecardLineups).where(eq(scorecardLineups.playerId, playerId)).limit(1),
    db.select(one).from(scorecardBench).where(eq(scorecardBench.playerId, playerId)).limit(1),
    db.select(one).from(fieldingChanges).where(eq(fieldingChanges.playerId, playerId)).limit(1),
    db.select(one).from(runnerOuts).where(eq(runnerOuts.runnerPlayerId, playerId)).limit(1),
    db
      .select(one)
      .from(plateAppearances)
      .where(
        or(
          eq(plateAppearances.batterPlayerId, playerId),
          eq(plateAppearances.pitcherPlayerId, playerId),
        ),
      )
      .limit(1),
  ]);
  return played.some((rows) => rows.length > 0);
}

export type AdoptResult = "renamed" | "taken" | "nothing";

export async function adoptCurrentName(uuid: string, to: string): Promise<AdoptResult> {
  // A Minecraft name is 3-16 of letters, digits and underscore. Anything else
  // did not come from Mojang and has no business being written to five tables.
  if (!/^\w{3,16}$/.test(to)) return "nothing";

  const db = getDb();
  const [profile] = await db
    .select()
    .from(minecraftProfiles)
    .where(eq(minecraftProfiles.uuid, uuid));
  if (!profile || profile.playerName === to) return "nothing";

  const from = profile.playerName;

  // Taken by another account's profile row.
  const [otherProfile] = await db
    .select({ name: minecraftProfiles.playerName })
    .from(minecraftProfiles)
    .where(and(eq(minecraftProfiles.playerName, to), ne(minecraftProfiles.uuid, uuid)));
  if (otherProfile) return "taken";

  // Taken in the archive. A name there carries no account, so there is no way
  // to tell whether those rows are this player's earlier seasons or somebody
  // else's whole career - and the second is the one that must not be merged.
  // Checked before the live row below, because a live row is only absorbed
  // once this has established the name carries no record.
  for (const { table, column } of NAMED) {
    const [held] = await db.select({ name: column }).from(table).where(eq(column, to)).limit(1);
    if (held) return "taken";
  }

  // Taken on the live roster by somebody who is not this player. The username
  // column is unique, so the rename below would throw rather than merge.
  const [otherPlayer] = await db
    .select({ id: players.id, displayName: players.displayName, teamId: players.teamId, status: players.status, leagueId: players.leagueId })
    .from(players)
    .where(or(eq(players.displayName, to), eq(players.minecraftUsername, to)));

  if (otherPlayer && otherPlayer.displayName !== from) {
    if (await hasPlayed(otherPlayer.id)) return "taken";

    // A shell, so it is this player signed again under the new name. The club
    // comes across because the bot is what the league believes about rosters
    // and that row is the newer of the two; everything else about him is on
    // the row that holds his career, which is the one that survives.
    const [mine] = await db.select({ id: players.id }).from(players).where(eq(players.displayName, from));
    if (!mine) return "taken";

    await db
      .update(players)
      .set({ teamId: otherPlayer.teamId, status: otherPlayer.status, leagueId: otherPlayer.leagueId })
      .where(eq(players.id, mine.id));
    // His own moves, so they follow him rather than going with the row.
    await db.update(rosterMoves).set({ playerId: mine.id }).where(eq(rosterMoves.playerId, otherPlayer.id));
    // A tournament place is one row per player per club, so the same place
    // held twice would collide - and he cannot already hold his own.
    await db.delete(rosterSpots).where(eq(rosterSpots.playerId, otherPlayer.id));
    await db.delete(players).where(eq(players.id, otherPlayer.id));
  }

  // The same account already on file under the new name as well. One account
  // may legitimately hold two names, but not when one of them is about to
  // become the other - the update below is on the primary key and would
  // collide. This is the profile merge: the old row wins, because it is the
  // one `uuid` was looked up by.
  await db
    .delete(minecraftProfiles)
    .where(and(eq(minecraftProfiles.playerName, to), eq(minecraftProfiles.uuid, uuid)));

  for (const { table, column } of NAMED) {
    await db.update(table).set({ playerName: to }).where(eq(column, from));
  }
  // The Minecraft username travels with the display name; they are the same
  // string for every player in this league.
  await db
    .update(players)
    .set({ displayName: to, minecraftUsername: to })
    .where(eq(players.displayName, from));
  // Only the row being renamed, not every row holding this account.
  //
  // One account legitimately holds two site names - each competition filed a
  // man under whatever he used there, which is what `getAccountNames` joins a
  // split career on - and `where uuid` matches both. That set them both to the
  // same string, and `player_name` is the primary key, so the statement threw
  // instead of renaming anybody. Nine accounts on this site are on file under
  // two names, and every one of them was a push waiting to fail with a
  // "UNIQUE constraint" the caller could only report as "That already exists".
  await db
    .update(minecraftProfiles)
    .set({ playerName: to, currentName: to })
    .where(and(eq(minecraftProfiles.uuid, uuid), eq(minecraftProfiles.playerName, from)));

  return "renamed";
}
